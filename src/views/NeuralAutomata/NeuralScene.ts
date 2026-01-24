import {
    compileShader,
    type InitInfo,
    type Scene,
    type ShaderIssue,
} from '@/WebGPU/ComputeRenderer'
import {
    createIntUniform,
    createStorageBuffer,
    createUniformBuffer,
    updateBuffer,
    updateIntUniform,
    type FloatArray,
} from '@/WebGPU/ShaderDataUtils'

import { type NeuralUniforms, neuralShader } from './NeuralShader'

export class NeuralScene implements Scene {
    generation_1_is_prev = true
    generation_1!: GPUBuffer
    generation_2!: GPUBuffer
    generation_bind_group!: GPUBindGroup

    kernel_size!: GPUBuffer
    kernel!: GPUBuffer
    colors!: GPUBuffer
    static_bind_group!: GPUBindGroup

    pipeline!: GPUComputePipeline

    activation_shader: string

    constructor(activation: string) {
        this.activation_shader = activation
    }

    getPipeline(): GPUComputePipeline {
        return this.pipeline
    }

    async init(data: NeuralUniforms, info: InitInfo): Promise<ShaderIssue[]> {
        const { device, color_format } = info

        const shader_code = neuralShader(this.activation_shader, color_format)
        const { module, issues } = await compileShader(device, shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })
        this.initGrid(data.grid_size, device)
        this.kernel_size = createIntUniform(data.kernel_size, device)
        this.kernel = createStorageBuffer(data.kernel, device, 11 * 11 * 4)
        this.colors = createUniformBuffer(data.colors, device)

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
                        buffer: this.colors,
                    },
                },
            ],
        })

        return issues
    }

    initGrid(grid_size: number, device: GPUDevice) {
        this.generation_1?.destroy()
        this.generation_2?.destroy()

        const n_cells = grid_size * grid_size
        const random_data = new Float32Array(n_cells).map(Math.random)

        this.generation_1 = createStorageBuffer(random_data, device)
        this.generation_2 = createStorageBuffer(random_data, device)

        this.generation_1_is_prev = true
        this.setGenerations(this.generation_1, this.generation_2, device)
    }

    updateKernel(kernel_size: number, kernel_data: FloatArray, device: GPUDevice) {
        updateIntUniform(this.kernel_size, kernel_size, device)
        updateBuffer(this.kernel, kernel_data, device)
    }

    updateColors(colors: FloatArray, device: GPUDevice) {
        updateBuffer(this.colors, colors, device)
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
        this.generation_1?.destroy()
        this.generation_2?.destroy()
        this.kernel?.destroy()
        this.kernel_size?.destroy()
        this.colors?.destroy()
    }
}
