import Engine, { type ShaderIssue } from '@/WebGPU/Engine'
import { parseHexColor, shaderColorArray } from '@/utils/Colors'

import { type Setup, createShader } from './Shader'

export class NeuralScene {
    engine!: Engine

    generation_A_is_current = true
    generation_A!: GPUBuffer
    generation_B!: GPUBuffer
    generation_group_AB!: GPUBindGroup
    generation_group_BA!: GPUBindGroup

    kernel!: GPUBuffer
    colors!: GPUBuffer
    kernel_color_group!: GPUBindGroup

    pipeline!: GPUComputePipeline

    setup!: Setup
    canvas_height = 0

    async init(setup: Setup, canvas: HTMLCanvasElement): Promise<ShaderIssue[]> {
        this.setup = setup
        this.engine = new Engine()
        await this.engine.init(canvas)

        const { device, canvas_color_format } = this.engine
        const { kernel } = this.setup

        const shader_code = createShader(this.setup, canvas_color_format)
        const { module, issues } = await this.engine.compileShader(shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })

        this.kernel = this.engine.createStorageBuffer(kernel)
        this.colors = this.engine.createUniformBuffer(
            shaderColorArray([setup.color_1, setup.color_2]),
        )

        this.kernel_color_group = device.createBindGroup({
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

        this.resizeCanvas(setup.canvas_width)
        this.reset()

        return issues
    }

    resizeCanvas(canvas_width: number) {
        this.generation_A?.destroy()
        this.generation_B?.destroy()

        this.setup.canvas_width = canvas_width
        this.canvas_height = this.engine.setCanvasWidth(canvas_width)

        const n_canvas_bytes = canvas_width * this.canvas_height * 4
        this.generation_A = this.engine.createStorageBuffer(null, n_canvas_bytes)
        this.generation_B = this.engine.createStorageBuffer(null, n_canvas_bytes)

        this.generation_group_AB = this.engine.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.generation_A,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.generation_B,
                    },
                },
            ],
        })

        this.generation_group_BA = this.engine.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.generation_B,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.generation_A,
                    },
                },
            ],
        })
    }

    reset() {
        const n_cells = this.setup.canvas_width * this.canvas_height
        const random_data = new Float32Array(n_cells).map(Math.random)
        this.engine.updateBuffer(this.generation_A, random_data)
        this.generation_A_is_current = true
        this.redraw()
    }

    redraw() {
        const texture = this.engine.getTexture()
        const encoder = this.engine.beginComputePass()

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

        if (this.generation_A_is_current) {
            encoder.setBindGroup(1, this.generation_group_AB)
        } else {
            encoder.setBindGroup(1, this.generation_group_BA)
        }
        encoder.setBindGroup(2, this.kernel_color_group)
        this.engine.encodeCompute(encoder, texture.width, texture.height)
        this.engine.endComputePass(encoder)
    }

    step(n_generations = 1): void {
        const device = this.engine.device
        const texture = this.engine.getTexture()
        const encoder = this.engine.beginComputePass()

        const canvas_bind_group = device.createBindGroup({
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
        encoder.setBindGroup(2, this.kernel_color_group)

        for (let i = 0; i < n_generations; i++) {
            this.generation_A_is_current = !this.generation_A_is_current

            if (this.generation_A_is_current) {
                encoder.setBindGroup(1, this.generation_group_AB)
            } else {
                encoder.setBindGroup(1, this.generation_group_BA)
            }
            this.engine.encodeCompute(encoder, texture.width, texture.height)
        }
        this.engine.endComputePass(encoder)
    }

    updateColor1(hex_color: string) {
        const { red, green, blue } = parseHexColor(hex_color)
        const shader_data = new Float32Array([red / 255, green / 255, blue / 255])
        this.engine.updateBuffer(this.colors, shader_data)
        this.redraw()
    }

    updateColor2(hex_color: string) {
        const { red, green, blue } = parseHexColor(hex_color)
        const shader_data = new Float32Array([red / 255, green / 255, blue / 255])
        this.engine.updateBuffer(this.colors, shader_data, 16)
        this.redraw()
    }

    cleanup(): void {
        this.engine?.cleanup()
        this.generation_A?.destroy()
        this.generation_B?.destroy()
        this.kernel?.destroy()
        this.colors?.destroy()
    }
}
