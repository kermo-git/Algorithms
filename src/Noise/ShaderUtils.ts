import { cubic2DShader, cubic3DShader, cubic4DShader } from './Algorithms/Cubic'
import { perlin2DShader, perlin3DShader, perlin4DShader } from './Algorithms/Perlin'
import { simplex2DShader, simplex3DShader, simplex4DShader } from './Algorithms/Simplex'
import { value2DShader, value3DShader, value4DShader } from './Algorithms/Value'
import { worley2DShader, worley3DShader, worley4DShader } from './Algorithms/Worley'
import {
    shaderRandomPoints2D,
    shaderRandomPoints3D,
    shaderRandomPoints4D,
    shaderUnitVectors2D,
    shaderUnitVectors3D,
    shaderUnitVectors4D,
} from './Buffers'
import type { NoiseAlgorithm, NoiseDimension } from './Types'

function randStrFloat(min: number, max: number) {
    return (min + (max - min) * Math.random()).toFixed(2)
}

export function randVec(dimension: NoiseDimension, min = 10, max = 30) {
    if (dimension === '2D') {
        return `vec2f(${randStrFloat(min, max)}, ${randStrFloat(min, max)})`
    }
    return `vec3f(${randStrFloat(min, max)}, ${randStrFloat(min, max)}, ${randStrFloat(min, max)})`
}

// https://iquilezles.org/articles/fbm/

