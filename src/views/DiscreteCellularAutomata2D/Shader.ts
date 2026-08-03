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
    hex_colors: string[]
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
    canvas_width: number
}

export function createShader(
    setup: Setup,
    canvas_color_format: GPUTextureFormat
): string {
    return /* wgsl */ `
        @group(0) @binding(0) var canvas: texture_storage_2d<${canvas_color_format}, write>;
        
        @group(1) @binding(0) var<storage, read> current_generation: array<u32>;
        @group(1) @binding(1) var<storage, read_write> next_generation: array<u32>;
        @group(2) @binding(0) var<storage> colors: array<vec4f>;
        @group(2) @binding(1) var<uniform> n_states: u32;

        fn neighbor(center_pos: vec2u, offset_x: i32, offset_y: i32) -> u32 {
            let canvas_dims = vec2i(textureDimensions(canvas));

            let canvas_pos = (
                vec2i(center_pos) + vec2i(offset_x, offset_y)
            ) % canvas_dims;
            
            let canvas_i = canvas_pos.y * canvas_dims.x + canvas_pos.x;
            
            return current_generation[canvas_i];
        }

        fn shift(state: u32, n: i32) -> u32 {
            return u32(i32(state + n_states) + n) % n_states;
        }

        fn moore_count(center_pos: vec2u, radius: u32, state: u32) -> u32 {
            let canvas_dims = textureDimensions(canvas);
            let diameter = 2 * radius + 1;
            let start_pos = center_pos - vec2u(radius);
            var result: u32 = 0;

            for (var ny = 0u; ny < diameter; ny++) {
                for (var nx = 0u; nx < diameter; nx++) {
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

        fn moore_avg(center_pos: vec2u, radius: u32, include_center: bool) -> f32 {
            let canvas_dims = textureDimensions(canvas);
            let diameter = 2 * radius + 1;
            let start_pos = center_pos - vec2u(radius);
            var sum: u32 = 0;

            for (var ny = 0u; ny < diameter; ny++) {
                for (var nx = 0u; nx < diameter; nx++) {
                    if !include_center && ny == radius && nx == radius {
                        continue;
                    }
                    let canvas_x = (start_pos.x + nx) % canvas_dims.x;
                    let canvas_y = (start_pos.y + ny) % canvas_dims.y;
                    let canvas_i = canvas_y * canvas_dims.x + canvas_x;

                    sum += current_generation[canvas_i];
                }
            }
            return f32(sum) / f32(diameter * diameter);
        }

        fn neumann_count(center_pos: vec2u, radius: u32, state: u32) -> u32 {
            let canvas_dims = textureDimensions(canvas);
            let diameter = 2 * radius + 1;
            var result: u32 = 0;

            for (var i = 0u; i <= radius; i++) {
                let top_y = (center_pos.y + i) % canvas_dims.y;
                let bottom_y = (center_pos.y - i) % canvas_dims.y;
                let left_x = (center_pos.x - radius + i) % canvas_dims.x;

                for (var j = 0u; j < diameter - 2*i; j++) {
                    let canvas_x = (left_x + j) % canvas_dims.x;

                    let top_i = top_y * canvas_dims.x + canvas_x;
                    let bottom_i = bottom_y * canvas_dims.x + canvas_x;

                    if current_generation[top_i] == state {
                        result += 1;
                    }
                    if i != 0 && current_generation[bottom_i] == state {
                        result += 1;
                    }
                }
            }
            return result;
        }

        fn neumann_avg(center_pos: vec2u, radius: u32, include_center: bool) -> f32 {
            let canvas_dims = textureDimensions(canvas);
            let diameter = 2 * radius + 1;
            var sum: u32 = 0;

            for (var i = 0u; i <= radius; i++) {
                let top_y = (center_pos.y + i) % canvas_dims.y;
                let bottom_y = (center_pos.y - i) % canvas_dims.y;
                let left_x = (center_pos.x - radius + i) % canvas_dims.x;

                for (var j = 0u; j < diameter - 2*i; j++) {
                    let canvas_x = (left_x + j) % canvas_dims.x;

                    let top_i = top_y * canvas_dims.x + canvas_x;
                    let bottom_i = bottom_y * canvas_dims.x + canvas_x;

                    if include_center || i != 0 || j != radius {
                        sum += current_generation[top_i];
                    }
                    if i != 0 {
                        sum += current_generation[bottom_i];
                    }
                }
            }
            let area = select(
                2 * radius * radius + diameter - 1,
                2 * radius * radius + diameter,
                include_center
            );
            return f32(sum) / f32(area);
        }

        ${setup.update_shader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let canvas_pos = gid.xy;
            let canvas_dims = textureDimensions(canvas);

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
