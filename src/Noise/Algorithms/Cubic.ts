// Blog post: https://jobtalle.com/cubic_noise.html
// GitHub repo: https://github.com/jobtalle/CubicNoise

import { importFn } from '../Utils'
import { NoiseModule } from './Common'

export function Cubic2D(): NoiseModule {
    return {
        name: 'cubic_2d',
        posType: 'vec2f',
        imports: [
            importFn('seed_2d'),
            importFn('hash_2u_1f'),
            importFn('cubic_interpolation')
        ],
        code: /* wgsl */ `
            fn cubic_2d(pos: vec2f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let local_pos = pos - floor_pos;
                
                let corner = seed_2d(vec2i(floor_pos), seed);

                let x0 = corner.x - 1;
                let x2 = corner.x + 1;
                let x3 = corner.x + 2;
                
                var interpolated_x = array<f32, 4>(0, 0, 0, 0);

                for (var i = 0u; i < 4u; i++) {
                    let yi = corner.y - 1 + i;

                    interpolated_x[i] = cubic_interpolation(
                        hash_2u_1f(vec2u(x0, yi)),
                        hash_2u_1f(vec2u(corner.x, yi)),
                        hash_2u_1f(vec2u(x2, yi)),
                        hash_2u_1f(vec2u(x3, yi)),
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

                const NORM_MIN = -0.2;
                const NORM_MAX = 1.2;
                const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN);

                return clamp((n - NORM_MIN) * NORM_DIFF, 0, 1);
            }
        `
    }
}

export function Cubic3D(): NoiseModule {
    return {
        name: 'cubic_3d',
        posType: 'vec3f',
        imports: [
            importFn('seed_3d'),
            importFn('hash_3u_1f'),
            importFn('cubic_interpolation')
        ],
        code: /* wgsl */ `
            fn cubic_3d(pos: vec3f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let local_pos = pos - floor_pos;

                let corner = seed_3d(vec3i(floor_pos), seed);

                let x0 = corner.x - 1;
                let x2 = corner.x + 1;
                let x3 = corner.x + 2;

                var interpolated_y = array<f32, 4>(0, 0, 0, 0);

                for (var i = 0u; i < 4u; i++) {
                    var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                    let zi = corner.z - 1 + i;
                    
                    for (var j = 0u; j < 4u; j++) {
                        let yj = corner.y - 1 + j;

                        interpolated_x[j] = cubic_interpolation(
                            hash_3u_1f(vec3u(x0, yj, zi)),
                            hash_3u_1f(vec3u(corner.x, yj, zi)),
                            hash_3u_1f(vec3u(x2, yj, zi)),
                            hash_3u_1f(vec3u(x3, yj, zi)),
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

                const NORM_MIN = -0.2;
                const NORM_MAX = 1.2;
                const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN);

                return clamp((n - NORM_MIN) * NORM_DIFF, 0, 1);
            }
        `
    }
}

export function Cubic4D(): NoiseModule {
    return {
        name: 'cubic_4d',
        posType: 'vec4f',
        imports: [
            importFn('seed_4d'),
            importFn('hash_4u_1f'),
            importFn('cubic_interpolation')
        ],
        code: /* wgsl */ `
            fn cubic_4d(pos: vec4f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let local_pos = pos - floor_pos;

                let corner = seed_4d(vec4i(floor_pos), channel);

                let x0 = corner.x - 1;
                let x2 = corner.x + 1;
                let x3 = corner.x + 2;

                var interpolated_z = array<f32, 4>(0, 0, 0, 0);

                for (var i = 0u; i < 4; i++) {
                    var interpolated_y = array<f32, 4>(0, 0, 0, 0);
                    let wi = corner.w - 1 + i;

                    for (var j = 0u; j < 4; j++) {
                        var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                        let zj = corner.z - 1 + j;
                        
                        for (var k = 0u; k < 4; k++) {
                            let yk = corner.y - 1 + k;

                            interpolated_x[k] = cubic_interpolation(
                                hash_4u_1f(vec4u(x0, yk, zj, wi)),
                                hash_4u_1f(vec4u(corner.x, yk, zj, wi)),
                                hash_4u_1f(vec4u(x2, yk, zj, wi)),
                                hash_4u_1f(vec4u(x3, yk, zj, wi)),
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

                const NORM_MIN = -0.2;
                const NORM_MAX = 1.2;
                const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN);

                return clamp((n - NORM_MIN) * NORM_DIFF, 0, 1);
            }
        `
    }
}
