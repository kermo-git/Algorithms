import { findGridPosShader, octaveNoiseShader } from '@/Noise/ShaderUtils'
import type { NoiseAlgorithm } from '@/Noise/Types'
import { WG_DIM, type FloatArray } from '@/WebGPU/Engine'

// https://www.researchgate.net/figure/Shapes-and-sizes-of-geometries-corresponding-to-different-distance-metrics_tbl1_331203691
export type DistanceMeasure = 'Euclidean' | 'Manhattan'

export interface Setup {
    distance_measure: DistanceMeasure
    warp_algorithm: NoiseAlgorithm
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
    const pos_type = warp_algorithm.pos_type
    const noise_data = warp_algorithm.extra_data_type ? '' : '//'
    const only_3D = pos_type === 'vec3f' ? '' : '//'

    let pos_expr = ''

    if (pos_type === 'vec2f') {
        pos_expr = 'noise_pos'
    } else {
        pos_expr = 'vec3f(noise_pos, noise_z)'
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
        const voronoi_channel = bitcast<u32>(i32(${Date.now() >> 0}));
        const noise_channel = voronoi_channel + 1u;

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        
        @group(1) @binding(0) var<uniform> voronoi_n_columns: f32;
        @group(1) @binding(1) var<uniform> noise_scale: f32;
        @group(1) @binding(2) var<uniform> noise_n_octaves: u32;
        @group(1) @binding(3) var<uniform> noise_persistence: f32;
        @group(1) @binding(4) var<uniform> noise_warp_strength: f32;
        ${only_3D} @group(1) @binding(5) var<uniform> noise_z: f32;
        ${noise_data} @group(1) @binding(6) var<storage> noise_data: ${warp_algorithm.extra_data_type};

        @group(2) @binding(0) var<storage> voronoi_colors: array<vec4f>;
        
        ${findGridPosShader}

        fn voronoi_point(coords: vec2i) -> vec2f {
            var h = bitcast<vec2u>(coords) + voronoi_channel * 0x9e3779b9;
            h = h * 1664525u + 1013904223u;

            h.x += h.y * 1664525u;
            h.y += h.x * 1664525u;

            h = h ^ (h >> vec2u(16u));

            h.x += h.y * 1664525u;
            h.y += h.x * 1664525u;
            h = h ^ (h >> vec2u(16u));

            return vec2f(h.xy) * (1.0 / f32(0xFFFFFFFFu));
        }

        fn find_color(coords: vec2i) -> vec4f {
            var h = bitcast<vec2u>(coords) + voronoi_channel * 0x9e3779b9;

            h = h * 1664525u + 1013904223u;
            h.x += h.y * 1664525u;
            h.y += h.x * 1664525u;
            h = h ^ (h >> vec2u(16u));

            var x = h.x + h.y * 1664525u;
            x ^= (x >> 16u);
            
            return voronoi_colors[x % arrayLength(&voronoi_colors)];
        }

        ${warp_algorithm.createShaderDependencies()}

        ${warp_algorithm.createShader({
            name: 'noise',
            extraBufferName: 'noise_data',
        })}
        
        ${octaveNoiseShader({
            func_name: 'octave_noise',
            noise_name: 'noise',
            pos_type: warp_algorithm.pos_type,
        })}

        fn warp_pos(voronoi_pos: vec2f, noise_pos: ${pos_type}) -> vec2f {
            const PI = radians(180.0);
            
            let noise_value = octave_noise(noise_pos, noise_channel, noise_n_octaves, noise_persistence);
            let phi = 2 * PI * noise_value;

            let direction = vec2f(cos(phi), sin(phi));
            return voronoi_pos + noise_warp_strength * direction;
        }

        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(@builtin(global_invocation_id) gid: vec3u) {
            let texture_pos = gid.xy;
            let texture_dims: vec2u = textureDimensions(texture);

            if (texture_pos.x >= texture_dims.x || texture_pos.y >= texture_dims.y) {
                return;
            }
            let unwarped_voronoi_pos = find_grid_pos(texture_pos, texture_dims, voronoi_n_columns);
            let noise_pos = find_grid_pos(texture_pos, texture_dims, voronoi_n_columns * noise_scale);
            let voronoi_pos = warp_pos(unwarped_voronoi_pos, ${pos_expr});

            let grid_pos = vec2i(floor(voronoi_pos));
            
            var min_dist = 10.0;
            var min_dist_cell: vec2i = grid_pos;

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    let neighbor = grid_pos + vec2i(offset_x, offset_y);
                    let point = voronoi_point(neighbor);

                    let dist_vec = vec2f(neighbor) + point - voronoi_pos;
                    let dist = ${dist_expr};

                    if dist < min_dist {
                        min_dist = dist;
                        min_dist_cell = neighbor;
                    }
                }
            }
            let color = find_color(min_dist_cell);
            textureStore(texture, texture_pos, color);
        }
    `
}
