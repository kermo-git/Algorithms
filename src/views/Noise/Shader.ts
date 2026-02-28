import { WG_DIM, type FloatArray } from '@/WebGPU/Engine'
import {
    interpolateColorShader,
    findGridPosShader,
    rotate3DShader,
    rotate4DShader,
    octaveNoiseShader,
    randVec,
    unitVector2DShader,
    unitVector3DShader,
} from '@/Noise/ShaderUtils'
import type { NoiseAlgorithm } from '@/Noise/Types'
import { noiseFeatureShader } from '@/Noise/SeedData'

export type DomainTransform = 'None' | 'Rotate' | 'Warp' | 'Warp 2X'

export interface Setup {
    algorithm: NoiseAlgorithm
    transform: DomainTransform
}

export interface NoiseUniforms {
    n_grid_columns?: number
    n_main_octaves?: number
    persistence?: number
    z_coord?: number
    w_coord?: number
    n_warp_octaves?: number
    warp_strength?: number
    color_points?: FloatArray
}

function warp2DShader() {
    return /* wgsl */ `
        ${unitVector2DShader}

        fn warp_noise(noise_pos: vec2f, warp_strength: f32, 
                      n_warp_octaves: u32, n_main_octaves: u32, 
                      persistence: f32) -> f32 {

            let warp_noise_value = octave_noise(noise_pos, 0, n_warp_octaves, persistence);
            let final_pos = noise_pos + warp_strength * unit_vector_2d(warp_noise_value);
            return octave_noise(final_pos, 1, n_main_octaves, persistence);
        }
    `
}

function warp3DShader() {
    return /* wgsl */ `
        ${unitVector3DShader}

        fn warp_noise(noise_pos: vec3f, warp_strength: f32, 
                      n_warp_octaves: u32, n_main_octaves: u32, 
                      persistence: f32) -> f32 {

            let phi_noise = octave_noise(noise_pos, 0, n_warp_octaves, persistence);
            let theta_noise = octave_noise(noise_pos, 1, n_warp_octaves, persistence);
            
            let final_pos = noise_pos + warp_strength * unit_vector_3d(phi_noise, theta_noise);
            return octave_noise(final_pos, 2, n_main_octaves, persistence);
        }
    `
}

function createNoiseFunctions({ algorithm, transform }: Setup) {
    let noise_functions = `
        ${algorithm.createShaderDependencies()}
        
        ${algorithm.createShader({
            name: 'noise',
            hash_table_size: 256,
            n_channels: 8,
        })}
        ${octaveNoiseShader({
            func_name: 'octave_noise',
            noise_name: 'noise',
            pos_type: algorithm.pos_type,
        })}
    `
    let noise_expr = ''

    if (transform === 'Rotate') {
        noise_expr = 'octave_noise(rotate(noise_pos), 0, n_main_octaves, persistence)'

        if (algorithm.pos_type === 'vec3f') {
            noise_functions = `
                ${noise_functions}
                ${rotate3DShader}
            `
        } else if (algorithm.pos_type === 'vec4f') {
            noise_functions = `
                ${noise_functions}
                ${rotate4DShader}
            `
        }
    } else if (transform === 'Warp') {
        if (algorithm.pos_type === 'vec2f') {
            noise_functions = `
                ${noise_functions}
                ${warp2DShader()}
            `
        } else if (algorithm.pos_type === 'vec3f') {
            noise_functions = `
                ${noise_functions}
                ${warp3DShader()}
            `
        }
        noise_expr = `warp_noise(
            noise_pos, warp_strength, n_warp_octaves, 
            n_main_octaves, persistence
        )`
    } else {
        noise_expr = `octave_noise(noise_pos, 0, n_main_octaves, persistence)`
    }
    return {
        noise_functions,
        noise_expr,
    }
}

function noisePosCode(algorithm: NoiseAlgorithm) {
    switch (algorithm.pos_type) {
        case 'vec2f':
            return /* wgsl */ `
                let noise_pos = find_grid_pos(texture_pos, texture_dims, n_grid_columns);
            `
        case 'vec3f':
            return /* wgsl */ `
                let noise_pos_2D = find_grid_pos(texture_pos, texture_dims, n_grid_columns);
                let noise_pos = vec3f(noise_pos_2D, z_coordinate);
            `
        case 'vec4f':
            return /* wgsl */ `
                let noise_pos_2D = find_grid_pos(texture_pos, texture_dims, n_grid_columns);
                let noise_pos = vec4f(noise_pos_2D, z_coordinate, w_coordinate);
            `
    }
}

export default function createNoiseShader(setup: Setup, color_format: GPUTextureFormat): string {
    const { algorithm, transform } = setup
    const not_2D = algorithm.pos_type !== 'vec2f' ? '' : '//'
    const only_4D = algorithm.pos_type === 'vec4f' ? '' : '//'
    const only_warp = transform.startsWith('Warp') ? '' : '//'

    const { noise_functions, noise_expr } = createNoiseFunctions(setup)

    return /* wgsl */ `
        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;

        ${noiseFeatureShader}

        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> noise_features: array<NoiseFeature>;
        @group(1) @binding(2) var<uniform> n_grid_columns: f32;
        @group(1) @binding(3) var<uniform> n_main_octaves: u32;
        @group(1) @binding(4) var<uniform> persistence: f32;

        ${not_2D} @group(1) @binding(5) var<uniform> z_coordinate: f32;
        ${only_4D} @group(1) @binding(6) var<uniform> w_coordinate: f32;
        ${only_warp} @group(1) @binding(7) var<uniform> n_warp_octaves: u32;
        ${only_warp} @group(1) @binding(8) var<uniform> warp_strength: f32;
        
        @group(2) @binding(0) var<storage> color_points: array<vec4f>;

        ${findGridPosShader}

        ${noise_functions}

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
            ${noisePosCode(algorithm)}
            let noise_value = ${noise_expr};
            let color = interpolate_color(noise_value);

            textureStore(texture, texture_pos, color);
        }
    `
}
