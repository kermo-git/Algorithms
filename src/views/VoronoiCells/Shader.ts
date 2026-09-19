import { FBMNoiseModule, NoiseModule } from '@/Noise/Algorithms/Common'
import { importFn } from '@/Noise/Utils'
import { shaderColorArray } from '@/utils/Colors'
import {
    ComputeShader,
    readView,
    ShaderModule,
    StorageBufferView,
    Uniform
} from '@/WebGPU/ShaderModuleSystem/Modules'

// https://www.researchgate.net/figure/Shapes-and-sizes-of-geometries-corresponding-to-different-distance-metrics_tbl1_331203691
export type DistanceMeasure = 'Euclidean' | 'Manhattan'

export interface Setup {
    distance_measure: DistanceMeasure
    voronoi_n_columns?: number
    voronoi_colors?: string[]
    voronoi_max_n_colors?: number
    noise: NoiseModule
    noise_scale?: number
    noise_strength?: number
    noise_z?: number
    noise_n_octaves?: number
    noise_persistence?: number
}

export function MainModule(
    setup: Setup,
    wg_dim_x: number,
    wg_dim_y: number
): ComputeShader {
    const noise_module = FBMNoiseModule(setup.noise)
    const pos_type = setup.noise.posType

    let pos_expr = ''

    if (pos_type === 'vec2f') {
        pos_expr = 'noise_pos'
    } else {
        pos_expr = 'vec3f(noise_pos, parameters.noise_z)'
    }

    return {
        kind: 'ComputeShader',
        name: 'main',
        resources: [
            ParametersUniform(setup),
            ColorArray(
                setup.voronoi_colors || [],
                setup.voronoi_max_n_colors || 16
            )
        ],
        imports: [noise_module, VoronoiColor(setup.distance_measure)],
        canvas: 'canvas',
        code: /* wgsl */ `
        const voronoi_seed = bitcast<u32>(i32(${Date.now() >> 0}));
        const noise_seed = voronoi_seed + 1u;

        fn warp_pos(voronoi_pos: vec2f, noise_pos: ${pos_type}) -> vec2f {
            const PI = radians(180.0);

            var fbm: FBMParams;
            fbm.n_octaves = parameters.noise_n_octaves;
            fbm.persistence = parameters.noise_persistence;
            fbm.lacunarity = 2;
            
            let noise_value = ${noise_module.name}(noise_pos, noise_seed, fbm);
            let phi = 2 * PI * noise_value;

            let direction = vec2f(cos(phi), sin(phi));
            return voronoi_pos + parameters.noise_strength * direction;
        }

        @compute @workgroup_size(${wg_dim_x}, ${wg_dim_y})
        fn main(@builtin(global_invocation_id) gid: vec3u) {
            let canvas_pos = gid.xy;
            let canvas_dims: vec2u = textureDimensions(canvas);

            if (canvas_pos.x >= canvas_dims.x || canvas_pos.y >= canvas_dims.y) {
                return;
            }
            let canvas_dims_f = vec2f(canvas_dims);
            let voronoi_n_rows = parameters.voronoi_n_columns * canvas_dims_f.y / canvas_dims_f.x;
            let voronoi_grid_dims = vec2f(parameters.voronoi_n_columns, voronoi_n_rows);

            let norm_canvas_pos = vec2f(canvas_pos) / canvas_dims_f;
            let unwarped_voronoi_pos = voronoi_grid_dims * norm_canvas_pos;
            let noise_pos = unwarped_voronoi_pos * parameters.noise_scale;

            let voronoi_pos = warp_pos(unwarped_voronoi_pos, ${pos_expr});
            let color_id = voronoi_color_id(voronoi_pos, voronoi_seed);
            let color_index = color_id % colors.n_colors;

            textureStore(canvas, canvas_pos, colors.values[color_index]);
        }
    `
    }
}

function ParametersUniform(setup: Setup): Uniform {
    const data = new ArrayBuffer(24)
    const int_view = new Uint32Array(data, 0, 1)
    const float_view = new Float32Array(data, 4)

    int_view[0] = setup.noise_n_octaves || 1
    float_view[0] = setup.noise_persistence || 0.5
    float_view[1] = setup.noise_strength || 0
    float_view[2] = setup.noise_z || 0
    float_view[3] = setup.noise_scale || 1
    float_view[4] = setup.voronoi_n_columns || 16

    return {
        kind: 'Uniform',
        name: 'parameters',
        dataType: 'Parameters',
        dataTypeCode: /* wgsl */ `
            struct Parameters {
                noise_n_octaves: u32,
                noise_persistence: f32,
                noise_strength: f32,
                noise_z: f32,
                noise_scale: f32,
                voronoi_n_columns: f32,
            };
        `,
        data: data
    }
}

export function createColorData(hex_colors: string[]) {
    const data = new ArrayBuffer(16 + 16 * hex_colors.length)
    const int_view = new Uint32Array(data, 0, 1)
    const float_view = new Float32Array(data, 16)

    const colors = shaderColorArray(hex_colors)
    int_view[0] = hex_colors.length
    float_view.set(colors, 0)

    return data
}

function ColorArray(
    hex_colors: string[],
    n_max_colors: number
): StorageBufferView<'read'> {
    return readView({
        kind: 'StorageBuffer',
        name: 'colors',
        dataType: 'Colors',
        dataTypeCode: /* wgsl */ `
            struct Colors {
                n_colors: u32,
                values: array<vec4f>
            }
        `,
        byteLength: 16 + 16 * n_max_colors,
        data: createColorData(hex_colors)
    })
}

function VoronoiColor(distance_measure: DistanceMeasure): ShaderModule {
    let dist_expr = ''

    if (distance_measure === 'Euclidean') {
        // No need to calculate square root because
        // we only need to compare which distance is the shortest
        dist_expr = 'dist_vec.x * dist_vec.x + dist_vec.y * dist_vec.y'
    } else {
        dist_expr = 'abs(dist_vec.x) + abs(dist_vec.y)'
    }

    return {
        name: 'voronoi_color_2d',
        imports: [
            importFn('seed_2d'),
            importFn('hash_2u_2f'),
            importFn('hash_2u_1u')
        ],
        code: /* wgsl */ `
            fn voronoi_color_id(pos: vec2f, seed: u32) -> u32 {
                let grid_pos = vec2i(floor(pos));
                var min_dist = 10.0;
                var min_dist_cell: vec2i = grid_pos;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        let neighbor = grid_pos + vec2i(offset_x, offset_y);
                        let point = hash_2u_2f(seed_2d(neighbor, seed));

                        let dist_vec = vec2f(neighbor) + point - pos;
                        let dist = ${dist_expr};

                        if dist < min_dist {
                            min_dist = dist;
                            min_dist_cell = neighbor;
                        }
                    }
                }
                return hash_2u_1u(seed_2d(min_dist_cell, seed));
            }
        `
    }
}
