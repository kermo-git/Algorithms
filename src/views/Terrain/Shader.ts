import {
    ComputeShader,
    PingPongBuffers,
    readView,
    RenderShader,
    ShaderModule,
    StorageBuffer,
    Uniform,
    writeView
} from '@/WebGPU/ShaderModuleSystem/Modules'
import { WG_DIM } from '@/WebGPU/ShaderModuleSystem/WebGPUScene'
import {
    perspectiveProjection,
    Vec2,
    Vec3,
    type Mat4x4
} from '@/WebGPU/Geometry'

import { FBMNoiseModule } from '@/Noise/Modules'
import { Value2D, Value3D } from '@/Noise/Algorithms/Value'
import { Perlin2D, Perlin3D } from '@/Noise/Algorithms/Perlin'
import { Simplex2D, Simplex3D } from '@/Noise/Algorithms/Simplex'
import { Worley2D, Worley3D } from '@/Noise/Algorithms/Worley'
import { WorleyEdge2D, WorleyEdge3D } from '@/Noise/Algorithms/WorleyEdge'
import { importFn } from '@/Noise/HelperFunctions'

export interface Setup {
    noise_shader: string
    color_shader: string
    terrain_dims: Vec2
    grid_dims: Vec2
    light_dir: Vec3
    ambient_light_intensity: number
    camera_view_matrix: Mat4x4
    render_3D: boolean
}

function VertexIndexBuffer(terrain_dims: Vec2): StorageBuffer {
    const n_vertices = 6 * (terrain_dims.x - 1) * (terrain_dims.y - 1)
    return {
        kind: 'StorageBuffer',
        name: 'vertex_index',
        dataType: 'array<u32>',
        byteLength: 4 * n_vertices
    }
}

function TerrainBuffer(name: string, terrain_dims: Vec2): StorageBuffer {
    const n_bytes = 64 * terrain_dims.x * terrain_dims.y
    return {
        kind: 'StorageBuffer',
        name: name,
        dataType: 'array<TerrainPixel>',
        dataTypeCode: /* wgsl */ `
            struct TerrainPixel {
                gradient: vec2f, velocity: vec2f,
                water_outflow_flux: vec4f,
                pos: vec2f, elevation: f32, water: f32,
                color: vec3f, sediment: f32,
            };
        `,
        byteLength: n_bytes
    }
}

function TerrainPingPong(terrain_dims: Vec2): PingPongBuffers {
    return {
        kind: 'PingPongBuffers',
        readName: 'read_terrain',
        writeName: 'write_terrain',
        buffer_A: TerrainBuffer('terrain_A', terrain_dims),
        buffer_B: TerrainBuffer('terrain_B', terrain_dims)
    }
}

function RenderSetup(setup: Setup, aspect_ratio: number = 1): Uniform {
    const projection = createProjection(aspect_ratio)
    const projection_view = projection.matmul(setup.camera_view_matrix)

    const data = new Float32Array([
        setup.light_dir.x,
        setup.light_dir.y,
        setup.light_dir.z,
        setup.ambient_light_intensity,
        ...projection_view.toWebGPU()
    ]).buffer

    return {
        kind: 'Uniform',
        name: 'render_setup',
        dataType: 'RenderSetup',
        dataTypeCode: /* wgsl */ `
        struct RenderSetup {
            light_direction: vec3f,
            ambient_light_intensity: f32,
            camera_projection_view: mat4x4f,
        };
        `,
        data: data
    }
}

export function VertexIndexShader(terrain_dims: Vec2): ComputeShader {
    return {
        kind: 'ComputeShader',
        name: 'vertex_index',
        resources: [writeView(VertexIndexBuffer(terrain_dims))],
        code: /* wgsl */ `
            const terrain_dims = vec2u(${terrain_dims.x}, ${terrain_dims.y});
            
            @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
            fn main(
                @builtin(global_invocation_id) pos: vec3u
            ) {
                if (pos.x >= terrain_dims.x - 1 || pos.y >= terrain_dims.y - 1) {
                    return;
                }

                let A = pos.y * terrain_dims.x + pos.x;
                let B = pos.y * terrain_dims.x + pos.x + 1;
                let C = (pos.y + 1) * terrain_dims.x + pos.x;
                let D = (pos.y + 1) * terrain_dims.x + pos.x + 1;

                let offset = 6 * (pos.y * (terrain_dims.x - 1) + pos.x);

                vertex_index[offset + 0] = A;
                vertex_index[offset + 1] = B;
                vertex_index[offset + 2] = C;

                vertex_index[offset + 3] = B;
                vertex_index[offset + 4] = C;
                vertex_index[offset + 5] = D;
            }
        `
    }
}

