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

import createNoiseShader, { type Setup } from './Shader'

export default class NoiseScene {
    engine!: Engine
    pipeline!: GPUComputePipeline

    n_grid_columns!: GPUBuffer
    z_coord!: GPUBuffer

    hash_table!: GPUBuffer
    rand_values!: GPUBuffer
    rand_points_2d!: GPUBuffer
    rand_points_3d!: GPUBuffer
    unit_vectors_2d!: GPUBuffer
    unit_vectors_3d!: GPUBuffer
    output_buffer!: GPUBuffer

    static_bind_group!: GPUBindGroup

    n_colors = 0
    color_points!: GPUBuffer
    color_bind_group!: GPUBindGroup

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.engine = new Engine()
        await this.engine.init(canvas)
        const { device, color_format } = this.engine

        const shader_code = createNoiseShader(setup.custom_noise_shader, color_format)
        const { module } = await this.engine.compileShader(shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
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

        const n_bytes = canvas.width * canvas.height * 4
        this.output_buffer = this.engine.createStorageBuffer(null, n_bytes)

        this.static_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
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
                {
                    binding: 8,
                    resource: { buffer: this.output_buffer },
                },
            ],
        })

        const color_points_data = setup.color_points || defaultColorPoints
        this.n_colors = color_points_data.length / 4
        this.color_points = this.engine.createStorageBuffer(color_points_data, 256)

        this.color_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.color_points,
                        size: color_points_data.byteLength,
                    },
                },
            ],
        })
        this.engine.initObserver(canvas, () => {
            this.render()
        })
    }

    render(): void {
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
        encoder.setBindGroup(1, this.static_bind_group)
        encoder.setBindGroup(2, this.color_bind_group)
        this.engine.encodeDraw(encoder, texture)
        encoder.end()

        this.engine.endPass(encoder)
    }

    updateNGridColumns(value: number) {
        this.engine.updateFloatUniform(this.n_grid_columns, value)
        this.render()
    }

    updateZCoord(value: number) {
        this.engine.updateFloatUniform(this.z_coord, value)
        this.render()
    }

    updateColorPoints(data: FloatArray) {
        this.engine.updateBuffer(this.color_points, data)
        const new_n_colors = data.length / 4

        if (new_n_colors != this.n_colors) {
            this.n_colors = new_n_colors
            this.color_bind_group = this.engine.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(2),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.color_points,
                            size: data.byteLength,
                        },
                    },
                ],
            })
        }
        this.render()
    }

    cleanup() {
        this.engine.cleanup()
        this.hash_table?.destroy()
        this.n_grid_columns?.destroy()
        this.z_coord?.destroy()
        this.color_points?.destroy()
    }
}
