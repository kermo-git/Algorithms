import type { NoiseAlgorithm, Config } from '../Types'
import {
    hash_2u_2f,
    hash_3u_3f,
    hash_4u_4f,
    seed_2d,
    seed_3d,
    seed_4d
} from './Common'

export const WorleyF22D: NoiseAlgorithm = {
    pos_type: 'vec2f',

    createShaderDependencies() {
        return `
            ${seed_2d}
            ${hash_2u_2f}
        `
    },

    createShader({ functionName }: Config): string {
        return /* wgsl */ `
            fn ${functionName}(pos: vec2f, channel: u32) -> f32 {
                let grid_pos = vec2i(floor(pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {

                        let neighbor = grid_pos + vec2i(offset_x, offset_y);
                        let point = hash_2u_2f(seed_2d(neighbor, channel));
                        
                        let v_pos_point = vec2f(neighbor) + point - pos;
                        let dist_sqr = dot(v_pos_point, v_pos_point);
                        
                        if (dist_sqr < min_dist_sqr) {
                            min_2nd_dist_sqr = min_dist_sqr;
                            min_dist_sqr = dist_sqr;
                        } else if (dist_sqr < min_2nd_dist_sqr) {
                            min_2nd_dist_sqr = dist_sqr;
                        }
                    }
                }
                return 0.95*(sqrt(min_2nd_dist_sqr) - sqrt(min_dist_sqr));
            }
        `
    }
}

export const WorleyF23D: NoiseAlgorithm = {
    pos_type: 'vec3f',

    createShaderDependencies: function (): string {
        return `
            ${seed_3d}
            ${hash_3u_3f}
        `
    },

    createShader({ functionName }: Config): string {
        return /* wgsl */ `
            fn ${functionName}(pos: vec3f, channel: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);
                            let point = hash_3u_3f(seed_3d(neighbor, channel));

                            let v_pos_point = vec3f(neighbor) + point - pos;
                            let dist_sqr = dot(v_pos_point, v_pos_point);
                            
                            if (dist_sqr < min_dist_sqr) {
                                min_2nd_dist_sqr = min_dist_sqr;
                                min_dist_sqr = dist_sqr;
                            } else if (dist_sqr < min_2nd_dist_sqr) {
                                min_2nd_dist_sqr = dist_sqr;
                            }
                        }
                    }
                }
                return 1.1*(sqrt(min_2nd_dist_sqr) - sqrt(min_dist_sqr));
            }
        `
    }
}

export const WorleyF24D: NoiseAlgorithm = {
    pos_type: 'vec4f',

    createShaderDependencies: function (): string {
        return `
            ${seed_4d}
            ${hash_4u_4f}
        `
    },

    createShader({ functionName }: Config): string {
        return /* wgsl */ `
            fn ${functionName}(pos: vec4f, channel: u32) -> f32 {
                let grid_pos = vec4i(floor(pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {
                                
                                let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);
                                let point = hash_4u_4f(seed_4d(neighbor, channel));

                                let v_pos_point = vec4f(neighbor) + point - pos;
                                let dist_sqr = dot(v_pos_point, v_pos_point);
                                
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
                return 1.1*(sqrt(min_2nd_dist_sqr) - sqrt(min_dist_sqr));
            }
        `
    }
}