export function octaveNoiseShader(dimension: NoiseDimension) {
    const pos_type = shaderVecType(dimension)

    return /* wgsl */ `
        fn octave_noise(noise_pos: ${pos_type}, n_octaves: u32, persistence: f32) -> f32 {
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
    fn warp_noise(noise_pos: vec2f, warp_strength: f32, 
                  n_warp_octaves: u32, n_main_octaves: u32, 
                  persistence: f32) -> f32 {
        
        let warp_x = noise_pos + ${randVec('2D')};
        let warp_y = noise_pos + ${randVec('2D')};

        let pos_q = vec2f(
            octave_noise(warp_x, n_warp_octaves, persistence),
            octave_noise(warp_y, n_warp_octaves, persistence)
        );
        let final_pos = noise_pos + warp_strength * pos_q;
        return octave_noise(final_pos, n_main_octaves, persistence);
    }
`

export const double_warp2D_shader = /* wgsl */ `
    fn warp_noise(noise_pos: vec2f, warp_strength: f32, 
                  n_warp_octaves: u32, n_main_octaves: u32, 
                  persistence: f32) -> f32 {
        
        let warp_qx = noise_pos + ${randVec('2D')};
        let warp_qy = noise_pos + ${randVec('2D')};

        let pos_q = vec2f(
            octave_noise(warp_qx, n_warp_octaves, persistence),
            octave_noise(warp_qy, n_warp_octaves, persistence)
        );

        let warp_r = noise_pos + warp_strength * pos_q;
        let warp_rx = warp_r + ${randVec('2D')};
        let warp_ry = warp_r + ${randVec('2D')};

        let pos_r = vec2f(
            octave_noise(warp_rx, n_warp_octaves, persistence),
            octave_noise(warp_ry, n_warp_octaves, persistence)
        );
        let final_pos = noise_pos + warp_strength * pos_r;
        return octave_noise(final_pos, n_main_octaves, persistence);
    }
`

export const warp3D_shader = /* wgsl */ `
    fn warp_noise(noise_pos: vec3f, warp_strength: f32, 
                  n_warp_octaves: u32, n_main_octaves: u32, 
                  persistence: f32) -> f32 {
        
        let warp_x = noise_pos + ${randVec('3D')};
        let warp_y = noise_pos + ${randVec('3D')};
        let warp_z = noise_pos + ${randVec('3D')};

        let pos_q = vec3f(
            octave_noise(warp_x, n_warp_octaves, persistence),
            octave_noise(warp_y, n_warp_octaves, persistence),
            octave_noise(warp_z, n_warp_octaves, persistence)
        );
        let final_pos = noise_pos + warp_strength * pos_q;
        return octave_noise(final_pos, n_main_octaves, persistence);
    }
`

export const double_warp3D_shader = /* wgsl */ `
    fn warp_noise(noise_pos: vec3f, warp_strength: f32, 
                  n_warp_octaves: u32, n_main_octaves: u32, 
                  persistence: f32) -> f32 {
        
        let warp_qx = noise_pos + ${randVec('3D')};
        let warp_qy = noise_pos + ${randVec('3D')};
        let warp_qz = noise_pos + ${randVec('3D')};

        let pos_q = vec3f(
            octave_noise(warp_qx, n_warp_octaves, persistence),
            octave_noise(warp_qy, n_warp_octaves, persistence),
            octave_noise(warp_qz, n_warp_octaves, persistence)
        );

        let warp_r = noise_pos + warp_strength * pos_q;
        let warp_rx = warp_r + ${randVec('3D')};
        let warp_ry = warp_r + ${randVec('3D')};
        let warp_rz = warp_r + ${randVec('3D')};

        let pos_r = vec3f(
            octave_noise(warp_rx, n_warp_octaves, persistence),
            octave_noise(warp_ry, n_warp_octaves, persistence),
            octave_noise(warp_rz, n_warp_octaves, persistence)
        );
        let final_pos = noise_pos + warp_strength * pos_r;
        return octave_noise(final_pos, n_main_octaves, persistence);
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

export function getNoiseShaderRandomElements(
    algorithm: NoiseAlgorithm,
    dimension: NoiseDimension,
    n_random_elements: number,
) {
    if (algorithm === 'Perlin' || algorithm === 'Simplex') {
        switch (dimension) {
            case '2D':
                return shaderUnitVectors2D(n_random_elements)
            case '3D':
                return shaderUnitVectors3D(n_random_elements)
            case '4D':
                return shaderUnitVectors4D(n_random_elements)
        }
    } else if (algorithm === 'Worley' || algorithm === 'Worley (2nd closest)') {
        switch (dimension) {
            case '2D':
                return shaderRandomPoints2D(n_random_elements)
            case '3D':
                return shaderRandomPoints3D(n_random_elements)
            case '4D':
                return shaderRandomPoints4D(n_random_elements)
        }
    } else {
        return new Float32Array(n_random_elements).map(Math.random)
    }
}

export function noiseFunctionShader(algorithm: NoiseAlgorithm, dimension: NoiseDimension) {
    switch (algorithm) {
        case 'Perlin':
            switch (dimension) {
                case '2D':
                    return perlin2DShader()
                case '3D':
                    return perlin3DShader()
                case '4D':
                    return perlin4DShader()
            }
        case 'Simplex':
            switch (dimension) {
                case '2D':
                    return simplex2DShader()
                case '3D':
                    return simplex3DShader()
                case '4D':
                    return simplex4DShader()
            }
        case 'Cubic':
            switch (dimension) {
                case '2D':
                    return cubic2DShader()
                case '3D':
                    return cubic3DShader()
                case '4D':
                    return cubic4DShader()
            }
        case 'Value':
            switch (dimension) {
                case '2D':
                    return value2DShader()
                case '3D':
                    return value3DShader()
                case '4D':
                    return value4DShader()
            }
        case 'Worley':
            switch (dimension) {
                case '2D':
                    return worley2DShader(false)
                case '3D':
                    return worley3DShader(false)
                case '4D':
                    return worley4DShader(false)
            }
        case 'Worley (2nd closest)':
            switch (dimension) {
                case '2D':
                    return worley2DShader(true)
                case '3D':
                    return worley3DShader(true)
                case '4D':
                    return worley4DShader(true)
            }
    }
}

export function shaderVecType(dimension: NoiseDimension) {
    return dimension === '2D' ? 'vec2f' : dimension === '3D' ? 'vec3f' : 'vec4f'
}

export const findGridPosShader = /* wgsl */ `
    fn find_grid_pos(texture_pos: vec2u, texture_dims: vec2u, n_grid_columns: f32) -> vec2f {
        let texture_dims_f = vec2f(texture_dims);
        let n_grid_rows = n_grid_columns * texture_dims_f.y / texture_dims_f.x;
        let grid_dims = vec2f(n_grid_columns, n_grid_rows);
        return grid_dims * vec2f(texture_pos) / texture_dims_f;
    }
`
