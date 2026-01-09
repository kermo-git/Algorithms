// Blog post: https://jobtalle.com/cubic_noise.html
// GitHub repo: https://github.com/jobtalle/CubicNoise

import { NoiseScene, type DomainTransform } from '../NoiseUtils/NoiseScene'

export function cubic2DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> values: array<f32>;

        fn get_value(x: i32, y: i32) -> f32 {
            let hash = hash_table[hash_table[x] + y];
            return values[hash];
        }

        fn interpolate(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        const NORM_MIN = -0.3;
        const NORM_MAX = 1.3;
        const NORM_DIFF = NORM_MAX - NORM_MIN;

        fn noise(global_pos: vec2f) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let x1 = i32(floor_pos.x) & 255;
            let x0 = (x1 - 1) & 255;
            let x2 = (x1 + 1) & 255;
            let x3 = (x1 + 2) & 255;
            
            let y1 = i32(floor_pos.y) & 255;
            let y0 = i32(y1 - 1) & 255;
            let y2 = i32(y1 + 1) & 255;
            let y3 = i32(y1 + 2) & 255;

            let n = interpolate(
                interpolate(
                    get_value(x0, y0),
                    get_value(x1, y0),
                    get_value(x2, y0),
                    get_value(x3, y0),
                    local_pos.x
                ),
                interpolate(
                    get_value(x0, y1),
                    get_value(x1, y1),
                    get_value(x2, y1),
                    get_value(x3, y1),
                    local_pos.x
                ),
                interpolate(
                    get_value(x0, y2),
                    get_value(x1, y2),
                    get_value(x2, y2),
                    get_value(x3, y2),
                    local_pos.x
                ),
                interpolate(
                    get_value(x0, y3),
                    get_value(x1, y3),
                    get_value(x2, y3),
                    get_value(x3, y3),
                    local_pos.x
                ),
                local_pos.y
            );
            return clamp((n - NORM_MIN) / NORM_DIFF, 0, 1);
        }
    `
}

export function cubic3DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> values: array<f32>;

        fn get_value(x: i32, y: i32, z: i32) -> f32 {
            let hash = hash_table[hash_table[hash_table[x] + y] + z];
            return values[hash];
        }

        fn interpolate(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        const NORM_MIN = -0.3;
        const NORM_MAX = 1.3;
        const NORM_DIFF = NORM_MAX - NORM_MIN;

        fn noise(global_pos: vec3f) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let x1 = i32(floor_pos.x) & 255;
            let y1 = i32(floor_pos.y) & 255;
            let z1 = i32(floor_pos.z) & 255;

            let x0 = x1 - 1;
            let x2 = x1 + 1;
            let x3 = x1 + 2;

            var interpolated_z = array<f32, 4>(0, 0, 0, 0);

            for (var i = 0; i < 4; i++) {
                var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                let yi = y1 - 1 + i;

                for (var j = 0; j < 4; j++) {
                    let zj = z1 - 1 + j;

                    interpolated_x[j] = interpolate(
                        get_value(x0, yi, zj),
                        get_value(x1, yi, zj),
                        get_value(x2, yi, zj),
                        get_value(x3, yi, zj),
                        local_pos.x
                    );
                }
                interpolated_z[i] = interpolate(
                    interpolated_x[0],
                    interpolated_x[1],
                    interpolated_x[2],
                    interpolated_x[3],
                    local_pos.z
                );
            }

            let n = interpolate(
                interpolated_z[0],
                interpolated_z[1],
                interpolated_z[2],
                interpolated_z[3],
                local_pos.y
            );
            return clamp((n - NORM_MIN) / NORM_DIFF, 0, 1);
        }
    `
}

export function cubic4DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> values: array<f32>;

        fn get_value(x: i32, y: i32, z: i32, w: i32) -> f32 {
            let hash = hash_table[hash_table[hash_table[hash_table[x] + y] + z] + w];
            return values[hash];
        }

        fn interpolate(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        const NORM_MIN = -0.3;
        const NORM_MAX = 1.3;
        const NORM_DIFF = NORM_MAX - NORM_MIN;

        fn noise(global_pos: vec4f) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let x1 = i32(floor_pos.x) & 255;
            let y1 = i32(floor_pos.y) & 255;
            let z1 = i32(floor_pos.z) & 255;
            let w1 = i32(floor_pos.w) & 255;

            let x0 = x1 - 1;
            let x2 = x1 + 1;
            let x3 = x1 + 2;

            var interpolated_y = array<f32, 4>(0, 0, 0, 0);

            for (var k = 0; k < 4; k++) {
                var interpolated_z = array<f32, 4>(0, 0, 0, 0);
                let wk = w1 - 1 + k;

                for (var i = 0; i < 4; i++) {
                    var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                    let yi = y1 - 1 + i;

                    for (var j = 0; j < 4; j++) {
                        let zj = z1 - 1 + j;

                        interpolated_x[j] = interpolate(
                            get_value(x0, yi, zj, wk),
                            get_value(x1, yi, zj, wk),
                            get_value(x2, yi, zj, wk),
                            get_value(x3, yi, zj, wk),
                            local_pos.x
                        );
                    }
                    interpolated_z[i] = interpolate(
                        interpolated_x[0],
                        interpolated_x[1],
                        interpolated_x[2],
                        interpolated_x[3],
                        local_pos.z
                    );
                }

                interpolated_y[k] = interpolate(
                    interpolated_z[0],
                    interpolated_z[1],
                    interpolated_z[2],
                    interpolated_z[3],
                    local_pos.y
                );
            }
            let n = interpolate(
                interpolated_y[0],
                interpolated_y[1],
                interpolated_y[2],
                interpolated_y[3],
                local_pos.w
            );
            return clamp((n - NORM_MIN) / NORM_DIFF, 0, 1);
        }
    `
}
