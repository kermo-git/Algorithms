import { WG_DIM } from '../ShaderUtils'
import type { DomainTransform, NoiseDimension } from './NoiseScene'

function randStrFloat(max: number) {
    return (max * Math.random()).toFixed(2)
}

function randVec2f(max = 5) {
    return `vec2f(${randStrFloat(max)}, ${randStrFloat(max)})`
}

function randVec3f(max = 5) {
    return `vec3f(${randStrFloat(max)}, ${randStrFloat(max)}, ${randStrFloat(max)})`
}

function octave_noise_shader(pos_type: string) {
    return /* wgsl */ `
        fn octave_noise(noise_pos: ${pos_type}, n_octaves: u32) -> f32 {
            var amplitude: f32 = 1;
            var frequency: f32 = 1;
            var noise_value: f32 = 0;
            var max_noise_value: f32 = 0;

            for (var i = 0u; i < n_octaves; i++) {
                let scaled_pos = noise_pos * frequency;
                noise_value += amplitude * noise(scaled_pos);
                max_noise_value += amplitude;
                frequency *= 2;
                amplitude *= persistence;
            }
            return noise_value / max_noise_value;
        }
    `
}

const rotate3D_shader = /* wgsl */ `
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

const rotate4D_shader = /* wgsl */ `
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

const warp2D_shader = /* wgsl */ `
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

const double_warp2D_shader = /* wgsl */ `
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

const interpolate_colors_shader = /* wgsl */ `
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

const warp3D_shader = /* wgsl */ `
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

const double_warp3D_shader = /* wgsl */ `
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

export function noiseShader(
    dimension: NoiseDimension,
    transform: DomainTransform,
    color_format: GPUTextureFormat,
): string {
    const high_dim = dimension === '3D' || dimension == '4D' ? '' : '//'
    const only_4D = dimension === '4D' ? '' : '//'
    const only_warp = transform.startsWith('Warp') ? '' : '//'
    const pos_type = dimension === '2D' ? 'vec2f' : dimension === '3D' ? 'vec3f' : 'vec4f'

    let noise_pos_expr = 'noise_pos'
    let rotate_function = ''

    let main_noise_expr = 'octave_noise(noise_pos, n_main_octaves)'
    let warp_function = ''

    if (dimension === '3D') {
        noise_pos_expr = 'vec3f(noise_pos, z_coordinate)'
    } else if (dimension === '4D') {
        noise_pos_expr = 'vec4f(noise_pos, z_coordinate, w_coordinate)'
    }

    if (dimension !== '2D' && transform === 'Rotate') {
        noise_pos_expr = `rotate(${noise_pos_expr})`

        // https://noiseposti.ng/posts/2022-01-16-The-Perlin-Problem-Moving-Past-Square-Noise.html
        if (dimension === '3D') {
            rotate_function = rotate3D_shader
        } else if (dimension === '4D') {
            rotate_function = rotate4D_shader
        }
    } else if (dimension !== '4D' && transform === 'Warp') {
        main_noise_expr = 'warp_noise(noise_pos)'

        if (dimension === '2D') {
            warp_function = warp2D_shader
        } else if (dimension === '3D') {
            warp_function = warp3D_shader
        }
    } else if (dimension !== '4D' && transform === 'Warp 2X') {
        main_noise_expr = 'warp_noise(noise_pos)'

        if (dimension === '2D') {
            warp_function = double_warp2D_shader
        } else if (dimension === '3D') {
            warp_function = double_warp3D_shader
        }
    }

    return /* wgsl */ `
        // Define the noise function here:
        // fn noise(pos: vec2f) -> f32 { ... } (2D noise)
        // fn noise(pos: vec3f) -> f32 { ... } (3D noise)
        // fn noise(pos: vec4f) -> f32 { ... } (4D noise)

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(2) var<uniform> n_grid_columns: f32;
        @group(1) @binding(3) var<uniform> n_main_octaves: u32;
        @group(1) @binding(4) var<uniform> persistence: f32;
        ${high_dim} @group(1) @binding(5) var<uniform> z_coordinate: f32;
        ${only_4D} @group(1) @binding(6) var<uniform> w_coordinate: f32;
        ${only_warp} @group(1) @binding(7) var<uniform> n_warp_octaves: u32;
        ${only_warp} @group(1) @binding(8) var<uniform> warp_strength: f32;
        @group(2) @binding(0) var<storage> color_points: array<vec4f>;

        ${rotate_function}

        fn find_noise_pos(texture_pos: vec2f, texture_dims: vec2f) -> ${pos_type} {
            let n_grid_rows = n_grid_columns * texture_dims.y / texture_dims.x;
            let grid_dims = vec2f(n_grid_columns, n_grid_rows);
            let noise_pos = grid_dims * texture_pos / texture_dims;

            return ${noise_pos_expr};
        }
        
        ${octave_noise_shader(pos_type)}

        ${warp_function}

        ${interpolate_colors_shader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let texture_pos = gid.xy;
            let texture_dims = textureDimensions(texture);

            if (texture_pos.x >= texture_dims.x || texture_pos.y >= texture_dims.y) {
                return;
            }
            let noise_pos = find_noise_pos(vec2f(texture_pos), vec2f(texture_dims));
            let noise_value = ${main_noise_expr};
            let color = interpolate_colors(noise_value);

            textureStore(texture, texture_pos, color);
        }
    `
}
