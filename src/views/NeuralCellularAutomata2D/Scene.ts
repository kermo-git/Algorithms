import Engine, { type ShaderIssue } from '@/WebGPU/Engine'
import { parseHexColor, shaderColorArray } from '@/utils/Colors'

import {
    type Setup,
    createShader,
    colorKernelBufferSize,
    kernelBufferSize
} from './Shader'

export class NeuralScene {
    engine!: Engine

    canvas_layout!: GPUBindGroupLayout
    generation_layout!: GPUBindGroupLayout
    color_kernel_layout!: GPUBindGroupLayout
    shader_layout!: GPUPipelineLayout

    generation_A_is_current = true
    generation_A!: GPUBuffer
    generation_B!: GPUBuffer
    generation_group_AB!: GPUBindGroup
    generation_group_BA!: GPUBindGroup

    color_kernel!: GPUBuffer
    color_kernel_group!: GPUBindGroup

    pipeline!: GPUComputePipeline

    canvas_width = 0
    canvas_height = 0

    async init(
        setup: Setup,
        canvas: HTMLCanvasElement
    ): Promise<ShaderIssue[]> {
        this.engine = new Engine()
        await this.engine.init(canvas)

        this.createLayout()
        const issues = await this.setActivation(setup.activation_shader)
        this.initColorKernel(setup)
        this.resetCanvas(setup.canvas_width, true)

        return issues
    }

    private initColorKernel(setup: Setup) {
        const max_kernel_radius = 5
        const n_color_kernel_bytes = colorKernelBufferSize(max_kernel_radius)
        const uniform_data = new ArrayBuffer(n_color_kernel_bytes)

        const color_data = shaderColorArray([setup.color_1, setup.color_2])
        const float_view = new Float32Array(uniform_data)
        float_view.set(color_data, 0)
        float_view.set(setup.kernel, 9)

        const kernel_radius_view = new Uint32Array(uniform_data, 32, 1)
        kernel_radius_view[0] = setup.kernel_radius

        this.color_kernel = this.engine.createStorageBuffer(
            float_view,
            n_color_kernel_bytes
        )

        this.createColorKernelGroup()
    }

    private createLayout() {
        const { device, canvas_color_format } = this.engine

        this.canvas_layout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        format: canvas_color_format
                    }
                }
            ]
        })

        this.generation_layout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0, // generation A/B
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage'
                    }
                },
                {
                    binding: 1, // generation A/B
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage'
                    }
                }
            ]
        })

        this.color_kernel_layout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage'
                    }
                }
            ]
        })

        this.shader_layout = device.createPipelineLayout({
            bindGroupLayouts: [
                this.canvas_layout,
                this.generation_layout,
                this.color_kernel_layout
            ]
        })
    }

    private createGenerationGroups() {
        this.generation_group_AB = this.engine.device.createBindGroup({
            layout: this.generation_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.generation_A
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.generation_B
                    }
                }
            ]
        })

        this.generation_group_BA = this.engine.device.createBindGroup({
            layout: this.generation_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.generation_B
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.generation_A
                    }
                }
            ]
        })
    }

    private createColorKernelGroup() {
        this.color_kernel_group = this.engine.device.createBindGroup({
            layout: this.color_kernel_layout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.color_kernel
                    }
                }
            ]
        })
    }

    async setActivation(activation_shader: string) {
        const shader_code = createShader(
            activation_shader,
            this.engine.canvas_color_format
        )
        const { module, issues } = await this.engine.compileShader(shader_code)

        this.pipeline = this.engine.device.createComputePipeline({
            layout: this.shader_layout,
            compute: {
                module: module
            }
        })
        return issues
    }

    private redraw() {
        this.generation_A_is_current = !this.generation_A_is_current
        this.step()
    }

    setKernel(radius: number, data: number[]) {
        const buffer_data = new ArrayBuffer(kernelBufferSize(radius))

        const radius_view = new Uint32Array(buffer_data, 0, 1)
        radius_view[0] = radius

        const float_view = new Float32Array(buffer_data)
        float_view.set(data, 1)

        this.engine.updateBuffer(this.color_kernel, float_view, 32)
    }

    resetCanvas(canvas_width: number, redraw: boolean) {
        this.generation_A?.destroy()
        this.generation_B?.destroy()

        this.canvas_width = canvas_width
        this.canvas_height = this.engine.setCanvasWidth(canvas_width)

        const n_canvas_bytes = canvas_width * this.canvas_height * 4
        this.generation_A = this.engine.createStorageBuffer(
            null,
            n_canvas_bytes
        )
        this.generation_B = this.engine.createStorageBuffer(
            null,
            n_canvas_bytes
        )

        this.createGenerationGroups()
        this.reset(redraw)
    }

    reset(redraw: boolean) {
        const n_cells = this.canvas_width * this.canvas_height
        const random_data = new Float32Array(n_cells).map(Math.random)
        this.engine.updateBuffer(this.generation_A, random_data)
        this.generation_A_is_current = false

        if (redraw) {
            this.step()
        }
    }

    step(n_generations = 1): void {
        const device = this.engine.device
        const texture = this.engine.getTexture()
        const encoder = this.engine.beginComputePass()

        const canvas_bind_group = device.createBindGroup({
            layout: this.canvas_layout,
            entries: [
                {
                    binding: 0,
                    resource: texture.createView()
                }
            ]
        })
        encoder.setPipeline(this.pipeline)
        encoder.setBindGroup(0, canvas_bind_group)
        encoder.setBindGroup(2, this.color_kernel_group)

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

    setColor1(hex_color: string, redraw: boolean) {
        const { red, green, blue } = parseHexColor(hex_color)
        const shader_data = new Float32Array([
            red / 255,
            green / 255,
            blue / 255
        ])
        this.engine.updateBuffer(this.color_kernel, shader_data)

        if (redraw) {
            this.redraw()
        }
    }

    setColor2(hex_color: string, redraw: boolean) {
        const { red, green, blue } = parseHexColor(hex_color)
        const shader_data = new Float32Array([
            red / 255,
            green / 255,
            blue / 255
        ])
        this.engine.updateBuffer(this.color_kernel, shader_data, 16)

        if (redraw) {
            this.redraw()
        }
    }

    cleanup(): void {
        this.engine?.cleanup()
        this.generation_A?.destroy()
        this.generation_B?.destroy()
        this.color_kernel?.destroy()
    }
}
