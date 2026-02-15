import { type NoiseTransformNames, type VecType } from './Types'

function randStrFloat(min: number, max: number) {
    return (min + (max - min) * Math.random()).toFixed(2)
}

export function randVec(vec_type: VecType, min = 10, max = 30) {
    if (vec_type === 'vec2f') {
        return `vec2f(${randStrFloat(min, max)}, ${randStrFloat(min, max)})`
    }
    return `vec3f(${randStrFloat(min, max)}, ${randStrFloat(min, max)}, ${randStrFloat(min, max)})`
}

export const findGridPosShader = /* wgsl */ `
    fn find_grid_pos(texture_pos: vec2u, texture_dims: vec2u, n_grid_columns: f32) -> vec2f {
        let texture_dims_f = vec2f(texture_dims);
        let n_grid_rows = n_grid_columns * texture_dims_f.y / texture_dims_f.x;
        let grid_dims = vec2f(n_grid_columns, n_grid_rows);
        return grid_dims * vec2f(texture_pos) / texture_dims_f;
    }
`

// https://iquilezles.org/articles/fbm/

export function octaveNoiseShader({ func_name, noise_name, pos_type }: NoiseTransformNames) {
    return /* wgsl */ `
        fn ${func_name}(noise_pos: ${pos_type}, n_octaves: u32, persistence: f32) -> f32 {
            var noise_value: f32 = noise(noise_pos);
            var min_noise_value: f32 = 0;
            var max_noise_value: f32 = 1;

            var frequency: f32 = 2;
            var amplitude: f32 = persistence;

            for (var i = 1u; i < n_octaves; i++) {
                noise_value += amplitude * ${noise_name}(noise_pos * frequency);
                min_noise_value += amplitude * 0.4;
                max_noise_value += amplitude * 0.6;

                frequency *= 2;
                amplitude *= persistence;
            }
            return (noise_value - min_noise_value) / (max_noise_value - min_noise_value);
        }
    `
}

export const unitVector2DShader = /* wgsl */ `
    fn unit_vector_2d(noise_value: f32) -> vec2f {
        const full_circle = 2 * radians(180.0);
        let phi = full_circle * noise_value;
        return vec2f(cos(phi), sin(phi));
    }
`

export const unitVector3DShader = /* wgsl */ `
    fn unit_vector_3d(phi_noise: f32, theta_noise: f32) -> vec3f {
        const PI = radians(180.0);
        const full_circle = 2 * PI;

        let phi = full_circle * phi_noise;
        let theta = PI * theta_noise;
        let sin_theta = sin(theta);

        return vec3f(
            sin_theta * cos(phi),
            sin_theta * sin(phi),
            cos(theta)
        );
    }
`

// https://noiseposti.ng/posts/2022-01-16-The-Perlin-Problem-Moving-Past-Square-Noise.html

export const rotate3DShader = /* wgsl */ `
    fn rotate(pos: vec3f) -> vec3f {
        let xz = pos.x + pos.z;
        let s2 = xz * -0.211324865405187;
        let yy = pos.y * 0.577350269189626;
        let xr = pos.x + (s2 + yy);
        let zr = pos.z + (s2 + yy);
        let yr = xz * -0.577350269189626 + yy;
        return vec3f(xr, yr, zr);
    }
`

export const rotate4DShader = /* wgsl */ `
    fn rotate(pos: vec4f) -> vec4f {
        let xyz = pos.x + pos.y + pos.z;
        let s3 = xyz * (-1.0 / 6.0);
        let ww = pos.w * 0.5;

        let xr = pos.x + s3 + ww;
        let yr = pos.y + s3 + ww;
        let zr = pos.z + s3 + ww;
        let wr = xyz * -0.5 + ww;

        return vec4f(xr, yr, zr, wr);
    }
`

export const interpolateColorShader = /* wgsl */ `
    fn interpolate_color(noise_value: f32) -> vec4f {
        let n_colors = arrayLength(&color_points);

        if noise_value <= color_points[0].w {
            return vec4f(color_points[0].xyz, 1);
        } else if noise_value > color_points[n_colors - 1].w {
            return vec4f(color_points[n_colors - 1].xyz, 1);
        } else {
            var prev_color = color_points[0].xyz;
            var prev_point = color_points[0].w;

            for (var i = 1u; i < n_colors; i++) {
                var current_color = color_points[i].xyz;
                var current_point = color_points[i].w;

                if noise_value <= current_point {
                    let blend_factor = (noise_value - prev_point) / (current_point - prev_point);
                    let color = mix(prev_color, current_color, blend_factor);
                    return vec4f(color, 1);
                }
                prev_color = current_color;
                prev_point = current_point;
            }
        }
        return vec4f(vec3f(noise_value), 1);
    }
`
