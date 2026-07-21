import { WG_DIM } from '@/WebGPU/Engine'
import {
    rotate3DShader,
    rotate4DShader,
    octaveNoiseShader,
    unitVector2DShader,
    unitVector3DShader,
} from '@/Noise/ShaderUtils'
import type { NoiseAlgorithm } from '@/Noise/Types'

export type DomainTransform = 'None' | 'Rotate' | 'Warp' | 'Warp 2X'

export interface Setup {
    algorithm: NoiseAlgorithm
    transform: DomainTransform
    n_grid_columns?: number
    n_main_octaves?: number
    persistence?: number
    z_coord?: number
    w_coord?: number
    n_warp_octaves?: number
    warp_strength?: number
    colors?: string[]
    color_points?: number[]
}

function warp2DShader() {
    return /* wgsl */ `
        ${unitVector2DShader}

        fn warp_noise(noise_pos: vec2f, warp_strength: f32, 
                      n_warp_octaves: u32, n_main_octaves: u32, 
                      persistence: f32) -> f32 {

            const warp_channel = main_channel + 1u;

            let warp_noise_value = octave_noise(noise_pos, warp_channel, n_warp_octaves, persistence);
            let final_pos = noise_pos + warp_strength * unit_vector_2d(warp_noise_value);
            return octave_noise(final_pos, main_channel, n_main_octaves, persistence);
        }
    `
}

function warp3DShader() {
    return /* wgsl */ `
        ${unitVector3DShader}

        fn warp_noise(noise_pos: vec3f, warp_strength: f32, 
                      n_warp_octaves: u32, n_main_octaves: u32, 
                      persistence: f32) -> f32 {

            const phi_channel = main_channel + 1u;
            const theta_channel = main_channel + 2u;

            let phi_noise = octave_noise(noise_pos, phi_channel, n_warp_octaves, persistence);
            let theta_noise = octave_noise(noise_pos, theta_channel, n_warp_octaves, persistence);
            
            let final_pos = noise_pos + warp_strength * unit_vector_3d(phi_noise, theta_noise);
            return octave_noise(final_pos, main_channel, n_main_octaves, persistence);
        }
    `
}

function createNoiseFunctions({ algorithm, transform }: Setup) {
    let noise_functions = `
        const main_channel = bitcast<u32>(i32(${Date.now() >> 0}));

        ${algorithm.createShaderDependencies()}
        
        ${algorithm.createShader({
            name: 'noise',
            extraBufferName: 'noise_data',
        })}
        ${octaveNoiseShader({
            func_name: 'octave_noise',
            noise_name: 'noise',
            pos_type: algorithm.pos_type,
        })}
    `
    let noise_expr = ''

    if (transform === 'Rotate') {
        noise_expr = 'octave_noise(rotate(noise_pos), main_channel, n_main_octaves, persistence)'

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
        noise_expr = `octave_noise(noise_pos, main_channel, n_main_octaves, persistence)`
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
                let noise_pos = grid_dims * vec2f(canvas_pos) / canvas_dims_f;
            `
        case 'vec3f':
            return /* wgsl */ `
                let noise_pos_2D = grid_dims * vec2f(canvas_pos) / canvas_dims_f;
                let noise_pos = vec3f(noise_pos_2D, z_coordinate);
            `
        case 'vec4f':
            return /* wgsl */ `
                let noise_pos_2D = grid_dims * vec2f(canvas_pos) / canvas_dims_f;
                let noise_pos = vec4f(noise_pos_2D, z_coordinate, w_coordinate);
            `
    }
}

export default function createNoiseShader(
    setup: Setup,
    canvas_color_format: GPUTextureFormat,
): string {
    const { algorithm, transform } = setup
    const noise_data = algorithm.extra_data_type ? '' : '//'
    const not_2D = algorithm.pos_type !== 'vec2f' ? '' : '//'
    const only_4D = algorithm.pos_type === 'vec4f' ? '' : '//'
    const only_warp = transform.startsWith('Warp') ? '' : '//'

    const { noise_functions, noise_expr } = createNoiseFunctions(setup)

    return /* wgsl */ `
        @group(0) @binding(0) var canvas: texture_storage_2d<${canvas_color_format}, write>;
        
        @group(1) @binding(0) var<uniform> n_grid_columns: f32;
        @group(1) @binding(1) var<uniform> n_main_octaves: u32;
        @group(1) @binding(2) var<uniform> persistence: f32;
        
        ${noise_data} @group(1) @binding(3) var<storage> noise_data: ${algorithm.extra_data_type};
        ${not_2D} @group(1) @binding(4) var<uniform> z_coordinate: f32;
        ${only_4D} @group(1) @binding(5) var<uniform> w_coordinate: f32;
        ${only_warp} @group(1) @binding(6) var<uniform> n_warp_octaves: u32;
        ${only_warp} @group(1) @binding(7) var<uniform> warp_strength: f32;
        
        struct ColorPoint {
            color: vec3f,
            point: f32,
        };
        
        @group(2) @binding(0) var<storage> color_points: array<ColorPoint>;
        @group(2) @binding(1) var<uniform> n_colors: u32;

        ${noise_functions}

        fn interpolate_color(noise_value: f32) -> vec4f {
            if noise_value <= color_points[0].point {
                return vec4f(color_points[0].color, 1);
            } else if noise_value > color_points[n_colors - 1].point {
                return vec4f(color_points[n_colors - 1].color, 1);
            } else {
                var prev_color = color_points[0].color;
                var prev_point = color_points[0].point;

                for (var i = 1u; i < n_colors; i++) {
                    var current_color = color_points[i].color;
                    var current_point = color_points[i].point;

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
            let canvas_pos = gid.xy;
            let canvas_dims = textureDimensions(canvas);

            if (canvas_pos.x >= canvas_dims.x || canvas_pos.y >= canvas_dims.y) {
                return;
            }
            let canvas_dims_f = vec2f(canvas_dims);
            let n_grid_rows = n_grid_columns * canvas_dims_f.y / canvas_dims_f.x;
            let grid_dims = vec2f(n_grid_columns, n_grid_rows);
            
            ${noisePosCode(algorithm)}
            let noise_value = ${noise_expr};
            let color = interpolate_color(noise_value);

            textureStore(canvas, canvas_pos, color);
        }
    `
}
