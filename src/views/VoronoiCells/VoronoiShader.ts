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

export function voronoiShader(
    { distance_measure, warp_algorithm, warp_dimension }: VoronoiSetup,
    color_format: GPUTextureFormat,
) {
    const has_noise = warp_algorithm !== undefined
    let noise_declarations = /* wgsl */ '@group(1) @binding(0) var<storage> hash_table: array<i32>;'

    if (has_noise) {
        const dimension = warp_dimension || '2D'
        const only_3D = dimension === '3D' ? '' : '//'
        const pos_type = shaderVecType(dimension)
        const rand_vec_func = dimension === '2D' ? randVec2f : randVec3f

        noise_declarations = /* wgsl */ `
            ${noiseFunctionShader(warp_algorithm, dimension)}
            
            @group(1) @binding(6) var<uniform> n_noise_columns: f32;
            @group(1) @binding(7) var<uniform> n_octaves: u32;
            @group(1) @binding(8) var<uniform> persistence: f32;
            @group(1) @binding(9) var<uniform> warp_strength: f32;
            ${only_3D} @group(1) @binding(10) var<uniform> z_coordinate: u32;

            ${findGridPosShader(dimension, 'find_noise_pos')}
            ${octaveNoiseShader(dimension)}

            fn warp_pos(voronoi_pos: vec2f, noise_pos: ${pos_type}) -> vec2f {
                let warp_x = noise_pos + ${rand_vec_func()};
                let warp_y = noise_pos + ${rand_vec_func()};

                let warp_vec = vec2f(
                    octave_noise(warp_x, n_octaves),
                    octave_noise(warp_y, n_octaves)
                );
                return voronoi_pos + warp_strength * warp_vec;
            }
        `
    }

    const voronoi_pos_code = has_noise
        ? /* wgsl */ `
            let unwarped_voronoi_pos = find_voronoi_pos(texture_pos, texture_dims, n_voronoi_columns);
            let noise_pos = find_noise_pos(texture_pos, texture_dims, n_noise_columns);
            let voronoi_pos = warp_pos(unwarped_voronoi_pos, noise_pos);
        `
        : /* wgsl */ `
            let voronoi_pos = find_voronoi_pos(texture_pos, texture_dims, n_voronoi_columns);
        `

    let dist_expr = ''

    if (distance_measure === 'Euclidean') {
        dist_expr = 'dist_vec.x * dist_vec.x + dist_vec.y * dist_vec.y'
    } else {
        dist_expr = 'dist_vec.x + dist_vec.y'
    }

    return /* wgsl */ `
        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        
        @group(1) @binding(2) var<uniform> n_voronoi_columns: f32;
        @group(1) @binding(3) var<storage> voronoi_points: array<vec2f>;
        @group(1) @binding(4) var<storage> color_index_matrix: array<i32>;
        @group(1) @binding(5) var<storage> colors: array<vec4f>;
        
        ${noise_declarations}

        ${findGridPosShader('2D', 'find_voronoi_pos')}

        fn get_color(grid_cell_coords: vec2i): -> vec4f {
            let matrix_index = 256 * grid_cell_coords.y + grid_cell_coords.x;
            let color_index = color_index_matrix[matrix_index];
            return colors[color_index];
        }

        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(@builtin(global_invocation_id) global_id: vec3u) {
            let texture_pos = gid.xy;
            let texture_dims: vec2u = textureDimensions(texture);

            if (texture_pos.x >= texture_dims.x || texture_pos.y >= texture_dims.y) {
                return;
            }
            ${voronoi_pos_code}
            let grid_pos = vec2i(floor(voronoi_pos));

            var min_dist = 10.0;
            var min_dist_cell: vec2i = 0;

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
