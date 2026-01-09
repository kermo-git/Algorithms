function randStrFloat(max: number) {
    return (max * Math.random()).toFixed(2)
}

function randVec2f(max = 5) {
    return `vec2f(${randStrFloat(max)}, ${randStrFloat(max)})`
}

function randVec3f(max = 5) {
    return `vec3f(${randStrFloat(max)}, ${randStrFloat(max)}, ${randStrFloat(max)})`
}

// https://iquilezles.org/articles/fbm/

export function octave_noise_shader(pos_type: string) {
    return /* wgsl */ `
        fn octave_noise(noise_pos: ${pos_type}, n_octaves: u32) -> f32 {
            var noise_value: f32 = noise(noise_pos);
            var min_noise_value: f32 = 0;
            var max_noise_value: f32 = 1;

            var frequency: f32 = 2;
            var amplitude: f32 = 0.5;

            for (var i = 1u; i < n_octaves; i++) {
                noise_value += amplitude * noise(noise_pos * frequency);
                min_noise_value += amplitude * 0.4;
                max_noise_value += amplitude * 0.6;

                frequency *= 2;
                amplitude *= persistence;
            }
            return (noise_value - min_noise_value) / (max_noise_value - min_noise_value);
        }
    `
}

// https://noiseposti.ng/posts/2022-01-16-The-Perlin-Problem-Moving-Past-Square-Noise.html

export const rotate3D_shader = /* wgsl */ `
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

export const rotate4D_shader = /* wgsl */ `
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

// https://iquilezles.org/articles/warp/

export const warp2D_shader = /* wgsl */ `
    fn warp_noise(noise_pos: vec2f) -> f32 {
        let warp_x = noise_pos + ${randVec2f()};
        let warp_y = noise_pos + ${randVec2f()};

        let pos_q = vec2f(
            octave_noise(warp_x, n_warp_octaves),
            octave_noise(warp_y, n_warp_octaves)
        );
        let final_pos = noise_pos + warp_strength * pos_q;
        return octave_noise(final_pos, n_main_octaves);
    }
`

export const double_warp2D_shader = /* wgsl */ `
    fn warp_noise(noise_pos: vec2f) -> f32 {
        let warp_qx = noise_pos + ${randVec2f()};
        let warp_qy = noise_pos + ${randVec2f()};

        let pos_q = vec2f(
            octave_noise(warp_qx, n_warp_octaves),
            octave_noise(warp_qy, n_warp_octaves)
        );

        let warp_r = noise_pos + warp_strength * pos_q;
        let warp_rx = warp_r + ${randVec2f()};
        let warp_ry = warp_r + ${randVec2f()};

        let pos_r = vec2f(
            octave_noise(warp_rx, n_warp_octaves),
            octave_noise(warp_ry, n_warp_octaves)
        );
        let final_pos = noise_pos + warp_strength * pos_r;
        return octave_noise(final_pos, n_main_octaves);
    }
`

export const interpolate_colors_shader = /* wgsl */ `
    fn interpolate_colors(noise_value: f32) -> vec4f {
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

export const warp3D_shader = /* wgsl */ `
    fn warp_noise(noise_pos: vec3f) -> f32 {
        let warp_x = noise_pos + ${randVec3f()};
        let warp_y = noise_pos + ${randVec3f()};
        let warp_z = noise_pos + ${randVec3f()};

        let pos_q = vec3f(
            octave_noise(warp_x, n_warp_octaves),
            octave_noise(warp_y, n_warp_octaves),
            octave_noise(warp_z, n_warp_octaves)
        );
        let final_pos = noise_pos + warp_strength * pos_q;
        return octave_noise(final_pos, n_main_octaves);
    }
`

export const double_warp3D_shader = /* wgsl */ `
    fn warp_noise(noise_pos: vec3f) -> f32 {
        let warp_qx = noise_pos + ${randVec3f()};
        let warp_qy = noise_pos + ${randVec3f()};
        let warp_qz = noise_pos + ${randVec3f()};

        let pos_q = vec3f(
            octave_noise(warp_qx, n_warp_octaves),
            octave_noise(warp_qy, n_warp_octaves),
            octave_noise(warp_qz, n_warp_octaves)
        );

        let warp_r = noise_pos + warp_strength * pos_q;
        let warp_rx = warp_r + ${randVec3f()};
        let warp_ry = warp_r + ${randVec3f()};
        let warp_rz = warp_r + ${randVec3f()};

        let pos_r = vec3f(
            octave_noise(warp_rx, n_warp_octaves),
            octave_noise(warp_ry, n_warp_octaves),
            octave_noise(warp_rz, n_warp_octaves)
        );
        let final_pos = noise_pos + warp_strength * pos_r;
        return octave_noise(final_pos, n_main_octaves);
    }
`
