import type { NoiseAlgorithm, Config } from '../Types'

export const Worley2nd2D: NoiseAlgorithm = {
    pos_type: 'vec2f',
    createShader({ name, hash_table_size, n_channels }: Config): string {
        return /* wgsl */ `
            fn ${name}(global_pos: vec2f, channel: i32) -> f32 {
                const HASH_MASK = vec2i(${hash_table_size - 1});
                let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});

                let grid_pos = vec2i(floor(global_pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        let neighbor = grid_pos + vec2i(offset_x, offset_y);
                        let neighbor_m = neighbor & HASH_MASK;

                        let hash_x = hash_table[hash_offset + neighbor_m.x];
                        let hash_y = hash_table[hash_offset + hash_x + neighbor_m.y];
                        let point = noise_features[hash_y].rand_point.xy;
                        
                        let dist = vec2f(neighbor) + point - global_pos;
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
    pos_type: 'vec3f',
    createShader({ name, hash_table_size, n_channels }: Config): string {
        return /* wgsl */ `
            fn ${name}(global_pos: vec3f, channel: i32) -> f32 {
                const HASH_MASK = vec3i(${hash_table_size - 1});
                let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});

                let grid_pos = vec3i(floor(global_pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);
                            let neighbor_m = neighbor & HASH_MASK;

                            let hash_x = hash_table[hash_offset + neighbor_m.x];
                            let hash_y = hash_table[hash_offset + hash_x + neighbor_m.y];
                            let hash_z = hash_table[hash_offset + hash_y + neighbor_m.z];
                            let point = noise_features[hash_z].rand_point.xyz;

                            let dist = vec3f(neighbor) + point - global_pos;
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
    pos_type: 'vec4f',
    createShader({ name, hash_table_size, n_channels }: Config): string {
        return /* wgsl */ `
            fn ${name}(global_pos: vec4f, channel: i32) -> f32 {
                const HASH_MASK = vec4i(${hash_table_size - 1});
                let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});

                let grid_pos = vec4i(floor(global_pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {
                                let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);
                                let neighbor_m = neighbor & HASH_MASK;

                                let hash_x = hash_table[hash_offset + neighbor_m.x];
                                let hash_y = hash_table[hash_offset + hash_x + neighbor_m.y];
                                let hash_z = hash_table[hash_offset + hash_y + neighbor_m.z];
                                let hash_w = hash_table[hash_offset + hash_z + neighbor_m.w];
                                let point = noise_features[hash_w].rand_point;

                                let dist = vec4f(neighbor) + point - global_pos;
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
