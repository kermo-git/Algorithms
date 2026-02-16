import { WG_DIM, type FloatArray } from '@/WebGPU/Engine'
import {
    interpolateColorShader,
    findGridPosShader,
    rotate3DShader,
    octaveNoiseShader,
} from '@/Noise/ShaderUtils'
import type { NoiseAlgorithm } from '@/Noise/Types'
import { Value2D, Value3D } from '@/Noise/Algorithms/Value'
import { Perlin2D, Perlin3D } from '@/Noise/Algorithms/Perlin'
import { Simplex2D, Simplex3D } from '@/Noise/Algorithms/Simplex'
import { Cubic2D, Cubic3D } from '@/Noise/Algorithms/Cubic'
import { Worley2D, Worley3D } from '@/Noise/Algorithms/Worley'
import { Worley2nd2D, Worley2nd3D } from '@/Noise/Algorithms/Worley2nd'
import { unitVectors2D, unitVectors3D } from '@/Noise/SeedData'

export interface Setup {
    custom_noise_shader: string
    n_grid_columns: number
    z_coord: number
    color_points: FloatArray
}

export function calculateNoiseShader(custom_noise_shader: string): string {
    function createNoiseFunctions(algorithm: NoiseAlgorithm, name: string, features: string) {
        return `
            ${algorithm.createShader({
                hash_table: 'hash_table',
                features: features,
                noise: name,
            })}

            ${octaveNoiseShader({
                func_name: `${name}_octaves`,
                noise_name: name,
                pos_type: algorithm.pos_type,
            })}
        `
    }
    return /* wgsl */ `
        @group(1) @binding(0) var<uniform> n_grid_columns: f32;
        @group(1) @binding(1) var<uniform> z_coordinate: f32;

        @group(1) @binding(2) var<storage> hash_table: array<i32>;
        @group(1) @binding(3) var<storage> rand_values: array<i32>;
        @group(1) @binding(4) var<storage> rand_points_2d: array<vec2f>;
        @group(1) @binding(5) var<storage> rand_points_3d: array<vec3f>;
        @group(1) @binding(6) var<storage> unit_vectors_2d: array<vec2f>;
        @group(1) @binding(7) var<storage> unit_vectors_3d: array<vec2f>;
        @group(1) @binding(8) var<storage, read_write> output_buffer: array<f32>;
        
        @group(2) @binding(0) var<storage> color_points: array<vec4f>;

        ${unitVectors2D}
        ${unitVectors3D}

        ${rotate3DShader}

        ${createNoiseFunctions(Value2D, 'value_2d', 'rand_values')}
        ${createNoiseFunctions(Value3D, 'value_3d', 'rand_values')}

        ${createNoiseFunctions(Cubic2D, 'cubic_2d', 'rand_values')}
        ${createNoiseFunctions(Cubic3D, 'cubic_3d', 'rand_values')}

        ${createNoiseFunctions(Perlin2D, 'perlin_2d', 'unit_vectors_2d')}
        ${createNoiseFunctions(Perlin3D, 'perlin_3d', 'unit_vectors_3d')}

        ${createNoiseFunctions(Simplex2D, 'simplex_2d', 'unit_vectors_2d')}
        ${createNoiseFunctions(Simplex3D, 'simplex_3d', 'unit_vectors_3d')}

        ${createNoiseFunctions(Worley2D, 'worley_2d', 'rand_points_2d')}
        ${createNoiseFunctions(Worley3D, 'worley_3d', 'rand_points_3d')}

        ${createNoiseFunctions(Worley2nd2D, 'worley_2nd_2d', 'rand_points_2d')}
        ${createNoiseFunctions(Worley2nd3D, 'worley_2nd_3d', 'rand_points_3d')}

        ${findGridPosShader}

        ${custom_noise_shader}

        ${interpolateColorShader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let texture_pos = gid.xy;
            let texture_dims = textureDimensions(texture);

            if (texture_pos.x >= texture_dims.x || texture_pos.y >= texture_dims.y) {
                return;
            }
            let noise_pos_2D = find_grid_pos(texture_pos, texture_dims, n_grid_columns);
            let noise_pos = vec3f(noise_pos_2D, z_coordinate);
            let noise_value = noise(noise_pos);

            output_buffer[texture_pos.y * n_grid_cols + texture_pos.x] = noise_value;
        }
    `
}

export function flatDisplayShader(color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(8) var<storage, read> noise_buffer: array<f32>;
        @group(2) @binding(0) var<storage> color_points: array<vec4f>;

        ${interpolateColorShader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let texture_pos = gid.xy;
            let texture_dims = textureDimensions(texture);

            if (texture_pos.x >= texture_dims.x || texture_pos.y >= texture_dims.y) {
                return;
            }
            let noise_value = output_buffer[texture_pos.y * n_grid_cols + texture_pos.x];
            let color = interpolate_color(noise_value);
            textureStore(texture, texture_pos, color);
        }
    `
}
