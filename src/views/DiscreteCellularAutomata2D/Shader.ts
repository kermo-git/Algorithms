import { WG_DIM } from '@/WebGPU/Engine'

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
     * fn update(pos: vec2u, state: u32) -> u32 {
     *    // calculate and return next generation state
     * }
     * ```
     */
    update_shader: string
    canvas_dims: number[]
}

export function createShader(setup: Setup, canvas_color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        @group(0) @binding(0) var canvas: texture_storage_2d<${canvas_color_format}, write>;
        
        @group(1) @binding(0) var<storage, read> current_generation: array<u32>;
        @group(1) @binding(1) var<storage, read_write> next_generation: array<u32>;
        @group(2) @binding(0) var<storage> colors: array<vec4f>;
        
        const canvas_dims = vec2u(${setup.canvas_dims[0]}, ${setup.canvas_dims[1]});
        const n_states = ${setup.n_states};

        fn neighbor(center_pos: vec2u, offset_x: i32, offset_y: i32) -> u32 {
            let canvas_x = (i32(center_pos.x) + offset_x) % i32(canvas_dims.x);
            let canvas_y = (i32(center_pos.y) + offset_y) % i32(canvas_dims.y);
            let canvas_i = canvas_y * i32(canvas_dims.x) + canvas_x;
            return current_generation[canvas_i];
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
                    let canvas_x = (start_pos.x + nx) % canvas_dims.x;
                    let canvas_y = (start_pos.y + ny) % canvas_dims.y;
                    let canvas_i = canvas_y * canvas_dims.x + canvas_x;

                    if current_generation[canvas_i] == state {
                        result += 1;
                    }
                }
            }
            return result;
        }

        ${setup.update_shader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let canvas_pos = gid.xy;

            if (canvas_pos.x >= canvas_dims.x || canvas_pos.y >= canvas_dims.y) {
                return;
            }
            let shifted_grid_pos = canvas_pos + canvas_dims;
            let canvas_i = canvas_pos.y * canvas_dims.x + canvas_pos.x;
            let current_state = current_generation[canvas_i];

            let next_state = update(shifted_grid_pos, current_state);
            next_generation[canvas_i] = next_state;

            textureStore(canvas, canvas_pos, colors[current_state]);
        }
    `
}
