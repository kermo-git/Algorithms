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

export interface Setup {
    n_states: number
    /**
     * A WGSL (WebGPU shading language) function that takes a cell's state in the current generation and returns its state in the next generation
     *
     * ```{wgsl}
     * fn update_rule(cell_pos: vec2u, cell_state: u32) -> u32 {
     *    // calculate and return next generation state
     * }
     * ```
     */
    update_rule_shader: string
    n_grid_rows: number
    n_grid_cols: number
}

export function createShader(setup: Setup, color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        
        @group(1) @binding(0) var<storage, read> current_generation: array<u32>;
        @group(1) @binding(1) var<storage, read_write> next_generation: array<u32>;
        @group(2) @binding(0) var<storage> colors: array<vec4f>;

        const n_grid_rows = ${setup.n_grid_rows};
        const n_grid_cols = ${setup.n_grid_cols};
        const n_states = ${setup.n_states};

        fn neighbor(center_pos: vec2u, offset_x: i32, offset_y: i32) -> u32 {
            let grid_x = (i32(center_pos.x) + offset_x) % n_grid_cols;
            let grid_y = (i32(center_pos.y) + offset_y) % n_grid_rows;
            let grid_i = grid_y * n_grid_cols + grid_x;
            return current_generation[grid_i];
        }

        fn shift(state: u32, shift: i32) -> u32 {
            return u32((i32(state) + n_states + shift) % n_states);
        }

        fn count(center_pos: vec2u, neighborhood_radius: u32, state: u32) -> u32 {
            let neighborhood_size = 2 * neighborhood_radius + 1;
            let start_pos = center_pos - vec2u(neighborhood_radius);
            var result: u32 = 0;

            for (var ny = 0u; ny < neighborhood_size; ny++) {
                for (var nx = 0u; nx < neighborhood_size; nx++) {
                    let grid_x = (start_pos.x + nx) % n_grid_cols;
                    let grid_y = (start_pos.y + ny) % n_grid_rows;
                    let grid_i = grid_y * n_grid_cols + grid_x;

                    if current_generation[grid_i] == state {
                        result += 1;
                    }
                }
            }
            return result;
        }

        ${setup.update_rule_shader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let grid_pos = gid.xy;

            if (grid_pos.x >= n_grid_cols || grid_pos.y >= n_grid_rows) {
                return;
            }
            let shifted_grid_pos = grid_pos + vec2u(n_grid_cols, n_grid_rows);
            let grid_i = grid_pos.y * n_grid_cols + grid_pos.x;
            let current_state = current_generation[grid_i];

            let next_state = update_rule(shifted_grid_pos, current_state);
            next_generation[grid_i] = next_state;

            textureStore(texture, grid_pos, colors[current_state]);
        }
    `
}
