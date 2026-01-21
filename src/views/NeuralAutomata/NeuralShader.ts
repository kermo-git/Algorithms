import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import { WG_DIM } from '@/WebGPU/ComputeRenderer'

export type Activation = 'Discrete' | 'Sigmoid'

export interface NeuralUniforms {
    kernel_size: number
    kernel: FloatArray
    color_1: FloatArray
    color_2: FloatArray
}

function activationShader(activation: Activation): string {
    if (activation === 'Discrete') {
        return /* wgsl */ `
            fn activate(x: f32) -> f32 {
                return select(0, 1, x > 0);
            }
        `
    } else {
        return /* wgsl */ `
            fn activate(x: f32) -> f32 {
                let exp_x = exp(x);
                return exp_x / (exp_x + 1);
            }
        `
    }
}

export default function neuralShader(
    activation: Activation,
    color_format: GPUTextureFormat,
): string {
    return /* wgsl */ `
        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(0) var<storage, read> prev_generation: array<f32>;
        @group(1) @binding(1) var<storage, write> next_generation: array<f32>;
        @group(2) @binding(1) var<storage> kernel: array<f32>;
        @group(2) @binding(2) var<uniform> kernel_size: u32;
        @group(2) @binding(3) var<uniform> color_1: vec4f;
        @group(2) @binding(4) var<uniform> color_2: vec4f;

        ${activationShader(activation)}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let texture_pos = gid.xy;
            let texture_dims = textureDimensions(texture);

            if (texture_pos.x >= texture_dims.x || texture_pos.y >= texture_dims.y) {
                return;
            }
            let color = vec4f(0, 1, 0, 1);

            textureStore(texture, texture_pos, color);
        }
    `
}
