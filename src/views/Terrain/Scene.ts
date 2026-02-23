import Engine, { WG_DIM } from '@/WebGPU/Engine'

import { type Setup, startElevationShader, flatDisplayShader } from './Shader'
import {
    NOISE_GROUP,
    TERRAIN_GROUP,
    CANVAS_GROUP,
    createCanvasLayout,
    createNoiseLayout,
    createTerrainLayout,
} from './Layout'
import { generateHashChannels, generateNoiseFeatures } from '@/Noise/SeedData'

export default class TerrainScene {
    setup!: Setup
    engine!: Engine

    n_workgroups_x!: number
    n_workgroups_y!: number

    noise_pipeline!: GPUComputePipeline
    flat_display_pipeline!: GPUComputePipeline
    terrain_display_pipeline!: GPUComputePipeline
    erosion_pipeline!: GPUComputePipeline

    noise_layout!: GPUBindGroupLayout
    noise_group!: GPUBindGroup
    n_grid_columns!: GPUBuffer
    hash_table!: GPUBuffer
    noise_features!: GPUBuffer

    terrain_A!: GPUBuffer
    terrain_B!: GPUBuffer
    terrain_layout!: GPUBindGroupLayout
    terrain_group_AB!: GPUBindGroup
    terrain_group_BA!: GPUBindGroup
    current_terrain_group!: GPUBindGroup

    canvas_layout!: GPUBindGroupLayout

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.setup = setup
        canvas.width = setup.n_pixels_x
        canvas.height = setup.n_pixels_y

        this.n_workgroups_x = Math.ceil(this.setup.n_pixels_x / WG_DIM)
        this.n_workgroups_y = Math.ceil(this.setup.n_pixels_y / WG_DIM)

        const engine = new Engine()
        this.engine = engine
        await engine.init(canvas)

        this.canvas_layout = createCanvasLayout(engine.device, engine.color_format)
        this.noise_layout = createNoiseLayout(engine.device)
        this.terrain_layout = createTerrainLayout(engine.device)

        await this.updateStartElevationShader(setup.start_elevation_shader)
        await this.updateColorShader(setup.color_shader)

        this.n_grid_columns = engine.createFloatUniform(setup.n_grid_cells_x || 16)
        this.hash_table = engine.createStorageBuffer(generateHashChannels(256, 8))
        this.noise_features = engine.createStorageBuffer(generateNoiseFeatures(256))

        this.noise_group = engine.device.createBindGroup({
            layout: this.noise_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.n_grid_columns },
                },
                {
                    binding: 1,
                    resource: { buffer: this.hash_table },
                },
                {
                    binding: 2,
                    resource: { buffer: this.noise_features },
                },
            ],
        })

        const n_bytes = setup.n_pixels_x * setup.n_pixels_y * 48
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
        this.current_terrain_group = this.terrain_group_AB
    }

    updateNGridColumns(value: number) {
        this.engine.updateFloatUniform(this.n_grid_columns, value)
        this.renderNoise()
    }

    async updateStartElevationShader(code: string) {
        this.setup.start_elevation_shader = code

        const start_elevation_shader = await this.engine.compileShader(
            startElevationShader(this.setup),
        )

        this.noise_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.noise_layout, this.terrain_layout],
            }),
            compute: {
                module: start_elevation_shader.module,
            },
        })
    }

    async updateColorShader(code: string) {
        this.setup.color_shader = code

        const flat_display_shader = await this.engine.compileShader(
            flatDisplayShader(this.setup, this.engine.color_format),
        )

        this.flat_display_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.noise_layout, this.terrain_layout, this.canvas_layout],
            }),
            compute: {
                module: flat_display_shader.module,
            },
        })
    }

    draw(encoder: GPUComputePassEncoder) {
        encoder.dispatchWorkgroups(this.n_workgroups_x, this.n_workgroups_y)
    }

    noisePass(encoder: GPUCommandEncoder, terrain_group: GPUBindGroup) {
        const pass_encoder = encoder.beginComputePass()
        pass_encoder.setPipeline(this.noise_pipeline)
        pass_encoder.setBindGroup(NOISE_GROUP, this.noise_group)
        pass_encoder.setBindGroup(TERRAIN_GROUP, terrain_group)
        this.draw(pass_encoder)
        pass_encoder.end()
    }

    colorPass(encoder: GPUCommandEncoder, terrain_group: GPUBindGroup) {
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
        pass_encoder.setPipeline(this.noise_pipeline)
        pass_encoder.setBindGroup(NOISE_GROUP, this.noise_group)
        pass_encoder.setBindGroup(TERRAIN_GROUP, terrain_group)
        pass_encoder.setBindGroup(CANVAS_GROUP, canvas_group)

        this.draw(pass_encoder)
        pass_encoder.end()
    }

    renderNoise(): void {
        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()
        this.noisePass(cmd_encoder, this.terrain_group_AB)
        this.colorPass(cmd_encoder, this.terrain_group_BA)
        device.queue.submit([cmd_encoder.finish()])
        this.current_terrain_group = this.terrain_group_BA
    }

    renderColor() {
        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()
        this.colorPass(cmd_encoder, this.current_terrain_group)
        device.queue.submit([cmd_encoder.finish()])
    }

    cleanup() {
        this.engine?.cleanup()
        this.hash_table?.destroy()
        this.n_grid_columns?.destroy()
        this.hash_table?.destroy()
        this.noise_features?.destroy()
        this.terrain_A?.destroy()
        this.terrain_B?.destroy()
    }
}
