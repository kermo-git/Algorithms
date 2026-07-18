import { WG_DIM } from '@/WebGPU/Engine'
import type { Mat4x4 } from '@/WebGPU/Geometry'
import {
    rotate3DShader,
    octaveNoiseShader,
    unitVector2DShader,
    unitVector3DShader,
} from '@/Noise/ShaderUtils'
import type { NoiseAlgorithm } from '@/Noise/Types'
import { Value2D, Value3D } from '@/Noise/Algorithms/Value'
import { Perlin2D, Perlin3D } from '@/Noise/Algorithms/Perlin'
import { Simplex2D, Simplex3D } from '@/Noise/Algorithms/Simplex'
import { SimplexValue2D, SimplexValue3D } from '@/Noise/Algorithms/SimplexValue'
import { Cubic2D, Cubic3D } from '@/Noise/Algorithms/Cubic'
import { Worley2D, Worley3D } from '@/Noise/Algorithms/Worley'
import { WorleyF22D, WorleyF23D } from '@/Noise/Algorithms/WorleyF2'
import { allFunctions } from '@/Noise/Algorithms/Common'

export function vertexIndexShader(setup: Setup): string {
    return /* wgsl */ `
        @group(0) @binding(0) var<storage, read_write> vertex_index: array<u32>;

        const terrain_dims = vec2u(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) pos: vec3u
        ) {
            if (pos.x >= terrain_dims.x - 1 || pos.y >= terrain_dims.y - 1) {
                return;
            }

            let A = pos.y * terrain_dims.x + pos.x;
            // pos.x = A - pos.y * terrain_dims.x
            // pos.y = (A - pos.x) / terrain_dims.x
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

function noiseFunctionShader(group: number) {
    function createNoiseFunctions(
        algorithm: NoiseAlgorithm,
        name: string,
        extraBufferName?: string,
    ) {
        return `
            ${algorithm.createShader({
                name,
                extraBufferName,
            })}

            ${octaveNoiseShader({
                func_name: `${name}_octaves`,
                noise_name: name,
                pos_type: algorithm.pos_type,
            })}
        `
    }

    return /* wgsl */ `
        @group(${group}) @binding(0) var<storage> unit_vectors_2D: array<vec2f>;
        @group(${group}) @binding(1) var<storage> unit_vectors_3D: array<vec3f>;

        ${unitVector2DShader}
        ${unitVector3DShader}
        ${rotate3DShader}
        ${allFunctions}

        ${createNoiseFunctions(Value2D, 'value_2d')}
        ${createNoiseFunctions(Value3D, 'value_3d')}

        ${createNoiseFunctions(Cubic2D, 'cubic_2d')}
        ${createNoiseFunctions(Cubic3D, 'cubic_3d')}

        ${createNoiseFunctions(new Perlin2D(), 'perlin_2d', 'unit_vectors_2D')}
        ${createNoiseFunctions(new Perlin3D(), 'perlin_3d', 'unit_vectors_3D')}

        ${createNoiseFunctions(new Perlin2D(true), 'quadratic_2d', 'unit_vectors_2D')}
        ${createNoiseFunctions(new Perlin3D(true), 'quadratic_3d', 'unit_vectors_3D')}

        ${createNoiseFunctions(Simplex2D, 'simplex_2d', 'unit_vectors_2D')}
        ${createNoiseFunctions(Simplex3D, 'simplex_3d', 'unit_vectors_3D')}

        ${createNoiseFunctions(SimplexValue2D, 'simplex_value_2d')}
        ${createNoiseFunctions(SimplexValue3D, 'simplex_value_3d')}

        ${createNoiseFunctions(Worley2D, 'worley_2d')}
        ${createNoiseFunctions(Worley3D, 'worley_3d')}

        ${createNoiseFunctions(WorleyF22D, 'worley_f2_2d')}
        ${createNoiseFunctions(WorleyF23D, 'worley_f2_3d')}
    `
}

export interface Setup {
    noise_shader: string
    color_shader: string
    terrain_dims: number[]
    grid_dims: number[]
    light_dir: number[]
    ambient_intensity: number
    camera_pos: number[]
    camera_projection_view: Mat4x4
    render_3D: boolean
}

const terrainStruct = /* wgsl */ `
    struct TerrainUnit {
        gradient: vec2f, velocity: vec2f,
        water_outflow_flux: vec4f,
        surface_pos: vec3f, water: f32,
        color: vec3f, sediment: f32,
    };
`

const lightStruct = /* wgsl */ `
    struct Light {
        dir: vec3f,
        ambient_intensity: f32,
    };
`

const cameraStruct = /* wgsl */ `
    struct Camera {
        pos: vec3f,
        projection_view: mat4x4f,
    };
`

export function noiseShader(setup: Setup): string {
    return /* wgsl */ `
        ${noiseFunctionShader(0)}

        ${terrainStruct}

        @group(1) @binding(0) var<storage, read> read_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> write_terrain: array<TerrainUnit>;

        ${setup.noise_shader}

        const terrain_dims = vec2u(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        const grid_dims = vec2f(${setup.grid_dims[0]}, ${setup.grid_dims[1]});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= terrain_dims.x || pixel_pos.y >= terrain_dims.y) {
                return;
            }
            let noise_pos = grid_dims * vec2f(pixel_pos) / vec2f(terrain_dims - 1);
            let pixel_index = pixel_pos.y * terrain_dims.x + pixel_pos.x;

            write_terrain[pixel_index].surface_pos = vec3f(
                noise_pos.x, elevation(noise_pos), -noise_pos.y
            );
        }
    `
}

export function colorShader(setup: Setup): string {
    return /* wgsl */ `
        ${noiseFunctionShader(0)}
        
        ${terrainStruct}

        @group(1) @binding(0) var<storage, read> read_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> write_terrain: array<TerrainUnit>;

        ${setup.color_shader}

        const terrain_dims = vec2u(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        const grid_dims = vec2f(${setup.grid_dims[0]}, ${setup.grid_dims[1]});

        fn find_index(pos: vec2u) -> u32 {
            return pos.y * terrain_dims.x + pos.x;
        }

        fn find_gradient(pixel_pos: vec2u) -> vec2f {
            let pixel_index = find_index(pixel_pos);
            let current = read_terrain[pixel_index].surface_pos.y;
            let pixel_size = grid_dims.x / f32(terrain_dims.x);

            var gradient = vec2f(0);
            var before = vec2f(current);
            var after = vec2f(current);
            var delta_input = vec2f(pixel_size);

            let not_max_edge = pixel_pos < (terrain_dims - 1);
            let not_min_edge = pixel_pos > vec2u(0);

            if not_min_edge.x {
                before.x = read_terrain[pixel_index - 1].surface_pos.y;
            }
            if not_max_edge.x {
                after.x = read_terrain[pixel_index + 1].surface_pos.y;
            }
            if not_min_edge.x && not_max_edge.x {
                delta_input.x = 2 * pixel_size;
            }

            if not_min_edge.y {
                before.y = read_terrain[
                    pixel_index - terrain_dims.x
                ].surface_pos.y;
            }
            if not_max_edge.y {
                after.y = read_terrain[
                    pixel_index + terrain_dims.x
                ].surface_pos.y;
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

            let noise_pos = grid_dims * vec2f(pixel_pos) / vec2f(terrain_dims - 1);
            let pixel_index = find_index(pixel_pos);
            let surface_pos = read_terrain[pixel_index].surface_pos;
            let gradient = find_gradient(pixel_pos);
            let terrain_color = color(surface_pos, gradient);

            write_terrain[pixel_index].surface_pos = surface_pos;
            write_terrain[pixel_index].gradient = gradient;

            write_terrain[pixel_index].water = read_terrain[pixel_index].water;
            write_terrain[pixel_index].sediment = read_terrain[pixel_index].sediment;
            write_terrain[pixel_index].velocity = read_terrain[pixel_index].velocity;

            write_terrain[pixel_index].water_outflow_flux = read_terrain[pixel_index].water_outflow_flux;
            write_terrain[pixel_index].color = terrain_color;
        }
    `
}

export function display2DShader(setup: Setup, canvas_color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        ${terrainStruct}
        ${lightStruct}

        @group(0) @binding(0) var canvas: texture_storage_2d<${canvas_color_format}, write>;

        @group(1) @binding(0) var<storage, read> read_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> write_terrain: array<TerrainUnit>;

        @group(2) @binding(0) var<uniform> light: Light;

        const terrain_dims = vec2u(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= terrain_dims.x || pixel_pos.y >= terrain_dims.y) {
                return;
            }

            let pixel_index = pixel_pos.y * terrain_dims.x + pixel_pos.x;
            let pixel = read_terrain[pixel_index];

            let a = light.ambient_intensity;

            let normal = normalize(vec3f(-pixel.gradient.x, 1, -pixel.gradient.y));
            let light_level = dot(normal, light.dir);
            let color = a * pixel.color + (1 - a) * pixel.color * light_level;

            textureStore(canvas, pixel_pos, vec4f(color, 1));
        }
    `
}

export function display3DShader(setup: Setup, canvas_color_format: GPUTextureFormat): string {
    // TODO
    return /* wgsl */ `
        ${terrainStruct}
        ${lightStruct}
        ${cameraStruct}

        @group(0) @binding(0) var<storage, read> terrain: array<TerrainUnit>;
        @group(1) @binding(0) var<uniform> light: Light;
        @group(1) @binding(1) var<uniform> camera: Camera;

        const terrain_dims = vec2u(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        const grid_dims = vec2f(${setup.grid_dims[0]}, ${setup.grid_dims[1]});

        struct FragmentInput {
            @builtin(position) screen_pos: vec4f,
            @location(0) color: vec3f,
        }

        @vertex
        fn vertex_main(
            @builtin(vertex_index) index: u32
        ) -> FragmentInput {
            let terrain_data = terrain[index];

            let gradient = terrain_data.gradient;
            let normal = normalize(vec3f(-gradient.x, 1, -gradient.y));
            let light_level = dot(normal, light.dir);
            let a = light.ambient_intensity;

            var output: FragmentInput;
            output.screen_pos = camera.projection_view * vec4f(terrain_data.surface_pos, 1);
            output.color = a * terrain_data.color + (1 - a) * terrain_data.color * light_level;

            return output;
        }

        @fragment
        fn fragment_main(@location(0) color: vec3f) -> @location(0) vec4f {
            return vec4f(color, 1);
        }
    `
}

function rayMarchingShader(box_dims: number[], canvas_color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        @group(0) @binding(0) var canvas: texture_storage_2d<${canvas_color_format}, write>;
        @group(1) @binding(0) var<uniform> light: Light;
        @group(1) @binding(1) var<uniform> camera: Camera;

        const STEP_SCALE = 1;
        const HIT_THRESHOLD = 0.005;

        const CAMERA_FOV = radians(70);
        const IMAGE_WIDTH = 2 * tan(CAMERA_FOV / 2);
        
        const box_dims = vec3f(${box_dims[0]}, ${box_dims[1]}, ${box_dims[2]});

        fn find_box_distance(ray_origin: vec3f, ray_direction: vec3f) -> f32 {
            let t1 = -ray_origin / ray_direction;
            let t2 = (box_dims - ray_origin) / ray_direction;

            let t_min = min(t1, t2);
            let t_max = max(t1, t2);

            if !(t_max.x < t_min.y || t_max.y < t_min.x) {
                if !(t_max.x < t_min.z || t_max.z < t_min.x || t_max.y < t_min.z || t_max.z < t_min.y) {
                    let outside_dist = max(t_min.z, max(t_min.x, t_min.y));

                    if (outside_dist >= 0) {
                        return outside_dist;
                    } else {
                        let inside_dist = min(t_max.z, min(t_max.x, t_max.y));

                        if (inside_dist >= 0) {
                            return inside_dist;
                        }
                    }
                }
            }
            return -1;
        }

        fn find_distance(pos: vec3f) -> f32 {
            // TODO
            return 0;
        };

        struct Surface {
            normal: vec3f;
            color: vec3f;
        }

        fn get_surface_data(pos: vec3f) -> Surface {
            var result: Surface;
            // TODO
            return result;
        }
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let canvas_dims = textureDimensions(canvas);
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= canvas_dims.x || pixel_pos.y < 0) {
                return;
            }

            let canvas_dims_f = vec2f(canvas_dims);

            let image_height = IMAGE_WIDTH * canvas_dims_f.y / canvas_dims_f.x;
            let image_dims = vec2f(IMAGE_WIDTH, image_height);

            let norm_pixel_pos = vec2f(pixel_pos) / canvas_dims_f;
            let image_pos = image_dims * (norm_pixel_pos - 0.5);
            let camera_ray = camera.rotation * normalize(vec3f(image_pos.x, 1, image_pos.y));

            var current_distance = find_box_distance(camera.pos, camera_ray) + HIT_THRESHOLD;
            
            if current_distance > 0 {
                var current_pos = camera.pos + current_distance * camera_ray;
                let a = light.ambient_intensity;

                const MAX_STEPS = 1000;
                for (var s = 0; s < MAX_STEPS; s++) {
                    let world_distance = find_distance(current_pos);
                    current_distance += STEP_SCALE * world_distance;
                    current_pos = camera.pos + current_distance * camera_ray;

                    if world_distance < HIT_THRESHOLD {
                        let surface = get_surface_data(current_pos);
                        let light_level = dot(surface.normal, light.dir);
                        let color = a * surface.color + (1 - a) * surface.color * light_level;
                        textureStore(canvas, gid.xy, color);
                        break;
                    } else if (
                        any(current_pos <= vec3f(0)) || 
                        any(current_pos >= box_dims)
                    ) {
                        textureStore(canvas, gid.xy, vec4f(0, 0, 0, 1));
                        break;
                    }
                }
            } else {
                textureStore(canvas, gid.xy, vec4f(0, 0, 0, 1));
            }
        }
    `
}
