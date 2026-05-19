import Engine, { WG_DIM } from '@/WebGPU/Engine'

import { type Setup, noiseShader, display2DShader, colorShader, display3DShader } from './Shader'
import {
    createNoiseLayout,
    createTerrainLayout,
    createUniformsLayout,
    createCanvasLayout,
} from './Layout'
import { generateUnitVectors2D, generateUnitVectors3D } from '@/Noise/UnitVectors'
import type { Mat4x4 } from '@/WebGPU/Geometry'

export default class TerrainScene {
    setup!: Setup
    engine!: Engine

    n_workgroups_x!: number
    n_workgroups_y!: number

    noise_pipeline!: GPUComputePipeline
    erosion_pipeline!: GPUComputePipeline
    color_pipeline!: GPUComputePipeline
    display_2D_pipeline!: GPUComputePipeline
    display_3D_pipeline!: GPUComputePipeline
    selected_display_pipeline!: GPUComputePipeline

    noise_layout!: GPUBindGroupLayout
    noise_group!: GPUBindGroup
    unit_vectors_2D!: GPUBuffer
    unit_vectors_3D!: GPUBuffer

    terrain_A!: GPUBuffer
    terrain_B!: GPUBuffer
    terrain_layout!: GPUBindGroupLayout
    terrain_group_AB!: GPUBindGroup
    terrain_group_BA!: GPUBindGroup

    uniforms_layout!: GPUBindGroupLayout
    uniforms_group!: GPUBindGroup
    light!: GPUBuffer
    camera!: GPUBuffer

    canvas_layout!: GPUBindGroupLayout

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.setup = setup
        canvas.width = setup.terrain_dims[0]
        canvas.height = setup.terrain_dims[1]

        this.n_workgroups_x = Math.ceil(this.setup.terrain_dims[0] / WG_DIM)
        this.n_workgroups_y = Math.ceil(this.setup.terrain_dims[1] / WG_DIM)

        const engine = new Engine()
        this.engine = engine
        await engine.init(canvas)

        this.noise_layout = createNoiseLayout(engine.device)
        this.terrain_layout = createTerrainLayout(engine.device)
        this.uniforms_layout = createUniformsLayout(engine.device)
        this.canvas_layout = createCanvasLayout(engine.device, engine.color_format)

        await this.createNoiseShader()
        await this.createColorShader()
        await this.createDisplay2DShader()
        await this.createDisplay3DShader()
        this.selected_display_pipeline = setup.render_3D
            ? this.display_3D_pipeline
            : this.display_2D_pipeline

        this.unit_vectors_2D = engine.createStorageBuffer(generateUnitVectors2D(16))
        this.unit_vectors_3D = engine.createStorageBuffer(generateUnitVectors3D(64))

