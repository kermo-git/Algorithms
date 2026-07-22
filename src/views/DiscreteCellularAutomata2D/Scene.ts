import Engine, { type FloatArray, type ShaderIssue } from '@/WebGPU/Engine'
import { lerpColorArray, shaderColorArray } from '@/utils/Colors'

import { createShader, type Setup } from './Shader'

export class AutomatonScene {
    engine!: Engine

    generation_A_is_current = true
    generation_A!: GPUBuffer
    generation_B!: GPUBuffer
    generation_group_AB!: GPUBindGroup
    generation_group_BA!: GPUBindGroup

    colors!: GPUBuffer
    n_states!: GPUBuffer
    color_group!: GPUBindGroup

    pipeline!: GPUComputePipeline

    setup!: Setup
    canvas_height = 0

    async init(setup: Setup, canvas: HTMLCanvasElement): Promise<ShaderIssue[]> {
        this.setup = setup
        this.engine = new Engine()
        await this.engine.init(canvas)

        const { device, canvas_color_format } = this.engine
        const { n_states } = this.setup

        const shader_code = createShader(this.setup, canvas_color_format)
        const { module, issues } = await this.engine.compileShader(shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })
        const max_n_states = 32

        const state_colors = lerpColorArray(this.setup.hex_colors, n_states)
        const color_data = shaderColorArray(state_colors)

        this.colors = this.engine.createStorageBuffer(color_data, max_n_states * 16)
        this.n_states = this.engine.createIntUniform(n_states)

        this.color_group = this.engine.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.colors,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.n_states,
                    },
                },
            ],
        })

        this.resizeCanvas(setup.canvas_width)
        this.reset()

        return issues
    }

    setNStates(n_states: number) {
        this.setup.n_states = n_states

        const state_colors = lerpColorArray(this.setup.hex_colors, n_states)
        const color_data = shaderColorArray(state_colors)

        this.engine.updateBuffer(this.colors, color_data)
        this.engine.updateIntUniform(this.n_states, n_states)
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
        const random_data = new Uint32Array(n_cells).map(() => {
            return Math.floor(Math.random() * this.setup.n_states)
        })
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
        encoder.setBindGroup(2, this.color_group)
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
        encoder.setBindGroup(2, this.color_group)

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

    updateAllColors(hex_colors: string[]) {
        this.setup.hex_colors = hex_colors
        const state_colors = lerpColorArray(hex_colors, this.setup.n_states)
        const color_data = shaderColorArray(state_colors)
        this.engine.updateBuffer(this.colors, color_data)
        this.redraw()
    }

    updateSingleColor(i: number, hex_color: string) {
        this.setup.hex_colors[i] = hex_color
        const state_colors = lerpColorArray(this.setup.hex_colors, this.setup.n_states)
        const color_data = shaderColorArray(state_colors)
        this.engine.updateBuffer(this.colors, color_data)
        this.redraw()
    }

    cleanup() {
        this.engine?.cleanup()
        this.generation_A?.destroy()
        this.generation_B?.destroy()
        this.colors?.destroy()
        this.n_states?.destroy()
    }
}
