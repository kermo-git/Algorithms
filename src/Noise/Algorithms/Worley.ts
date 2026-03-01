import type { NoiseAlgorithm, Config } from '../Types'
import { scramble_2d, pcd2d_2f, scramble_3d, pcd3d_3f, scramble_4d, pcd4d_4f } from './Common'

export const Worley2D: NoiseAlgorithm = {
    pos_type: 'vec2f',

    createShaderDependencies() {
        return `
            ${scramble_2d}
            ${pcd2d_2f}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
            fn ${name}(pos: vec2f, channel: u32) -> f32 {
                let grid_pos = vec2i(floor(pos));
                var min_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        
                        let neighbor = grid_pos + vec2i(offset_x, offset_y);
                        let point = pcd2d_2f(scramble_2d(neighbor, channel));

                        let v_pos_point = vec2f(neighbor) + point - pos;
                        let dist_sqr = dot(v_pos_point, v_pos_point);
                        min_dist_sqr = min(min_dist_sqr, dist_sqr);
                    }
                }
                return clamp(sqrt(min_dist_sqr) * 1.05, 0, 1);
            }
        `
    },
}

export const Worley3D: NoiseAlgorithm = {
    pos_type: 'vec3f',

    createShaderDependencies() {
        return `
            ${scramble_3d}
            ${pcd3d_3f}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
            fn ${name}(pos: vec3f, channel: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var min_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);
                            let point = pcd3d_3f(scramble_3d(neighbor, channel));

                            let v_pos_point = vec3f(neighbor) + point - pos;
                            let dist_sqr = dot(v_pos_point, v_pos_point);
                            min_dist_sqr = min(min_dist_sqr, dist_sqr);
                        }
                    }
                }
                return clamp(sqrt(min_dist_sqr) * 0.92, 0, 1);
            }
        `
    },
}

export const Worley4D: NoiseAlgorithm = {
    pos_type: 'vec4f',

    createShaderDependencies() {
        return `
            ${scramble_4d}
            ${pcd4d_4f}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
            fn ${name}(pos: vec4f, channel: u32) -> f32 {
                let grid_pos = vec4i(floor(pos));
                var min_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {

                                let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);
                                let point = pcd4d_4f(scramble_4d(neighbor, channel));

                                let v_pos_point = vec4f(neighbor) + point - pos;
                                let dist_sqr = dot(v_pos_point, v_pos_point);
                                min_dist_sqr = min(min_dist_sqr, dist_sqr);
                            }
                        }
                    }
                }
                return clamp(sqrt(min_dist_sqr) * 0.95, 0, 1);
            }
        `
    },
}
