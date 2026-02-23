// Blog post: https://jobtalle.com/cubic_noise.html
// GitHub repo: https://github.com/jobtalle/CubicNoise

import type { Config, NoiseAlgorithm } from '../Types'

export const Cubic2D: NoiseAlgorithm = {
    pos_type: 'vec2f',
    createShader({ name, hash_table_size, n_channels }: Config) {
        const get_value = `${name}_value`
        const interpolate = `${name}_interpolate`

        return /* wgsl */ `
        fn ${get_value}(x: i32, y: i32, offset: i32) -> f32 {
            let hash = hash_table[offset + hash_table[offset + x] + y];
            return noise_features[hash].rand_point.x;
        }

        fn ${interpolate}(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        fn ${name}(global_pos: vec2f, channel: i32) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let floor_x = i32(floor_pos.x);
            let floor_y = i32(floor_pos.y);

            const HASH_MASK = ${hash_table_size - 1};
            let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});

            let x0 = (floor_x - 1) & HASH_MASK;
            let x1 = floor_x & HASH_MASK;
            let x2 = (floor_x + 1) & HASH_MASK;
            let x3 = (floor_x + 2) & HASH_MASK;
            
            var interpolated_x = array<f32, 4>(0, 0, 0, 0);

            for (var i = 0; i < 4; i++) {
                let yi = (floor_y - 1 + i) & HASH_MASK;

                interpolated_x[i] = ${interpolate}(
                    ${get_value}(x0, yi, hash_offset),
                    ${get_value}(x1, yi, hash_offset),
                    ${get_value}(x2, yi, hash_offset),
                    ${get_value}(x3, yi, hash_offset),
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
    createShader({ name, hash_table_size, n_channels }: Config) {
        const get_value = `${name}_value`
        const interpolate = `${name}_interpolate`

        return /* wgsl */ `
        fn ${get_value}(x: i32, y: i32, z: i32, offset: i32) -> f32 {
            let hash_x = hash_table[offset + x];
            let hash_y = hash_table[offset + hash_x + y];
            let hash_z = hash_table[offset + hash_y + z];
            return noise_features[hash_z].rand_point.x;
        }

        fn ${interpolate}(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        fn ${name}(global_pos: vec3f, channel: i32) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let floor_x = i32(floor_pos.x);
            let floor_y = i32(floor_pos.y);
            let floor_z = i32(floor_pos.z);

            const HASH_MASK = ${hash_table_size - 1};
            let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});

            let x0 = (floor_x - 1) & HASH_MASK;
            let x1 = floor_x & HASH_MASK;
            let x2 = (floor_x + 1) & HASH_MASK;
            let x3 = (floor_x + 2) & HASH_MASK;

            var interpolated_y = array<f32, 4>(0, 0, 0, 0);

            for (var i = 0; i < 4; i++) {
                var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                let zi = (floor_z - 1 + i) & HASH_MASK;
                
                for (var j = 0; j < 4; j++) {
                    let yj = (floor_y - 1 + j) & HASH_MASK;

                    interpolated_x[j] = ${interpolate}(
                        ${get_value}(x0, yj, zi, hash_offset),
                        ${get_value}(x1, yj, zi, hash_offset),
                        ${get_value}(x2, yj, zi, hash_offset),
                        ${get_value}(x3, yj, zi, hash_offset),
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
    createShader({ name, hash_table_size, n_channels }: Config) {
        const get_value = `${name}_value`
        const interpolate = `${name}_interpolate`

        return /* wgsl */ `
        fn ${get_value}(x: i32, y: i32, z: i32, w: i32, offset: i32) -> f32 {
            let hash_x = hash_table[offset + x];
            let hash_y = hash_table[offset + hash_x + y];
            let hash_z = hash_table[offset + hash_y + z];
            let hash_w = hash_table[offset + hash_z + w];
            return noise_features[hash_w].rand_point.x;
        }

        fn ${interpolate}(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }

        fn ${name}(global_pos: vec4f, channel: i32) -> f32 {
            let floor_pos = floor(global_pos);
            let local_pos = global_pos - floor_pos;

            let floor_x = i32(floor_pos.x);
            let floor_y = i32(floor_pos.y);
            let floor_z = i32(floor_pos.z);
            let floor_w = i32(floor_pos.w);

            const HASH_MASK = ${hash_table_size - 1};
            let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});

            let x0 = (floor_x - 1) & HASH_MASK;
            let x1 = floor_x & HASH_MASK;
            let x2 = (floor_x + 1) & HASH_MASK;
            let x3 = (floor_x + 2) & HASH_MASK;

            var interpolated_z = array<f32, 4>(0, 0, 0, 0);

            for (var i = 0; i < 4; i++) {
                var interpolated_y = array<f32, 4>(0, 0, 0, 0);
                let wi = (floor_w - 1 + i) & HASH_MASK;

                for (var j = 0; j < 4; j++) {
                    var interpolated_x = array<f32, 4>(0, 0, 0, 0);
                    let zj = (floor_z - 1 + j) & HASH_MASK;
                    
                    for (var k = 0; k < 4; k++) {
                        let yk = (floor_y - 1 + k) & HASH_MASK;

                        interpolated_x[k] = ${interpolate}(
                            ${get_value}(x0, yk, zj, wi, hash_offset),
                            ${get_value}(x1, yk, zj, wi, hash_offset),
                            ${get_value}(x2, yk, zj, wi, hash_offset),
                            ${get_value}(x3, yk, zj, wi, hash_offset),
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

            const NORM_MIN = -0.3;
            const NORM_MAX = 1.3;
            const NORM_DIFF = 1 / (NORM_MAX - NORM_MIN);

            return clamp((n - NORM_MIN) * NORM_DIFF, 0, 1);
        }
    `
    },
}
