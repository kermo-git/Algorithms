import { parseHexColor } from '@/utils/Colors'
import { WG_DIM } from './ShaderUtils'

export interface ShaderBindIndexes {
    bindGroup: number
    bindingStart: number
}

export const defaultColorPoints = new Float32Array([1, 1, 1, 0, 0, 0, 0, 1])

export interface NoiseUniforms {
    n_grid_columns: number | null
    z_coord: number | null
    color_points: Float32Array<ArrayBuffer> | null
}

export function shaderHashTable(n: number = 256) {
    const hash_table = new Int32Array(2 * n)

    for (let i = 0; i < n; i++) {
        hash_table[i] = i
    }
    for (let i = 0; i < 256; i++) {
        const temp = hash_table[i]
        const swap_index = Math.floor(Math.random() * n)
        hash_table[i] = hash_table[swap_index]
        hash_table[swap_index] = temp
    }
    for (let i = 0; i < n; i++) {
        hash_table[n + i] = hash_table[i]
    }
    return hash_table
}

export function shaderRandomPoints2D(n: number = 256) {
    const array = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const offset = 2 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
    }
    return array
}

export function shaderRandomPoints3D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const offset = 4 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
        array[offset + 2] = Math.random()
    }
    return array
}

export function shaderUnitVectors2D(n: number = 256) {
    const array = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const phi = (2 * Math.PI * i) / n
        const x = Math.cos(phi)
        const y = Math.sin(phi)

        const offset = 2 * i
        array[offset] = x
        array[offset + 1] = y
    }
    return array
}

export function shaderUnitVectors3D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const phi = 2 * Math.PI * Math.random()
        const theta = Math.PI * Math.random()

        const sin_phi = Math.sin(phi)
        const cos_phi = Math.cos(phi)
        const sin_theta = Math.sin(theta)
        const cos_theta = Math.cos(theta)

        const x = sin_theta * cos_phi
        const y = sin_theta * sin_phi
        const z = cos_theta

        const offset = 4 * i
        array[offset] = x
        array[offset + 1] = y
        array[offset + 2] = z
    }
    return array
}

export function noiseShader(is_3D: boolean, color_format: GPUTextureFormat): string {
    const only_2D = is_3D ? '//' : ''
    const only_3D = is_3D ? '' : '//'
    const vec_type = is_3D ? 'vec3f' : 'vec2f'

    return /* wgsl */ `
        // Define the noise function here:
        // fn noise(pos: vec2f) -> f32 { ... } (2D noise)
        // fn noise(pos: vec3f) -> f32 { ... } (3D noise)

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(0) var<uniform> n_grid_columns: f32;
        ${only_3D} @group(1) @binding(1) var<uniform> z_coordinate: f32;
        @group(2) @binding(0) var<storage> color_points: array<vec4f>;

        fn find_noise_pos(texture_pos: vec2f, texture_dims: vec2f) -> ${vec_type} {
            let n_grid_rows = n_grid_columns * texture_dims.y / texture_dims.x;
            let grid_dims = vec2f(n_grid_columns, n_grid_rows);

            ${only_2D} return grid_dims * texture_pos / texture_dims;

            ${only_3D} let noise_pos_2d = grid_dims * texture_pos / texture_dims;
            ${only_3D} return vec3f(noise_pos_2d, z_coordinate);
        }

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
            let noise_value = noise(noise_pos);

            textureStore(
                texture, texture_pos, 
                interpolate_colors(noise_value)
            );
        }
    `
}