        this.noise_group = engine.device.createBindGroup({
            layout: this.noise_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.unit_vectors_2D },
                },
                {
                    binding: 1,
                    resource: { buffer: this.unit_vectors_3D },
                },
            ],
        })

        const n_bytes = setup.terrain_dims[0] * setup.terrain_dims[1] * 64
        this.terrain_A = this.engine.createStorageBuffer(null, n_bytes)
        this.terrain_B = this.engine.createStorageBuffer(null, n_bytes)

        this.terrain_group_AB = engine.device.createBindGroup({
            layout: this.terrain_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.terrain_A },
                },
                {
                    binding: 1,
                    resource: { buffer: this.terrain_B },
                },
            ],
        })

        this.terrain_group_BA = engine.device.createBindGroup({
            layout: this.terrain_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.terrain_B },
                },
                {
                    binding: 1,
                    resource: { buffer: this.terrain_A },
                },
            ],
        })

        this.light = engine.createUniformBuffer(
            new Float32Array([...setup.light_dir, setup.ambient_intensity]),
        )
        this.camera = engine.createUniformBuffer(
            new Float32Array([
                ...setup.camera_pos,
                0,
                ...setup.camera_rotation.toWebGPU_rotation_mat3x3(),
            ]),
        )
        this.uniforms_group = engine.device.createBindGroup({
            layout: createUniformsLayout(engine.device),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.light },
                },
                {
                    binding: 1,
                    resource: { buffer: this.camera },
                },
            ],
        })
        this.renderNoise(this.selected_display_pipeline)
    }

    private async createNoiseShader() {
        const { module, issues } = await this.engine.compileShader(noiseShader(this.setup))

        this.noise_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.noise_layout, this.terrain_layout],
            }),
            compute: {
                module: module,
            },
        })
        return issues
    }

    private async createColorShader() {
        const { module, issues } = await this.engine.compileShader(colorShader(this.setup))

        this.color_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.noise_layout, this.terrain_layout],
            }),
            compute: {
                module: module,
            },
        })
        return issues
    }

    private async createDisplay2DShader() {
        const { module } = await this.engine.compileShader(
            display2DShader(this.setup, this.engine.color_format),
        )
        this.display_2D_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.canvas_layout, this.terrain_layout, this.uniforms_layout],
            }),
            compute: {
                module: module,
            },
        })
    }

    private async createDisplay3DShader() {
        const { module } = await this.engine.compileShader(
            display3DShader(this.setup, this.engine.color_format),
        )
        this.display_3D_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.canvas_layout, this.terrain_layout, this.uniforms_layout],
            }),
            compute: {
                module: module,
            },
        })
    }

    private draw(encoder: GPUComputePassEncoder) {
        encoder.dispatchWorkgroups(this.n_workgroups_x, this.n_workgroups_y)
    }

    private computePass(
        encoder: GPUCommandEncoder,
        pipeline: GPUComputePipeline,
        terrain_group: GPUBindGroup,
    ) {
        const pass_encoder = encoder.beginComputePass()
        pass_encoder.setPipeline(pipeline)
        pass_encoder.setBindGroup(0, this.noise_group)
        pass_encoder.setBindGroup(1, terrain_group)
        this.draw(pass_encoder)
        pass_encoder.end()
    }

    private displayPass(
        encoder: GPUCommandEncoder,
        terrain_group: GPUBindGroup,
        display_pipeline: GPUComputePipeline,
    ) {
        const texture = this.engine.getTexture()
        const canvas_group = this.engine.device.createBindGroup({
            layout: this.canvas_layout,
            entries: [
                {
                    binding: 0,
                    resource: texture.createView(),
                },
            ],
        })

        const pass_encoder = encoder.beginComputePass()
        pass_encoder.setPipeline(display_pipeline)
        pass_encoder.setBindGroup(0, canvas_group)
        pass_encoder.setBindGroup(1, terrain_group)
        pass_encoder.setBindGroup(2, this.uniforms_group)

        this.draw(pass_encoder)
        pass_encoder.end()
    }

    private renderNoise(display_pipeline: GPUComputePipeline) {
        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()
        this.computePass(cmd_encoder, this.noise_pipeline, this.terrain_group_AB)
        this.computePass(cmd_encoder, this.color_pipeline, this.terrain_group_BA)
        this.displayPass(cmd_encoder, this.terrain_group_AB, display_pipeline)
        device.queue.submit([cmd_encoder.finish()])
    }

    private renderColor(display_pipeline: GPUComputePipeline) {
        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()
        this.computePass(cmd_encoder, this.color_pipeline, this.terrain_group_BA)
        this.displayPass(cmd_encoder, this.terrain_group_AB, display_pipeline)
        device.queue.submit([cmd_encoder.finish()])
    }

    private renderDisplay(display_pipeline: GPUComputePipeline) {
        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()
        this.displayPass(cmd_encoder, this.terrain_group_AB, display_pipeline)
        device.queue.submit([cmd_encoder.finish()])
    }

    setDisplay2D() {
        this.renderDisplay(this.display_2D_pipeline)
        this.selected_display_pipeline = this.display_2D_pipeline
    }

    setDisplay3D() {
        this.renderDisplay(this.display_3D_pipeline)
        this.selected_display_pipeline = this.display_3D_pipeline
    }

    setLight(dir: number[], ambient_intensity: number) {
        this.setup.light_dir = dir
        this.setup.ambient_intensity = ambient_intensity

        this.engine.updateBuffer(
            this.light,
            new Float32Array([...this.setup.light_dir, this.setup.ambient_intensity]),
        )
        this.renderDisplay(this.selected_display_pipeline)
    }

    setCamera(pos: number[], rotation: Mat4x4) {
        this.setup.camera_pos = pos
        this.setup.camera_rotation = rotation

        this.engine.updateBuffer(
            this.camera,
            new Float32Array([
                ...this.setup.camera_pos,
                0,
                ...this.setup.camera_rotation.toWebGPU_rotation_mat3x3(),
            ]),
        )
        this.renderDisplay(this.selected_display_pipeline)
    }

    async updateNoiseShader(code: string) {
        this.setup.noise_shader = code

        const issues = await this.createNoiseShader()
        if (issues.length === 0) {
            this.renderNoise(this.selected_display_pipeline)
        }
        return issues
    }

    async updateColorShader(code: string) {
        this.setup.color_shader = code

        const issues = await this.createColorShader()
        if (issues.length === 0) {
            this.renderColor(this.selected_display_pipeline)
        }
        return issues
    }

    cleanup() {
        this.engine?.cleanup()
        this.light?.destroy()
        this.unit_vectors_2D?.destroy()
        this.unit_vectors_3D?.destroy()
        this.terrain_A?.destroy()
        this.terrain_B?.destroy()
    }
}
