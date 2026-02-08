import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import { WG_DIM } from '@/WebGPU/Engine'
import {
    interpolate_colors_shader,
    findGridPosShader,
    double_warp2D_shader,
    double_warp3D_shader,
    warp3D_shader,
    warp2D_shader,
    rotate4D_shader,
    rotate3D_shader,
    octaveNoiseShader,
    noiseFunctionShader,
} from '@/Noise/ShaderUtils'
import type { DomainTransform, NoiseAlgorithm, NoiseDimension } from '@/Noise/Types'

export interface Setup {
    algorithm: NoiseAlgorithm
    dimension: NoiseDimension
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

function enchancedNoiseShader({ algorithm, dimension, transform }: Setup) {
    let noise_functions = `
        ${noiseFunctionShader(algorithm, dimension)}
        ${octaveNoiseShader(dimension)}
    `
    let noise_expr = ''
    let pos_expr = 'noise_pos'

    if (transform === 'Rotate') {
        pos_expr = 'rotate(noise_pos)'

        if (dimension === '3D') {
            noise_functions = `
                ${noise_functions}
                ${rotate3D_shader}
            `
        } else if (dimension === '4D') {
            noise_functions = `
                ${noise_functions}
                ${rotate4D_shader}
            `
        }
    }
    if (transform === 'Warp') {
        if (dimension === '2D') {
            noise_functions = `
                ${noise_functions}
                ${warp2D_shader}
            `
        } else if (dimension === '3D') {
            noise_functions = `
                ${noise_functions}
                ${warp3D_shader}
            `
        }
        noise_expr = `warp_noise(
            ${pos_expr}, warp_strength, n_warp_octaves, 
            n_main_octaves, persistence
        )`
    } else if (transform === 'Warp 2X') {
        if (dimension === '2D') {
            noise_functions = `
                ${noise_functions}
                ${double_warp2D_shader}
            `
        } else if (dimension === '3D') {
            noise_functions = `
                ${noise_functions}
                ${double_warp3D_shader}
            `
        }
        noise_expr = `warp_noise(
            ${pos_expr}, warp_strength, n_warp_octaves, 
            n_main_octaves, persistence
        )`
    } else {
        noise_expr = `octave_noise(${pos_expr}, n_main_octaves, persistence)`
    }
    return {
        noise_functions,
        noise_expr,
    }
}

function noisePosCode(dimension: NoiseDimension) {
    switch (dimension) {
        case '2D':
            return /* wgsl */ `
                let noise_pos = find_grid_pos(texture_pos, texture_dims, n_grid_columns);
            `
        case '3D':
            return /* wgsl */ `
                let noise_pos_2D = find_grid_pos(texture_pos, texture_dims, n_grid_columns);
                let noise_pos = vec3f(noise_pos_2D, z_coordinate);
            `
        case '4D':
            return /* wgsl */ `
                let noise_pos_2D = find_grid_pos(texture_pos, texture_dims, n_grid_columns);
                let noise_pos = vec4f(noise_pos_2D, z_coordinate, w_coordinate);
            `
    }
}

export default function createShader(setup: Setup, color_format: GPUTextureFormat): string {
    const { dimension, transform } = setup
    const not_2D = dimension !== '2D' ? '' : '//'
    const only_4D = dimension === '4D' ? '' : '//'
    const only_warp = transform.startsWith('Warp') ? '' : '//'

    const { noise_functions, noise_expr } = enchancedNoiseShader(setup)

    return /* wgsl */ `
        // Define the noise function here:
        // fn noise(pos: vec2f) -> f32 { ... } (2D noise)
        // fn noise(pos: vec3f) -> f32 { ... } (3D noise)
        // fn noise(pos: vec4f) -> f32 { ... } (4D noise)

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
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
            ${noisePosCode(dimension)}
            let noise_value = ${noise_expr};
            let color = interpolate_colors(noise_value);

            textureStore(texture, texture_pos, color);
        }
    `
}
