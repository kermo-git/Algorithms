import type { IntArray, FloatArray } from '@/WebGPU/ShaderDataUtils'
import { WG_DIM } from '@/WebGPU/ComputeRenderer'
import type { NoiseAlgorithm, NoiseDimension } from '@/Noise/Types'
import {
    findGridPosShader,
    noiseFunctionShader,
    octaveNoiseShader,
    randVec,
    shaderVecType,
} from '@/Noise/ShaderUtils'

// https://www.researchgate.net/figure/Shapes-and-sizes-of-geometries-corresponding-to-different-distance-metrics_tbl1_331203691
export type DistanceMeasure = 'Euclidean' | 'Manhattan'

export interface Setup {
    distance_measure: DistanceMeasure
    warp_algorithm?: NoiseAlgorithm
    warp_dimension?: NoiseDimension
}

export interface UniformData {
    voronoi_n_columns?: number
    voronoi_colors?: FloatArray
    noise_scale?: number
    noise_warp_strength?: number
    noise_n_octaves?: number
    noise_persistence?: number
    noise_z?: number
}

export function createShader(
    { distance_measure, warp_algorithm, warp_dimension }: Setup,
    color_format: GPUTextureFormat,
) {
    const has_noise = warp_algorithm !== undefined && warp_dimension !== undefined

    let conditional_declarations = ''
    let voronoi_pos_code = ''

    if (has_noise) {
        const only_3D = warp_dimension === '3D' ? '' : '//'
        const pos_type = shaderVecType(warp_dimension)

        conditional_declarations = /* wgsl */ `
            ${noiseFunctionShader(warp_algorithm, warp_dimension)}
            
            @group(1) @binding(5) var<uniform> noise_scale: f32;
            @group(1) @binding(6) var<uniform> noise_n_octaves: u32;
            @group(1) @binding(7) var<uniform> noise_persistence: f32;
            @group(1) @binding(8) var<uniform> noise_warp_strength: f32;
            ${only_3D} @group(1) @binding(9) var<uniform> noise_z: f32;

            ${octaveNoiseShader(warp_dimension)}

            fn warp_pos(voronoi_pos: vec2f, noise_pos: ${pos_type}) -> vec2f {
                let warp_x = noise_pos + ${randVec(warp_dimension)};
                let warp_y = noise_pos + ${randVec(warp_dimension)};

                let warp_vec = vec2f(
                    octave_noise(warp_x, noise_n_octaves, noise_persistence),
                    octave_noise(warp_y, noise_n_octaves, noise_persistence)
                );
                return voronoi_pos + noise_warp_strength * warp_vec;
            }
        `

        if (warp_dimension === '2D') {
            voronoi_pos_code = /* wgsl */ `
                let unwarped_voronoi_pos = find_grid_pos(texture_pos, texture_dims, voronoi_n_columns);
                let noise_pos = find_grid_pos(texture_pos, texture_dims, voronoi_n_columns * noise_scale);
                let voronoi_pos = warp_pos(unwarped_voronoi_pos, noise_pos);
            `
        } else {
            voronoi_pos_code = /* wgsl */ `
                let unwarped_voronoi_pos = find_grid_pos(texture_pos, texture_dims, voronoi_n_columns);
                let noise_pos_2D = find_grid_pos(texture_pos, texture_dims, voronoi_n_columns * noise_scale);
                let noise_pos = vec3f(noise_pos_2D, noise_z);
                let voronoi_pos = warp_pos(unwarped_voronoi_pos, noise_pos);
            `
        }
    } else {
        conditional_declarations = /* wgsl */ `@group(1) @binding(0) var<storage> hash_table: array<i32>;`
        voronoi_pos_code = /* wgsl */ `
            let voronoi_pos = find_grid_pos(texture_pos, texture_dims, voronoi_n_columns);
        `
    }

    let dist_expr = ''

    if (distance_measure === 'Euclidean') {
        // No need to calculate square root because
        // we only need to compare which distance is the shortest
        dist_expr = 'dist_vec.x * dist_vec.x + dist_vec.y * dist_vec.y'
    } else {
        dist_expr = 'abs(dist_vec.x) + abs(dist_vec.y)'
    }

    return /* wgsl */ `
        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        
        @group(1) @binding(2) var<uniform> voronoi_n_columns: f32;
        @group(1) @binding(3) var<storage> voronoi_points: array<vec2f>;
        @group(2) @binding(0) var<storage> voronoi_colors: array<vec4f>;
        
        ${findGridPosShader}

        ${conditional_declarations}

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
            let masked_cell = min_dist_cell & vec2i(255, 255);
            let hash = hash_table[hash_table[masked_cell.x] + masked_cell.y];
            let index = u32(hash) % arrayLength(&voronoi_colors);
            let color = voronoi_colors[index];

            textureStore(texture, texture_pos, color);
        }
    `
}