function NoiseModule(): ShaderModule[] {
    return [
        Perlin2D(),
        Perlin3D(),
        Simplex2D('Gradient'),
        Simplex2D('Value'),
        Simplex3D('Gradient'),
        Simplex3D('Value'),
        Value2D(),
        Value3D(),
        Worley2D('Euclidean'),
        Worley2D('Manhattan'),
        Worley2D('Chebyshev'),
        Worley3D('Euclidean'),
        Worley3D('Manhattan'),
        Worley3D('Chebyshev'),
        WorleyEdge2D(),
        WorleyEdge3D()
    ]
        .map(FBMNoiseModule)
        .concat([importFn('unit_vector_2d'), importFn('unit_vector_3d')])
}

export function NoiseShader(
    terrain_dims: Vec2,
    grid_dims: Vec2,
    noise_function: string
): ComputeShader {
    return {
        kind: 'ComputeShader',
        name: 'noise',
        resources: [TerrainPingPong(terrain_dims)],
        imports: NoiseModule(),
        code: /* wgsl */ `
            const terrain_dims = vec2u(${terrain_dims.x}, ${terrain_dims.y});
            const grid_dims = vec2f(${grid_dims.x}, ${grid_dims.y});

            ${noise_function}
            
            @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
            fn main(
                @builtin(global_invocation_id) gid: vec3u
            ) {
                let pixel_pos = gid.xy;

                if (pixel_pos.x >= terrain_dims.x || pixel_pos.y >= terrain_dims.y) {
                    return;
                }
                let terrain_pos = grid_dims * vec2f(pixel_pos) / vec2f(terrain_dims - 1);
                let pixel_index = pixel_pos.y * terrain_dims.x + pixel_pos.x;

                write_terrain[pixel_index].pos = terrain_pos;
                write_terrain[pixel_index].elevation = elevation(terrain_pos);
            }
        `
    }
}

export function ColorShader(
    terrain_dims: Vec2,
    grid_dims: Vec2,
    color_function: string
): ComputeShader {
    return {
        kind: 'ComputeShader',
        name: 'color',
        resources: [TerrainPingPong(terrain_dims)],
        imports: NoiseModule(),
        code: /* wgsl */ `
            ${color_function}

            const terrain_dims = vec2u(${terrain_dims.x}, ${terrain_dims.y});
            const grid_dims = vec2f(${grid_dims.x}, ${grid_dims.y});

            fn find_index(pos: vec2u) -> u32 {
                return pos.y * terrain_dims.x + pos.x;
            }

            fn find_gradient(pixel_pos: vec2u) -> vec2f {
                let pixel_index = find_index(pixel_pos);
                let current = read_terrain[pixel_index].elevation;
                let pixel_size = grid_dims.x / f32(terrain_dims.x);

                var gradient = vec2f(0);
                var before = vec2f(current);
                var after = vec2f(current);
                var delta_input = vec2f(pixel_size);

                let not_max_edge = pixel_pos < (terrain_dims - 1);
                let not_min_edge = pixel_pos > vec2u(0);

                if not_min_edge.x {
                    before.x = read_terrain[pixel_index - 1].elevation;
                }
                if not_max_edge.x {
                    after.x = read_terrain[pixel_index + 1].elevation;
                }
                if not_min_edge.x && not_max_edge.x {
                    delta_input.x = 2 * pixel_size;
                }

                if not_min_edge.y {
                    before.y = read_terrain[
                        pixel_index - terrain_dims.x
                    ].elevation;
                }
                if not_max_edge.y {
                    after.y = read_terrain[
                        pixel_index + terrain_dims.x
                    ].elevation;
                }
                if not_min_edge.y && not_max_edge.y {
                    delta_input.y = 2 * pixel_size;
                }

                return (after - before) / delta_input;
            }
            
            @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
            fn main(
                @builtin(global_invocation_id) gid: vec3u
            ) {
                let pixel_pos = gid.xy;

                if (pixel_pos.x >= terrain_dims.x || pixel_pos.y >= terrain_dims.y) {
                    return;
                }

                let pixel_index = find_index(pixel_pos);
                let pos = read_terrain[pixel_index].pos;
                let elevation = read_terrain[pixel_index].elevation;
                let gradient = find_gradient(pixel_pos);
                let terrain_color = color(pos, elevation, gradient);

                write_terrain[pixel_index].pos = pos;
                write_terrain[pixel_index].elevation = elevation;
                write_terrain[pixel_index].gradient = gradient;

                write_terrain[pixel_index].water = read_terrain[pixel_index].water;
                write_terrain[pixel_index].sediment = read_terrain[pixel_index].sediment;
                write_terrain[pixel_index].velocity = read_terrain[pixel_index].velocity;

                write_terrain[pixel_index].water_outflow_flux = read_terrain[pixel_index].water_outflow_flux;
                write_terrain[pixel_index].color = terrain_color;
            }
        `
    }
}

