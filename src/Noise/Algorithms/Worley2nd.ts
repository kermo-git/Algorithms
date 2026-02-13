import type { NoiseAlgorithm, NoiseShaderNames } from '../Types'
import { randomPoints2D, randomPoints3D, randomPoints4D } from '../SeedData'

export const Worley2nd2D: NoiseAlgorithm = {
    feature_type: 'vec2f',
    generateFeatures: randomPoints2D,

    pos_type: 'vec2f',
    createShader({ hash_table, features, noise }: NoiseShaderNames): string {
        return /* wgsl */ `
            fn ${noise}(global_pos: vec2f) -> f32 {
                let grid_pos = vec2i(floor(global_pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        let neighbor = grid_pos + vec2i(offset_x, offset_y);

                        let hash = ${hash_table}[
                            ${hash_table}[neighbor.x & 255] + (neighbor.y & 255)
                        ];
                        let dist = vec2f(neighbor) + ${features}[hash] - global_pos;
                        let dist_sqr = dist.x * dist.x + dist.y * dist.y;
                        
                        if (dist_sqr < min_dist_sqr) {
                            min_2nd_dist_sqr = min_dist_sqr;
                            min_dist_sqr = dist_sqr;
                        } else if (dist_sqr < min_2nd_dist_sqr) {
                            min_2nd_dist_sqr = dist_sqr;
                        }
                    }
                }
                return clamp((sqrt(min_2nd_dist_sqr) - 0.07) * 0.79, 0, 1);
            }
        `
    },
}

export const Worley2nd3D: NoiseAlgorithm = {
    feature_type: 'vec3f',
    generateFeatures: randomPoints3D,

    pos_type: 'vec3f',
    createShader({ hash_table, features, noise }: NoiseShaderNames): string {
        return /* wgsl */ `
            fn ${noise}(global_pos: vec3f) -> f32 {
                let grid_pos = vec3i(floor(global_pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);

                            let hash = ${hash_table}[
                                ${hash_table}[
                                    ${hash_table}[neighbor.x & 255] + (neighbor.y & 255)
                                ] + (neighbor.z & 255)
                            ];
                            let dist = vec3f(neighbor) + ${features}[hash] - global_pos;
                            let dist_sqr = dist.x * dist.x + dist.y * dist.y + dist.z * dist.z;
                            
                            if (dist_sqr < min_dist_sqr) {
                                min_2nd_dist_sqr = min_dist_sqr;
                                min_dist_sqr = dist_sqr;
                            } else if (dist_sqr < min_2nd_dist_sqr) {
                                min_2nd_dist_sqr = dist_sqr;
                            }
                        }
                    }
                }
                return clamp((sqrt(min_2nd_dist_sqr) - 0.1) * 0.92, 0, 1);
            }
        `
    },
}

export const Worley2nd4D: NoiseAlgorithm = {
    feature_type: 'vec4f',
    generateFeatures: randomPoints4D,

    pos_type: 'vec4f',
    createShader({ hash_table, features, noise }: NoiseShaderNames): string {
        return /* wgsl */ `
            fn ${noise}(global_pos: vec4f) -> f32 {
                let grid_pos = vec4i(floor(global_pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {
                                let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);

                                let hash = ${hash_table}[
                                    ${hash_table}[
                                        ${hash_table}[
                                            ${hash_table}[neighbor.x & 255] + (neighbor.y & 255)
                                        ] + (neighbor.z & 255)
                                    ] + (neighbor.w & 255)
                                ];
                                let dist = vec4f(neighbor) + ${features}[hash] - global_pos;
                                let dist_sqr = dist.x * dist.x + dist.y * dist.y + dist.z * dist.z + dist.w * dist.w;
                                
                                if (dist_sqr < min_dist_sqr) {
                                    min_2nd_dist_sqr = min_dist_sqr;
                                    min_dist_sqr = dist_sqr;
                                } else if (dist_sqr < min_2nd_dist_sqr) {
                                    min_2nd_dist_sqr = dist_sqr;
                                }
                            }
                        }
                    }
                }
                return clamp((sqrt(min_2nd_dist_sqr) - 0.18) * 0.97, 0, 1);
            }
        `
    },
}
