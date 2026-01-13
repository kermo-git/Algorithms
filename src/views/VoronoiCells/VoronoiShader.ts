import { WG_DIM } from '@/WebGPU/ComputeRenderer'
import type { NoiseAlgorithm, NoiseDimension } from '@/Noise/Types'
import {
    findGridPosShader,
    noiseFunctionShader,
    octaveNoiseShader,
    randVec2f,
    randVec3f,
    shaderVecType,
} from '@/Noise/ShaderUtils'

export type DistanceMeasure = 'Euclidean' | 'Manhattan'

export interface VoronoiSetup {
    distance_measure: DistanceMeasure
    warp_algorithm?: NoiseAlgorithm
    warp_dimension?: NoiseDimension
}

export interface VoronoiUniforms {
    n_grid_columns?: number
    noise_scale?: number
    noise_warp_strength?: number
    n_noise_octaves?: number
    noise_persistence?: number
    noise_z_coord?: number
}

export function voronoiShader(
    { distance_measure, warp_algorithm, warp_dimension }: VoronoiSetup,
    color_format: GPUTextureFormat,
) {
    const has_noise = warp_algorithm !== undefined
    let conditional_declarations =
        /* wgsl */ '@group(1) @binding(0) var<storage> hash_table: array<i32>;'

    if (has_noise) {
        const dimension = warp_dimension || '2D'
        const only_3D = dimension === '3D' ? '' : '//'
        const pos_type = shaderVecType(dimension)
        const rand_vec_func = dimension === '2D' ? randVec2f : randVec3f

        conditional_declarations = /* wgsl */ `
            ${noiseFunctionShader(warp_algorithm, dimension)}
            
            @group(1) @binding(6) var<uniform> noise_scale: f32;
            @group(1) @binding(7) var<uniform> noise_warp_strength: f32;
            @group(1) @binding(8) var<uniform> n_noise_octaves: u32;
            @group(1) @binding(9) var<uniform> persistence: f32;
            ${only_3D} @group(1) @binding(10) var<uniform> z_coordinate: f32;

            ${findGridPosShader(dimension, 'find_noise_pos')}
            ${octaveNoiseShader(dimension)}

            fn warp_pos(voronoi_pos: vec2f, noise_pos: ${pos_type}) -> vec2f {
                let warp_x = noise_pos + ${rand_vec_func()};
                let warp_y = noise_pos + ${rand_vec_func()};

                let warp_vec = vec2f(
                    octave_noise(warp_x, n_noise_octaves),
                    octave_noise(warp_y, n_noise_octaves)
                );
                return voronoi_pos + noise_warp_strength * warp_vec;
            }
        `
    }

    const voronoi_pos_code = has_noise
        ? /* wgsl */ `
            let unwarped_voronoi_pos = find_voronoi_pos(texture_pos, texture_dims, n_grid_columns);
            let noise_pos = find_noise_pos(texture_pos, texture_dims, n_grid_columns * noise_scale);
            let voronoi_pos = warp_pos(unwarped_voronoi_pos, noise_pos);
        `
        : /* wgsl */ `
            let voronoi_pos = find_voronoi_pos(texture_pos, texture_dims, n_grid_columns);
        `

    let dist_expr = ''

    if (distance_measure === 'Euclidean') {
        dist_expr = 'dist_vec.x * dist_vec.x + dist_vec.y * dist_vec.y'
    } else {
        dist_expr = 'abs(dist_vec.x) + abs(dist_vec.y)'
    }

    return /* wgsl */ `
        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        
        @group(1) @binding(2) var<uniform> n_grid_columns: f32;
        @group(1) @binding(3) var<storage> voronoi_points: array<vec2f>;
        @group(1) @binding(4) var<storage> color_index_data: array<i32>;
        @group(1) @binding(5) var<storage> colors: array<vec4f>;
        
        ${conditional_declarations}

        ${findGridPosShader('2D', 'find_voronoi_pos')}

        fn get_color(grid_cell: vec2i) -> vec4f {
            let masked_cell = grid_cell & vec2i(255, 255);
            let hash = hash_table[hash_table[masked_cell.x] + masked_cell.y];
            return colors[color_index_data[hash]];
        }

        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(@builtin(global_invocation_id) gid: vec3u) {
            let texture_pos = gid.xy;
            let texture_dims: vec2u = textureDimensions(texture);

            if (texture_pos.x >= texture_dims.x || texture_pos.y >= texture_dims.y) {
                return;
            }
            ${voronoi_pos_code}
            let grid_pos = vec2i(floor(voronoi_pos));

            var min_dist = 10.0;
            var min_dist_cell: vec2i = grid_pos;

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    let neighbor = grid_pos + vec2i(offset_x, offset_y);

                    let hash = hash_table[
                        hash_table[neighbor.x & 255] + (neighbor.y & 255)
                    ];
                    let dist_vec = vec2f(neighbor) + voronoi_points[hash] - voronoi_pos;
                    let dist = ${dist_expr};

                    if dist < min_dist {
                        min_dist = dist;
                        min_dist_cell = neighbor;
                    }
                }
            }
            let color = get_color(min_dist_cell);
            textureStore(texture, texture_pos, color);
        }
    `
}