export function Display2DShader(
    setup: Setup,
    aspect_ratio: number
): ComputeShader {
    const terrain_dims = setup.terrain_dims

    return {
        kind: 'ComputeShader',
        name: 'display_2D',
        resources: [
            TerrainPingPong(terrain_dims),
            RenderSetup(setup, aspect_ratio)
        ],
        canvas: 'canvas',
        code: /* wgsl */ `
            const terrain_dims = vec2u(${terrain_dims.x}, ${terrain_dims.y});
            const terrain_width_f = f32(${terrain_dims.x});
            
            @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
            fn main(
                @builtin(global_invocation_id) gid: vec3u
            ) {
                let canvas_pos = gid.xy;
                let canvas_dims = textureDimensions(canvas);

                if (canvas_pos.x >= canvas_dims.x || canvas_pos.y >= canvas_dims.y) {
                    return;
                }
                let canvas_pos_f = vec2f(canvas_pos);
                let canvas_width_f = f32(canvas_dims.x);

                let terrain_pos_x = terrain_width_f * canvas_pos_f.x / canvas_width_f;
                let terrain_pos_y = terrain_width_f * canvas_pos_f.y / canvas_width_f;
                let terrain_pos = vec2u(vec2f(terrain_pos_x, terrain_pos_y));

                if (terrain_pos.y >= terrain_dims.y) {
                    return;
                }

                let terrain_index = terrain_pos.y * terrain_dims.x + terrain_pos.x;
                let pixel = read_terrain[terrain_index];

                let a = render_setup.ambient_light_intensity;

                let gradient = pixel.gradient;
                let normal = normalize(vec3f(-gradient.x, 1, -gradient.y));
                let light_level = dot(normal, render_setup.light_direction);
                let color = a * pixel.color + (1 - a) * pixel.color * light_level;

                textureStore(canvas, canvas_pos, vec4f(color, 1));
            }
        `
    }
}

export function createProjection(aspect_ratio: number) {
    return perspectiveProjection(60, aspect_ratio, 0.1, 1000)
}

export function Display3DShader(
    setup: Setup,
    aspect_ratio: number
): RenderShader {
    const terrain_dims = setup.terrain_dims

    return {
        kind: 'RenderShader',
        name: 'display_3D',
        vertexShader: {
            name: 'display_3D_vertex',
            resources: [
                readView(TerrainBuffer('terrain_A', terrain_dims)),
                RenderSetup(setup, aspect_ratio)
            ],
            code: /* wgsl */ `
                const terrain_dims = vec2u(${terrain_dims.x}, ${terrain_dims.y});
                const grid_dims = vec2f(${setup.grid_dims.x}, ${setup.grid_dims.y});

                struct FragmentInput {
                    @builtin(position) screen_pos: vec4f,
                    @location(0) color: vec3f,
                }

                @vertex
                fn vertex_main(
                    @builtin(vertex_index) index: u32
                ) -> FragmentInput {
                    let pixel = terrain_A[index];

                    let gradient = pixel.gradient;
                    let normal = normalize(vec3f(-gradient.x, 1, -gradient.y));
                    let light_level = dot(normal, render_setup.light_direction);
                    let a = render_setup.ambient_light_intensity;

                    var output: FragmentInput;
                    let world_pos = vec4f(pixel.pos.x, pixel.elevation, -pixel.pos.y, 1);
                    output.screen_pos = render_setup.camera_projection_view * world_pos;
                    output.color = a * pixel.color + (1 - a) * pixel.color * light_level;

                    return output;
                }
            `
        },
        fragmentShader: {
            name: 'display_3D_fragment',
            code: /* wgsl */ `
                @fragment
                fn fragment_main(@location(0) color: vec3f) -> @location(0) vec4f {
                    return vec4f(color, 1);
                }
            `
        },
        primitiveTopology: 'triangle-list',
        indexBuffer: VertexIndexBuffer(terrain_dims)
    }
}
