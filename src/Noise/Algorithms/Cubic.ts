// Blog post: https://jobtalle.com/cubic_noise.html
// GitHub repo: https://github.com/jobtalle/CubicNoise

import type { Config, NoiseAlgorithm } from '../Types'
import { cubic_interpolation, pcd2d_1f, pcd3d_1f, pcd4d_1f } from './Common'

export const Cubic2D: NoiseAlgorithm = {
    pos_type: 'vec2f',

    createShaderDependencies: function (): string {
        return `
            ${pcd2d_1f}
            ${cubic_interpolation}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
            fn ${name}(pos: vec2f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let local_pos = pos - floor_pos;
                
                let x1 = u32(i32(floor_pos.x));
                let y1 = u32(i32(floor_pos.y));

                let x0 = x1 - 1;
                let x2 = x1 + 1;
                let x3 = x1 + 2;
                
                var interpolated_x = array<f32, 4>(0, 0, 0, 0);

                for (var i = 0u; i < 4u; i++) {
                    let yi = y1 - 1 + i;

                    interpolated_x[i] = cubic_interpolation(
                        pcd2d_1f(vec2u(x0, yi), channel),
                        pcd2d_1f(vec2u(x1, yi), channel),
                        pcd2d_1f(vec2u(x2, yi), channel),
                        pcd2d_1f(vec2u(x3, yi), channel),
                        local_pos.x
                    );
                }

                let n = cubic_interpolation(
                    interpolated_x[0],
                    interpolated_x[1],
                    interpolated_x[2],
                    interpolated_x[3],
                    local_pos.y
                );

                const NORM_MIN = -0.3;
                const NORM_MAX = 1.3;
                const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN);

                return clamp((n - NORM_MIN) * NORM_DIFF, 0, 1);
            }
        `
    },
}

export const Cubic3D: NoiseAlgorithm = {
    pos_type: 'vec3f',

    createShaderDependencies: function (): string {
        return `
            ${pcd3d_1f}
            ${cubic_interpolation}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
        fn ${name}(pos: vec3f, channel: u32) -> f32 {
            let floor_pos = floor(pos);
            let local_pos = pos - floor_pos;

            let c = vec3u(vec3i(floor_pos));

            let x0 = c.x - 1;
            let x2 = c.x + 1;
            let x3 = c.x + 2;

            var interpolated_y = array<f32, 4>(0, 0, 0, 0);

            for (var i = 0u; i < 4u; i++) {
                var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                let zi = c.z - 1 + i;
                
                for (var j = 0u; j < 4u; j++) {
                    let yj = c.y - 1 + j;

                    interpolated_x[j] = cubic_interpolation(
                        pcd3d_1f(vec3u(x0, yj, zi), channel),
                        pcd3d_1f(vec3u(c.x, yj, zi), channel),
                        pcd3d_1f(vec3u(x2, yj, zi), channel),
                        pcd3d_1f(vec3u(x3, yj, zi), channel),
                        local_pos.x
                    );
                }

                interpolated_y[i] = cubic_interpolation(
                    interpolated_x[0],
                    interpolated_x[1],
                    interpolated_x[2],
                    interpolated_x[3],
                    local_pos.y
                );
            }

            let n = cubic_interpolation(
                interpolated_y[0],
                interpolated_y[1],
                interpolated_y[2],
                interpolated_y[3],
                local_pos.z
            );

            const NORM_MIN = -0.3;
            const NORM_MAX = 1.3;
            const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN);

            return clamp((n - NORM_MIN) * NORM_DIFF, 0, 1);
        }
    `
    },
}

export const Cubic4D: NoiseAlgorithm = {
    pos_type: 'vec4f',

    createShaderDependencies: function (): string {
        return `
            ${pcd4d_1f}
            ${cubic_interpolation}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
            fn ${name}(global_pos: vec4f, channel: u32) -> f32 {
                let floor_pos = floor(global_pos);
                let local_pos = global_pos - floor_pos;

                let c = vec4u(vec4i(floor_pos));
                let x0 = c.x - 1;
                let x2 = c.x + 1;
                let x3 = c.x + 2;

                var interpolated_z = array<f32, 4>(0, 0, 0, 0);

                for (var i = 0u; i < 4; i++) {
                    var interpolated_y = array<f32, 4>(0, 0, 0, 0);
                    let wi = c.w - 1 + i;

                    for (var j = 0u; j < 4; j++) {
                        var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                        let zj = c.z - 1 + j;
                        
                        for (var k = 0u; k < 4; k++) {
                            let yk = c.y - 1 + k;

                            interpolated_x[k] = cubic_interpolation(
                                pcd4d_1f(vec4u(x0, yk, zj, wi), channel),
                                pcd4d_1f(vec4u(c.x, yk, zj, wi), channel),
                                pcd4d_1f(vec4u(x2, yk, zj, wi), channel),
                                pcd4d_1f(vec4u(x3, yk, zj, wi), channel),
                                local_pos.x
                            );
                        }

                        interpolated_y[j] = cubic_interpolation(
                            interpolated_x[0],
                            interpolated_x[1],
                            interpolated_x[2],
                            interpolated_x[3],
                            local_pos.y
                        );
                    }

                    interpolated_z[i] = cubic_interpolation(
                        interpolated_y[0],
                        interpolated_y[1],
                        interpolated_y[2],
                        interpolated_y[3],
                        local_pos.z
                    );
                }

                let n = cubic_interpolation(
                    interpolated_z[0],
                    interpolated_z[1],
                    interpolated_z[2],
                    interpolated_z[3],
                    local_pos.w
                );

                const NORM_MIN = -0.3;
                const NORM_MAX = 1.3;
                const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN);

                return clamp((n - NORM_MIN) * NORM_DIFF, 0, 1);
            }
        `
    },
}
