import {
    compileShader,
    type InitInfo,
    type Scene,
    type ShaderIssue,
} from '@/WebGPU/ComputeRenderer'
import {
    createStorageBuffer,
    createUniformBuffer,
    updateBuffer,
    type FloatArray,
} from '@/WebGPU/ShaderDataUtils'

import { type Setup, createShader } from './Shader'

export class NeuralScene implements Scene {
    generation_1_is_prev = true
    generation_1!: GPUBuffer
    generation_2!: GPUBuffer
    generation_bind_group!: GPUBindGroup

    kernel!: GPUBuffer
    colors!: GPUBuffer
    static_bind_group!: GPUBindGroup

    pipeline!: GPUComputePipeline

    setup: Setup

    constructor(setup: Setup) {
        this.setup = setup
    }

    getPipeline(): GPUComputePipeline {
        return this.pipeline
    }

    async init(colors: FloatArray, info: InitInfo): Promise<ShaderIssue[]> {
        const { device, color_format } = info
        const { kernel } = this.setup

        const shader_code = createShader(this.setup, color_format)
        const { module, issues } = await compileShader(device, shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })
        this.initGrid(device)
        this.kernel = createStorageBuffer(kernel, device)
        this.colors = createUniformBuffer(colors, device)

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
                        buffer: this.colors,
                    },
                },
            ],
        })

        return issues
    }

    initGrid(device: GPUDevice) {
        this.generation_1?.destroy()
        this.generation_2?.destroy()

        const { n_grid_rows, n_grid_cols } = this.setup
        const n_cells = n_grid_rows * n_grid_cols
        const random_data = new Float32Array(n_cells).map(Math.random)

        this.generation_1 = createStorageBuffer(random_data, device)
        this.generation_2 = createStorageBuffer(random_data, device)

        this.generation_1_is_prev = true
        this.setGenerations(this.generation_1, this.generation_2, device)
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

    render(encoder: GPUComputePassEncoder, device: GPUDevice): void {
        this.generation_1_is_prev = !this.generation_1_is_prev

        if (this.generation_1_is_prev) {
            this.setGenerations(this.generation_1, this.generation_2, device)
        } else {
            this.setGenerations(this.generation_2, this.generation_1, device)
        }
        encoder.setBindGroup(1, this.generation_bind_group)
        encoder.setBindGroup(2, this.static_bind_group)
    }

    cleanup(): void {
        this.generation_1?.destroy()
        this.generation_2?.destroy()
        this.kernel?.destroy()
        this.colors?.destroy()
    }
}
