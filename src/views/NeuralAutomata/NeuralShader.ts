import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import { WG_DIM } from '@/WebGPU/ComputeRenderer'

export const invertedGaussian = /* wgsl */ `// Inverted Gaussian function
fn activate(x: f32) -> f32 {
    return -1/(0.9 * pow(x, 2) + 1) + 1;
}`

export const sigmoid = /* wgsl */ `// Sigmoid function
fn activate(x: f32) -> f32 {
    let exp_x = exp(x);
    return exp_x / (exp_x + 1);
}`

export interface NeuralUniforms {
    grid_size: number
    kernel_size: number
    kernel: FloatArray
    colors: FloatArray
}

export default function neuralShader(
    activation_shader: string,
    color_format: GPUTextureFormat,
): string {
    return /* wgsl */ `
        struct Colors {
            color_0: vec4f,
            color_1: vec4f
        };

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        
        @group(1) @binding(0) var<storage, read> prev_generation: array<f32>;
        @group(1) @binding(1) var<storage, read_write> next_generation: array<f32>;

        @group(2) @binding(0) var<storage> kernel: array<f32>;
        @group(2) @binding(1) var<uniform> kernel_size: u32;
        @group(2) @binding(2) var<uniform> colors: Colors;

        ${activation_shader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let grid_pos = gid.xy;
            let grid_size = textureDimensions(texture);

            if (grid_pos.x >= grid_size.x || grid_pos.y >= grid_size.y) {
                return;
            }
            let radius = u32(floor(f32(kernel_size) / 2));
            let start_pos = vec2u(grid_size) + grid_pos - vec2u(radius);
            var result = 0.0;

            for (var ky = 0u; ky < kernel_size; ky++) {
                for (var kx = 0u; kx < kernel_size; kx++) {
                    let kernel_i = ky * kernel_size + kx;
                    let grid_x = (start_pos.x + kx) % grid_size.x;
                    let grid_y = (start_pos.y + ky) % grid_size.y;
                    let grid_i = grid_y * grid_size.x + grid_x;
                    result += prev_generation[grid_i] * kernel[kernel_i];
                }
            }
            result = activate(result);

            let grid_i = grid_pos.y * grid_size.x + grid_pos.x;
            next_generation[grid_i] = result;

            let color = mix(colors.color_0, colors.color_1, prev_generation[grid_i]);
            textureStore(texture, grid_pos, color);
        }
    `
}
