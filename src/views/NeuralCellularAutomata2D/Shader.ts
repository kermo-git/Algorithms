import { shaderColorArray } from '@/utils/Colors'
import { ComputeShader } from '@/WebGPU/Modules'
import { WG_DIM } from '@/WebGPU/Scene'

export interface Setup {
    activation_shader: string
    kernel_radius: number
    max_kernel_radius: number
    kernel: number[]
    color_1: string
    color_2: string
    canvas_width: number
}

export function createColorKernelData(setup: Setup) {
    const n_color_kernel_bytes = colorKernelBufferSize(setup.max_kernel_radius)
    const result = new ArrayBuffer(n_color_kernel_bytes)

    const color_data = shaderColorArray([setup.color_1, setup.color_2])
    const float_view = new Float32Array(result)
    float_view.set(color_data, 0)
    float_view.set(setup.kernel, 9)

    const kernel_radius_view = new Uint32Array(result, 32, 1)
    kernel_radius_view[0] = setup.kernel_radius

    return result
}

export function colorKernelBufferSize(kernel_radius: number) {
    const f32_bytes = 4
    const vec4f_bytes = 4 * f32_bytes

    return (
        2 * vec4f_bytes + // color_0, color_1
        kernelBufferSize(kernel_radius)
    )
}

export function kernelBufferSize(kernel_radius: number) {
    const f32_bytes = 4
    const u32_bytes = 4
    const kernel_diameter = 2 * kernel_radius + 1

    return (
        u32_bytes + // kernel_radius
        f32_bytes * kernel_diameter * kernel_diameter // kernel
    )
}

export function createShader(
    activation_shader: string,
    color_kernel_data?: ArrayBuffer,
    dims?: {
        x: number
        y: number
    }
): ComputeShader {
    let n_pixels = 0,
        canvas_data

    if (dims) {
        n_pixels = dims.x * dims.y
        canvas_data = new Float32Array(n_pixels).map(Math.random).buffer
    }

    return {
        kind: 'ComputeShader',
        name: 'main',
        resources: [
            {
                kind: 'PingPongBuffers',
                readName: 'prev_generation',
                writeName: 'next_generation',
                buffer_A: {
                    kind: 'StorageBuffer',
                    name: 'generation_A',
                    dataType: 'array<f32>',
                    data: canvas_data
                },
                buffer_B: {
                    kind: 'StorageBuffer',
                    name: 'generation_B',
                    dataType: 'array<f32>',
                    byteLength: 4 * n_pixels
                }
            },
            {
                kind: 'StorageBufferView',
                accessMode: 'read',
                buffer: {
                    kind: 'StorageBuffer',
                    name: 'ck',
                    dataType: 'ColorKernel',
                    dataTypeCode: /* wgsl */ `
                        struct ColorKernel {
                            color_0: vec4f,
                            color_1: vec4f,
                            kernel_radius: u32,
                            kernel: array<f32>
                        };
                    `,
                    data: color_kernel_data
                }
            }
        ],
        canvas: 'canvas',
        code: /* wgsl */ `
            ${activation_shader}
            
            @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
            fn main(
                @builtin(global_invocation_id) gid: vec3u
            ) {
                let canvas_pos = gid.xy;
                let canvas_dims = textureDimensions(canvas);

                if (canvas_pos.x >= canvas_dims.x || canvas_pos.y >= canvas_dims.y) {
                    return;
                }

                let start_pos = canvas_dims + canvas_pos - ck.kernel_radius;
                let kernel_size = 2 * ck.kernel_radius + 1;
                var result = 0.0;
                
                for (var ky = 0u; ky < kernel_size; ky++) {
                    for (var kx = 0u; kx < kernel_size; kx++) {
                        let kernel_i = ky * kernel_size + kx;
                        let canvas_x = (start_pos.x + kx) % canvas_dims.x;
                        let canvas_y = (start_pos.y + ky) % canvas_dims.y;
                        let canvas_i = canvas_y * canvas_dims.x + canvas_x;
                        result += prev_generation[canvas_i] * ck.kernel[kernel_i];
                    }
                }
                result = activate(result);

                let canvas_i = canvas_pos.y * canvas_dims.x + canvas_pos.x;
                next_generation[canvas_i] = result;

                let color = mix(ck.color_0, ck.color_1, prev_generation[canvas_i]);
                textureStore(canvas, canvas_pos, color);
            }
        `
    }
}
