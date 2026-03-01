import type { NoiseAlgorithm, Config } from '../Types'
import { pcd2d_2f, pcd3d_3f, pcd4d_4f, scramble_2d, scramble_3d, scramble_4d } from './Common'

export const Worley2nd2D: NoiseAlgorithm = {
    pos_type: 'vec2f',

    createShaderDependencies() {
        return `
            ${scramble_2d}
            ${pcd2d_2f}
        `
    },

    createShader({ name }: Config): string {
        return /* wgsl */ `
            fn ${name}(pos: vec2f, channel: u32) -> f32 {
                let grid_pos = vec2i(floor(pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {

                        let neighbor = grid_pos + vec2i(offset_x, offset_y);
                        let point = pcd2d_2f(scramble_2d(neighbor, channel));
                        
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
                return clamp((sqrt(min_2nd_dist_sqr) - 0.07) * 0.79, 0, 1);
            }
        `
    },
}

export const Worley2nd3D: NoiseAlgorithm = {
    pos_type: 'vec3f',

    createShaderDependencies: function (): string {
        return `
            ${scramble_3d}
            ${pcd3d_3f}
        `
    },

    createShader({ name }: Config): string {
        return /* wgsl */ `
            fn ${name}(pos: vec3f, channel: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);
                            let point = pcd3d_3f(scramble_3d(neighbor, channel));

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
                return clamp((sqrt(min_2nd_dist_sqr) - 0.1) * 0.92, 0, 1);
            }
        `
    },
}

export const Worley2nd4D: NoiseAlgorithm = {
    pos_type: 'vec4f',

    createShaderDependencies: function (): string {
        return `
            ${scramble_4d}
            ${pcd4d_4f}
        `
    },

    createShader({ name }: Config): string {
        return /* wgsl */ `
            fn ${name}(pos: vec4f, channel: u32) -> f32 {
                let grid_pos = vec4i(floor(pos));
                var min_dist_sqr = 10.0;
                var min_2nd_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {
                                
                                let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);
                                let point = pcd4d_4f(scramble_4d(neighbor, channel));

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
                return clamp((sqrt(min_2nd_dist_sqr) - 0.18) * 0.97, 0, 1);
            }
        `
    },
}
