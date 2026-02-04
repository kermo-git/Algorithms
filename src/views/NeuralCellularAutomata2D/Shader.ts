import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import { WG_DIM } from '@/WebGPU/ComputeRenderer'

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
    n_grid_rows: number
    n_grid_cols: number
    kernel_radius: number
    kernel: FloatArray
}

export function createShader(setup: Setup, color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        struct Colors {
            color_0: vec4f,
            color_1: vec4f
        };

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        
        @group(1) @binding(0) var<storage, read> prev_generation: array<f32>;
        @group(1) @binding(1) var<storage, read_write> next_generation: array<f32>;

        @group(2) @binding(0) var<storage> kernel: array<f32>;
        @group(2) @binding(1) var<uniform> colors: Colors;

        const kernel_radius = ${setup.kernel_radius};
        const kernel_size = 2 * kernel_radius + 1;
        const n_grid_rows = ${setup.n_grid_rows};
        const n_grid_cols = ${setup.n_grid_cols};

        ${setup.activation_shader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let grid_pos = gid.xy;

            if (grid_pos.x >= n_grid_cols || grid_pos.y >= n_grid_rows) {
                return;
            }
            let start_pos = vec2u(n_grid_cols, n_grid_rows) + grid_pos - vec2u(kernel_radius);
            var result = 0.0;

            for (var ky = 0u; ky < kernel_size; ky++) {
                for (var kx = 0u; kx < kernel_size; kx++) {
                    let kernel_i = ky * kernel_size + kx;
                    let grid_x = (start_pos.x + kx) % n_grid_cols;
                    let grid_y = (start_pos.y + ky) % n_grid_rows;
                    let grid_i = grid_y * n_grid_cols + grid_x;
                    result += prev_generation[grid_i] * kernel[kernel_i];
                }
            }
            result = activate(result);

            let grid_i = grid_pos.y * n_grid_cols + grid_pos.x;
            next_generation[grid_i] = result;

            let color = mix(colors.color_0, colors.color_1, prev_generation[grid_i]);
            textureStore(texture, grid_pos, color);
        }
    `
}
