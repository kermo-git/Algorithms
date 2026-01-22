import { createComputePipeline, type InitInfo, type Scene } from '@/WebGPU/ComputeRenderer'
import type { Activation, NeuralUniforms } from './NeuralShader'
import neuralShader from './NeuralShader'
import {
    createIntUniform,
    createStorageBuffer,
    updateBuffer,
    updateIntUniform,
    type FloatArray,
} from '@/WebGPU/ShaderDataUtils'

export class NeuralScene implements Scene {
    generation_1_is_prev = true
    generation_1!: GPUBuffer
    generation_2!: GPUBuffer
    generation_bind_group!: GPUBindGroup

    kernel_size!: GPUBuffer
    kernel!: GPUBuffer
    color_1!: GPUBuffer
    color_2!: GPUBuffer
    static_bind_group!: GPUBindGroup

    pipeline!: GPUComputePipeline

    activation: Activation

    constructor(activation: Activation) {
        this.activation = activation
    }

    getPipeline(): GPUComputePipeline {
        return this.pipeline
    }

    async init(data: NeuralUniforms, info: InitInfo) {
        const { device, color_format } = info

        const shader_code = neuralShader(this.activation, color_format)
        this.pipeline = await createComputePipeline(shader_code, device)

        this.initGrid(data.grid_size, device)

        this.kernel_size = createIntUniform(data.kernel_size, device)
        this.kernel = createStorageBuffer(data.kernel, device, 11 * 11 * 4)
        this.color_1 = createStorageBuffer(data.color_1, device)
        this.color_2 = createStorageBuffer(data.color_2, device)

        this.static_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.kernel,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.kernel_size,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.color_1,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.color_2,
                    },
                },
            ],
        })
    }

    initGrid(grid_size: number, device: GPUDevice) {
        this.generation_1?.destroy()
        this.generation_2?.destroy()

        const n_cells = grid_size * grid_size
        const random_data = generateRandomFloatBits(n_cells)

        this.generation_1 = createStorageBuffer(random_data, device)
        this.generation_2 = createStorageBuffer(null, device, random_data.byteLength)

        this.generation_1_is_prev = true
        this.setGenerations(this.generation_1, this.generation_2, device)
    }

    updateKernel(kernel_size: number, kernel_data: FloatArray, device: GPUDevice) {
        updateIntUniform(this.kernel_size, kernel_size, device)
        updateBuffer(this.kernel, kernel_data, device)
    }

    updateColors(color_1: FloatArray, color_2: FloatArray, device: GPUDevice) {
        updateBuffer(this.color_1, color_1, device)
        updateBuffer(this.color_2, color_2, device)
    }

    setGenerations(prev: GPUBuffer, next: GPUBuffer, device: GPUDevice) {
        this.generation_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: prev,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: next,
                    },
                },
            ],
        })
    }

    switchGenerations(device: GPUDevice) {
        this.generation_1_is_prev = !this.generation_1_is_prev

        if (this.generation_1_is_prev) {
            this.setGenerations(this.generation_1, this.generation_2, device)
        } else {
            this.setGenerations(this.generation_2, this.generation_1, device)
        }
    }

    render(encoder: GPUComputePassEncoder): void {
        encoder.setBindGroup(1, this.generation_bind_group)
        encoder.setBindGroup(2, this.static_bind_group)
    }

    cleanup(): void {
        this.generation_1.destroy()
        this.generation_2.destroy()
        this.kernel.destroy()
        this.kernel_size.destroy()
        this.color_1.destroy()
        this.color_2.destroy()
    }
}

function generateRandomFloatBits(n: number): FloatArray {
    return new Float32Array(n).map(() => Math.round(Math.random()))
}
