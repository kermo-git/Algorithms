import Engine, { type FloatArray, type ShaderIssue } from '@/WebGPU/Engine'

import { type Setup, createShader } from './Shader'

export class NeuralScene {
    engine!: Engine

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

    async init(colors: FloatArray, canvas: HTMLCanvasElement): Promise<ShaderIssue[]> {
        this.engine = new Engine()
        await this.engine.init(canvas)

        const { device, color_format } = this.engine
        const { kernel, n_grid_rows, n_grid_cols } = this.setup
        canvas.width = n_grid_cols
        canvas.height = n_grid_rows

        const shader_code = createShader(this.setup, color_format)
        const { module, issues } = await this.engine.compileShader(shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })
        this.kernel = this.engine.createStorageBuffer(kernel)
        this.colors = this.engine.createUniformBuffer(colors)

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
        const n_cells = n_grid_rows * n_grid_cols
        const random_data = new Float32Array(n_cells).map(Math.random)

        this.generation_1_is_prev = true
        this.generation_1 = this.engine.createStorageBuffer(random_data)
        this.generation_2 = this.engine.createStorageBuffer(random_data)
        this.setGenerations(this.generation_1, this.generation_2)
        this.redraw()

        return issues
    }

    reset() {
        const { n_grid_rows, n_grid_cols } = this.setup
        const n_cells = n_grid_rows * n_grid_cols
        const random_data = new Float32Array(n_cells).map(Math.random)

        this.engine.updateBuffer(this.generation_1, random_data)
        this.generation_1_is_prev = true
        this.setGenerations(this.generation_1, this.generation_2)
        this.redraw()
    }

    setGenerations(prev: GPUBuffer, next: GPUBuffer) {
        this.generation_bind_group = this.engine.device.createBindGroup({
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

    redraw(): void {
        const texture = this.engine.getTexture()
        const encoder = this.engine.beginPass()

        const canvas_bind_group = this.engine.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: texture.createView(),
                },
            ],
        })
        encoder.setPipeline(this.pipeline)
        encoder.setBindGroup(0, canvas_bind_group)
        encoder.setBindGroup(1, this.generation_bind_group)
        encoder.setBindGroup(2, this.static_bind_group)
        this.engine.encodeDraw(encoder, texture)
        this.engine.endPass(encoder)
    }

    step(n_generations = 1): void {
        const texture = this.engine.getTexture()
        const encoder = this.engine.beginPass()

        const canvas_bind_group = this.engine.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: texture.createView(),
                },
            ],
        })
        encoder.setPipeline(this.pipeline)
        encoder.setBindGroup(0, canvas_bind_group)
        encoder.setBindGroup(2, this.static_bind_group)

        for (let i = 0; i < n_generations; i++) {
            this.generation_1_is_prev = !this.generation_1_is_prev

            if (this.generation_1_is_prev) {
                this.setGenerations(this.generation_1, this.generation_2)
            } else {
                this.setGenerations(this.generation_2, this.generation_1)
            }
            encoder.setBindGroup(1, this.generation_bind_group)
            this.engine.encodeDraw(encoder, texture)
        }
        this.engine.endPass(encoder)
    }

    updateColors(colors: FloatArray) {
        this.engine.updateBuffer(this.colors, colors)
        this.redraw()
    }

    cleanup(): void {
        this.engine.cleanup()
        this.generation_1?.destroy()
        this.generation_2?.destroy()
        this.kernel?.destroy()
        this.colors?.destroy()
    }
}
