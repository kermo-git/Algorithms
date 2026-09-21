import { WG_DIM } from '@/WebGPU/ShaderModuleSystem/WebGPUScene'
import { ComputeShader, readView } from '@/WebGPU/ShaderModuleSystem/Modules'
import { lerpColorArray } from '@/utils/Colors'

export interface Setup {
    update_shader: string
    n_states: number
    max_n_states: number
    hex_colors: string[]
    canvas_width: number
}

const f32_bytes = 4
const vec4f_bytes = 4 * f32_bytes

export function createStateData(n_states: number, hex_colors: string[]) {
    const data = new ArrayBuffer(vec4f_bytes + vec4f_bytes * n_states)
    const int_view = new Uint32Array(data, 0, 1)
    const float_view = new Float32Array(data, vec4f_bytes)

    const colors = lerpColorArray(hex_colors, n_states)
    int_view[0] = n_states
    float_view.set(colors, 0)

    return data
}

export function createCanvasData(n_states: number, n_pixels: number) {
    return new Uint32Array(n_pixels).map(() =>
        Math.floor(Math.random() * n_states)
    ).buffer
}

export function createShader(
    update_shader: string,
    max_n_states?: number,
    state_data?: ArrayBuffer,
    canvas_data?: ArrayBuffer
): ComputeShader {
    return {
        kind: 'ComputeShader',
        name: 'main',

        resources: [
            readView({
                kind: 'StorageBuffer',
                name: 'states',
                dataType: 'States',
                dataTypeCode: /* wgsl */ `
                    struct States {
                        n: u32,
                        colors: array<vec4f>,
                    };
                `,
                byteLength: vec4f_bytes + vec4f_bytes * (max_n_states || 1),
                data: state_data
            }),
            {
                kind: 'PingPongBuffers',
                readName: 'prev_generation',
                writeName: 'next_generation',
                buffer_A: {
                    kind: 'StorageBuffer',
                    name: 'generation_A',
                    dataType: 'array<u32>',
                    data: canvas_data
                },
                buffer_B: {
                    kind: 'StorageBuffer',
                    name: 'generation_B',
                    dataType: 'array<u32>',
                    byteLength: canvas_data?.byteLength
                }
            }
        ],

        canvas: 'canvas',

        code: /* wgsl */ `
            fn neighbor(center_pos: vec2u, offset_x: i32, offset_y: i32) -> u32 {
                let canvas_dims = vec2i(textureDimensions(canvas));

                let canvas_pos = (
                    vec2i(center_pos) + vec2i(offset_x, offset_y)
                ) % canvas_dims;
                
                let canvas_i = canvas_pos.y * canvas_dims.x + canvas_pos.x;
                
                return prev_generation[canvas_i];
            }

            fn shift(state: u32, n: i32) -> u32 {
                return u32(i32(state + states.n) + n) % states.n;
            }

            fn moore_count(center_pos: vec2u, radius: u32, state: u32) -> u32 {
                let canvas_dims = textureDimensions(canvas);
                let diameter = 2 * radius + 1;
                let start_pos = center_pos - vec2u(radius);
                var result: u32 = 0;

                for (var ny = 0u; ny < diameter; ny++) {
                    for (var nx = 0u; nx < diameter; nx++) {
                        // Don't include the center cell
                        if ny == radius && nx == radius {
                            continue;
                        }
                        let canvas_x = (start_pos.x + nx) % canvas_dims.x;
                        let canvas_y = (start_pos.y + ny) % canvas_dims.y;
                        let canvas_i = canvas_y * canvas_dims.x + canvas_x;

                        if prev_generation[canvas_i] == state {
                            result += 1;
                        }
                    }
                }
                return result;
            }

            fn moore_avg(center_pos: vec2u, radius: u32) -> f32 {
                let canvas_dims = textureDimensions(canvas);
                let diameter = 2 * radius + 1;
                let start_pos = center_pos - vec2u(radius);
                var sum: u32 = 0;

                for (var ny = 0u; ny < diameter; ny++) {
                    for (var nx = 0u; nx < diameter; nx++) {
                        // Don't include the center cell
                        if ny == radius && nx == radius {
                            continue;
                        }
                        let canvas_x = (start_pos.x + nx) % canvas_dims.x;
                        let canvas_y = (start_pos.y + ny) % canvas_dims.y;
                        let canvas_i = canvas_y * canvas_dims.x + canvas_x;

                        sum += prev_generation[canvas_i];
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

                        if (i != 0 || j != radius) && // Don't include the center cell
                        (prev_generation[top_i] == state) {
                            result += 1;
                        }
                        if (i != 0) && // Don't include the middle row twice
                        (prev_generation[bottom_i] == state) {
                            result += 1;
                        }
                    }
                }
                return result;
            }

            fn neumann_avg(center_pos: vec2u, radius: u32) -> f32 {
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

                        // Don't include the center cell
                        if i != 0 || j != radius {
                            sum += prev_generation[top_i];
                        }
                        // Don't include the middle row twice
                        if i != 0 {
                            sum += prev_generation[bottom_i];
                        }
                    }
                }
                let area = 2 * radius * radius + diameter - 1;
                return f32(sum) / f32(area);
            }

            ${update_shader}
            
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
                let prev_state = prev_generation[canvas_i];

                let next_state = update(shifted_grid_pos, prev_state);
                next_generation[canvas_i] = next_state;

                textureStore(canvas, canvas_pos, states.colors[prev_state]);
            }
        `
    }
}
