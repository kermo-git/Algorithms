// Blog post: https://jobtalle.com/cubic_noise.html
// GitHub repo: https://github.com/jobtalle/CubicNoise

import { type NoiseShaderNames } from '../ShaderUtils'

export function cubic2DShader({ hash_table, features, noise }: NoiseShaderNames): string {
    const get_value = `${noise}_value`
    const interpolate = `${noise}_interpolate`

    const NORM_MIN = -0.3
    const NORM_MAX = 1.3
    const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN)

    return /* wgsl */ `
        fn ${get_value}(x: i32, y: i32) -> f32 {
            let hash = ${hash_table}[${hash_table}[x] + y];
            return ${features}[hash];
        }

        fn ${interpolate}(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        fn ${noise}(global_pos: vec2f) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let floor_x = i32(floor_pos.x);
            let floor_y = i32(floor_pos.y);

            let x0 = (floor_x - 1) & 255;
            let x1 = floor_x & 255;
            let x2 = (floor_x + 1) & 255;
            let x3 = (floor_x + 2) & 255;
            
            var interpolated_x = array<f32, 4>(0, 0, 0, 0);

            for (var i = 0; i < 4; i++) {
                let yi = (floor_y - 1 + i) & 255;

                interpolated_x[i] = ${interpolate}(
                    ${get_value}(x0, yi),
                    ${get_value}(x1, yi),
                    ${get_value}(x2, yi),
                    ${get_value}(x3, yi),
                    local_pos.x
                );
            }

            let n = ${interpolate}(
                interpolated_x[0],
                interpolated_x[1],
                interpolated_x[2],
                interpolated_x[3],
                local_pos.y
            );
            return clamp((n - ${NORM_MIN}) * ${NORM_DIFF}, 0, 1);
        }
    `
}

export function cubic3DShader({ hash_table, features, noise }: NoiseShaderNames): string {
    const get_value = `${noise}_value`
    const interpolate = `${noise}_interpolate`

    const NORM_MIN = -0.3
    const NORM_MAX = 1.3
    const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN)

    return /* wgsl */ `
        fn ${get_value}(x: i32, y: i32, z: i32) -> f32 {
            let hash = ${hash_table}[${hash_table}[${hash_table}[x] + y] + z];
            return ${features}[hash];
        }

        fn ${interpolate}(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        fn ${noise}(global_pos: vec3f) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let floor_x = i32(floor_pos.x);
            let floor_y = i32(floor_pos.y);
            let floor_z = i32(floor_pos.z);

            let x0 = (floor_x - 1) & 255;
            let x1 = floor_x & 255;
            let x2 = (floor_x + 1) & 255;
            let x3 = (floor_x + 2) & 255;

            var interpolated_y = array<f32, 4>(0, 0, 0, 0);

            for (var i = 0; i < 4; i++) {
                var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                let zi = (floor_z - 1 + i) & 255;
                
                for (var j = 0; j < 4; j++) {
                    let yj = (floor_y - 1 + j) & 255;

                    interpolated_x[j] = ${interpolate}(
                        ${get_value}(x0, yj, zi),
                        ${get_value}(x1, yj, zi),
                        ${get_value}(x2, yj, zi),
                        ${get_value}(x3, yj, zi),
                        local_pos.x
                    );
                }

                interpolated_y[i] = ${interpolate}(
                    interpolated_x[0],
                    interpolated_x[1],
                    interpolated_x[2],
                    interpolated_x[3],
                    local_pos.y
                );
            }

            let n = ${interpolate}(
                interpolated_y[0],
                interpolated_y[1],
                interpolated_y[2],
                interpolated_y[3],
                local_pos.z
            );
            return clamp((n - ${NORM_MIN}) * ${NORM_DIFF}, 0, 1);
        }
    `
}

export function cubic4DShader({ hash_table, features, noise }: NoiseShaderNames): string {
    const get_value = `${noise}_value`
    const interpolate = `${noise}_interpolate`

    const NORM_MIN = -0.3
    const NORM_MAX = 1.3
    const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN)

    return /* wgsl */ `
        fn ${get_value}(x: i32, y: i32, z: i32, w: i32) -> f32 {
            let hash = ${hash_table}[${hash_table}[${hash_table}[${hash_table}[x] + y] + z] + w];
            return ${features}[hash];
        }

        fn ${interpolate}(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        fn ${noise}(global_pos: vec4f) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let floor_x = i32(floor_pos.x);
            let floor_y = i32(floor_pos.y);
            let floor_z = i32(floor_pos.z);
            let floor_w = i32(floor_pos.w);

            let x0 = (floor_x - 1) & 255;
            let x1 = floor_x & 255;
            let x2 = (floor_x + 1) & 255;
            let x3 = (floor_x + 2) & 255;

            var interpolated_z = array<f32, 4>(0, 0, 0, 0);

            for (var i = 0; i < 4; i++) {
                var interpolated_y = array<f32, 4>(0, 0, 0, 0);
                let wi = (floor_w - 1 + i) & 255;

                for (var j = 0; j < 4; j++) {
                    var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                    let zj = (floor_z - 1 + j) & 255;
                    
                    for (var k = 0; k < 4; k++) {
                        let yk = (floor_y - 1 + k) & 255;

                        interpolated_x[k] = ${interpolate}(
                            ${get_value}(x0, yk, zj, wi),
                            ${get_value}(x1, yk, zj, wi),
                            ${get_value}(x2, yk, zj, wi),
                            ${get_value}(x3, yk, zj, wi),
                            local_pos.x
                        );
                    }

                    interpolated_y[j] = ${interpolate}(
                        interpolated_x[0],
                        interpolated_x[1],
                        interpolated_x[2],
                        interpolated_x[3],
                        local_pos.y
                    );
                }

                interpolated_z[i] = ${interpolate}(
                    interpolated_y[0],
                    interpolated_y[1],
                    interpolated_y[2],
                    interpolated_y[3],
                    local_pos.z
                );
            }

            let n = ${interpolate}(
                interpolated_z[0],
                interpolated_z[1],
                interpolated_z[2],
                interpolated_z[3],
                local_pos.w
            );
            return clamp((n - ${NORM_MIN}) * ${NORM_DIFF}, 0, 1);
        }
    `
}
