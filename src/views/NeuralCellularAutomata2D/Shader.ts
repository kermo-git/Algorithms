import { WG_DIM, type FloatArray } from '@/WebGPU/Engine'

export const invertedGaussian = /* wgsl */ `// Inverted Gaussian function
fn activate(x: f32) -> f32 {
    return -1/(0.89 * pow(x, 2) + 1) + 1;
}`

export const sigmoid = /* wgsl */ `// Sigmoid function
fn activate(x: f32) -> f32 {
    let exp_x = exp(x);
    return exp_x / (exp_x + 1);
}`

export interface Setup {
    activation_shader: string
    canvas_width: number
    kernel_radius: number
    kernel: FloatArray
    color_1: string
    color_2: string
}

export function createShader(setup: Setup, canvas_color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        struct Colors {
            color_0: vec4f,
            color_1: vec4f
        };

        @group(0) @binding(0) var canvas: texture_storage_2d<${canvas_color_format}, write>;
        
        @group(1) @binding(0) var<storage, read> prev_generation: array<f32>;
        @group(1) @binding(1) var<storage, read_write> next_generation: array<f32>;

        @group(2) @binding(0) var<storage> kernel: array<f32>;
        @group(2) @binding(1) var<uniform> colors: Colors;

        const kernel_radius = ${setup.kernel_radius};
        const kernel_size = 2 * kernel_radius + 1;

        ${setup.activation_shader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let canvas_pos = gid.xy;
            let canvas_dims = textureDimensions(canvas);

            if (canvas_pos.x >= canvas_dims.x || canvas_pos.y >= canvas_dims.y) {
                return;
            }
            let start_pos = canvas_dims + canvas_pos - kernel_radius;
            var result = 0.0;

            for (var ky = 0u; ky < kernel_size; ky++) {
                for (var kx = 0u; kx < kernel_size; kx++) {
                    let kernel_i = ky * kernel_size + kx;
                    let canvas_x = (start_pos.x + kx) % canvas_dims.x;
                    let canvas_y = (start_pos.y + ky) % canvas_dims.y;
                    let canvas_i = canvas_y * canvas_dims.x + canvas_x;
                    result += prev_generation[canvas_i] * kernel[kernel_i];
                }
            }
            result = activate(result);

            let canvas_i = canvas_pos.y * canvas_dims.x + canvas_pos.x;
            next_generation[canvas_i] = result;

            let color = mix(colors.color_0, colors.color_1, prev_generation[canvas_i]);
            textureStore(canvas, canvas_pos, color);
        }
    `
}
