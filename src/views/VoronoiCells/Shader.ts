import { findGridPosShader, octaveNoiseShader } from '@/Noise/ShaderUtils'
import type { NoiseAlgorithm } from '@/Noise/Types'
import { WG_DIM, type FloatArray } from '@/WebGPU/Engine'

// https://www.researchgate.net/figure/Shapes-and-sizes-of-geometries-corresponding-to-different-distance-metrics_tbl1_331203691
export type DistanceMeasure = 'Euclidean' | 'Manhattan'

export interface Setup {
    distance_measure: DistanceMeasure
    warp_algorithm?: NoiseAlgorithm
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
    { distance_measure, warp_algorithm }: Setup,
    color_format: GPUTextureFormat,
) {
    const has_noise = warp_algorithm !== undefined

    let noise_declarations = ''
    let voronoi_pos_code = ''

    if (has_noise) {
        const pos_type = warp_algorithm.pos_type
        const only_3D = pos_type === 'vec3f' ? '' : '//'

        noise_declarations = /* wgsl */ `
            ${warp_algorithm.createShader({
                hash_table: 'hash_table',
                features: 'noise_features',
                noise: 'noise',
            })}
            
            @group(1) @binding(3) var<storage> noise_features: array<${warp_algorithm.feature_type}>;
            @group(1) @binding(4) var<uniform> noise_scale: f32;
            @group(1) @binding(5) var<uniform> noise_n_octaves: u32;
            @group(1) @binding(6) var<uniform> noise_persistence: f32;
            @group(1) @binding(7) var<uniform> noise_warp_strength: f32;
            ${only_3D} @group(1) @binding(8) var<uniform> noise_z: f32;

            ${octaveNoiseShader({
                func_name: 'octave_noise',
                noise_name: 'noise',
                pos_type: warp_algorithm.pos_type,
            })}

            fn warp_pos(voronoi_pos: vec2f, noise_pos: ${pos_type}) -> vec2f {
                const PI = radians(180.0);
                
                let theta_noise = octave_noise(noise_pos, noise_n_octaves, noise_persistence);
                let phi = 2 * PI * theta_noise;
    
                let direction = vec2f(
                    cos(phi),
                    sin(phi)
                );
                return voronoi_pos + noise_warp_strength * direction;
            }
        `

        if (pos_type === 'vec2f') {
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
        
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<uniform> voronoi_n_columns: f32;
        @group(1) @binding(2) var<storage> voronoi_points: array<vec2f>;
        @group(2) @binding(0) var<storage> voronoi_colors: array<vec4f>;
        
        ${findGridPosShader}

        ${noise_declarations}

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
