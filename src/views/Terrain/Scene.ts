import Engine, { type FloatArray } from '@/WebGPU/Engine'

import {
    defaultColorPoints,
    hashTable,
    randomPoints2D,
    randomPoints3D,
    randomValues,
    unitVectors2D,
    unitVectors3D,
} from '@/Noise/SeedData'

import { type Setup, calculateNoiseShader, flatDisplayShader } from './Shader'
import {
    createCanvasBindGroupLayout,
    createNoiseBindGroupLayout,
    createOutputBindGroupLayout,
} from './Layout'

export default class NoiseScene {
    engine!: Engine

    noise_pipeline!: GPUComputePipeline
    flat_display_pipeline!: GPUComputePipeline
    terrain_display_pipeline!: GPUComputePipeline
    erosion_pipeline!: GPUComputePipeline

    noise_bind_group!: GPUBindGroup
    n_grid_columns!: GPUBuffer
    z_coord!: GPUBuffer
    hash_table!: GPUBuffer
    rand_values!: GPUBuffer
    rand_points_2d!: GPUBuffer
    rand_points_3d!: GPUBuffer
    unit_vectors_2d!: GPUBuffer
    unit_vectors_3d!: GPUBuffer

    buffer_A!: GPUBuffer
    buffer_B!: GPUBuffer
    bind_group_AB!: GPUBindGroup
    bind_group_BA!: GPUBindGroup

    canvas_layout!: GPUBindGroupLayout

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.engine = new Engine()
        await this.engine.init(canvas)
        const { device, color_format } = this.engine

        const noise_layout = createNoiseBindGroupLayout(device)
        const output_layout = createOutputBindGroupLayout(device)
        this.canvas_layout = createCanvasBindGroupLayout(device, color_format)

        const noise_shader = await this.engine.compileShader(
            calculateNoiseShader(setup.custom_noise_shader),
        )
        this.noise_pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [noise_layout, output_layout],
            }),
            compute: {
                module: noise_shader.module,
            },
        })

        const flat_display_shader = await this.engine.compileShader(flatDisplayShader(color_format))

        this.flat_display_pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [output_layout, this.canvas_layout],
            }),
            compute: {
                module: flat_display_shader.module,
            },
        })

        this.n_grid_columns = this.engine.createFloatUniform(setup.n_grid_columns || 16)
        this.z_coord = this.engine.createFloatUniform(setup.z_coord || 0)
        this.hash_table = this.engine.createStorageBuffer(hashTable(256))
        this.rand_values = this.engine.createStorageBuffer(randomValues(256))
        this.rand_points_2d = this.engine.createStorageBuffer(randomPoints2D(256))
        this.rand_points_3d = this.engine.createStorageBuffer(randomPoints3D(256))
        this.unit_vectors_2d = this.engine.createStorageBuffer(unitVectors2D(256))
        this.unit_vectors_3d = this.engine.createStorageBuffer(unitVectors3D(256))

        this.noise_bind_group = device.createBindGroup({
            layout: noise_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.n_grid_columns },
                },
                {
                    binding: 1,
                    resource: { buffer: this.z_coord },
                },
                {
                    binding: 2,
                    resource: { buffer: this.hash_table },
                },
                {
                    binding: 3,
                    resource: { buffer: this.rand_values },
                },
                {
                    binding: 4,
                    resource: { buffer: this.rand_points_2d },
                },
                {
                    binding: 5,
                    resource: { buffer: this.rand_points_3d },
                },
                {
                    binding: 6,
                    resource: { buffer: this.unit_vectors_2d },
                },
                {
                    binding: 7,
                    resource: { buffer: this.unit_vectors_3d },
                },
            ],
        })

        const n_bytes = canvas.width * canvas.height * 4
        this.buffer_A = this.engine.createStorageBuffer(null, n_bytes)
        this.buffer_B = this.engine.createStorageBuffer(null, n_bytes)

        this.bind_group_AB = device.createBindGroup({
            layout: output_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffer_A },
                },
                {
                    binding: 1,
                    resource: { buffer: this.buffer_B },
                },
            ],
        })

        this.bind_group_BA = device.createBindGroup({
            layout: output_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.buffer_B },
                },
                {
                    binding: 1,
                    resource: { buffer: this.buffer_A },
                },
            ],
        })
    }

    renderNoise(): void {
        const texture = this.engine.getTexture()
        const canvas_bind_group = this.engine.device.createBindGroup({
            layout: this.canvas_layout,
            entries: [
                {
                    binding: 0,
                    resource: texture.createView(),
                },
            ],
        })

        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()
        let pass_encoder = cmd_encoder.beginComputePass()

        pass_encoder.setPipeline(this.noise_pipeline)
        pass_encoder.setBindGroup(0, this.noise_bind_group)
        pass_encoder.setBindGroup(1, this.bind_group_AB)
        this.engine.encodeDraw(pass_encoder, texture)
        pass_encoder.end()

        pass_encoder = cmd_encoder.beginComputePass()
        pass_encoder.setPipeline(this.flat_display_pipeline)
        pass_encoder.setBindGroup(0, this.bind_group_BA)
        pass_encoder.setBindGroup(0, canvas_bind_group)

        pass_encoder.end()

        device.queue.submit([cmd_encoder.finish()])
    }

    updateNGridColumns(value: number) {
        this.engine.updateFloatUniform(this.n_grid_columns, value)
        this.renderNoise()
    }

    updateZCoord(value: number) {
        this.engine.updateFloatUniform(this.z_coord, value)
        this.renderNoise()
    }

    cleanup() {
        this.engine.cleanup()
        this.hash_table?.destroy()
        this.n_grid_columns?.destroy()
        this.z_coord?.destroy()
    }
}
