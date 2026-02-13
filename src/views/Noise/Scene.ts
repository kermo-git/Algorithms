import Engine, { type FloatArray } from '@/WebGPU/Engine'

import { defaultColorPoints, hashTable } from '@/Noise/SeedData'

import createNoiseShader, { type Setup, type NoiseUniforms } from './Shader'

export default class NoiseScene {
    setup: Setup

    constructor(setup: Setup) {
        this.setup = setup
    }

    engine!: Engine
    pipeline!: GPUComputePipeline

    hash_table!: GPUBuffer
    random_elements!: GPUBuffer
    n_grid_columns!: GPUBuffer
    n_main_octaves!: GPUBuffer
    persistence!: GPUBuffer
    z_coord!: GPUBuffer
    w_coord!: GPUBuffer
    n_warp_octaves!: GPUBuffer
    warp_strength!: GPUBuffer
    static_bind_group!: GPUBindGroup

    n_colors = 0
    color_points!: GPUBuffer
    color_bind_group!: GPUBindGroup

    async init(data: NoiseUniforms, canvas: HTMLCanvasElement) {
        this.engine = new Engine()
        await this.engine.init(canvas)

        const { device, color_format } = this.engine
        const { algorithm, transform } = this.setup

        const shader_code = createNoiseShader(this.setup, color_format)
        const random_elements = algorithm.generateFeatures(256)

        const { module } = await this.engine.compileShader(shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })
        this.hash_table = this.engine.createStorageBuffer(hashTable(256))
        this.random_elements = this.engine.createStorageBuffer(random_elements)
        this.n_grid_columns = this.engine.createFloatUniform(data.n_grid_columns || 16)
        this.n_main_octaves = this.engine.createIntUniform(data.n_main_octaves || 1)
        this.persistence = this.engine.createFloatUniform(data.persistence || 0.5)

        const bind_group_entries = [
            {
                binding: 0,
                resource: { buffer: this.hash_table },
            },
            {
                binding: 1,
                resource: { buffer: this.random_elements },
            },
            {
                binding: 2,
                resource: { buffer: this.n_grid_columns },
            },
            {
                binding: 3,
                resource: { buffer: this.n_main_octaves },
            },
            {
                binding: 4,
                resource: { buffer: this.persistence },
            },
        ]

        if (algorithm.pos_type !== 'vec2f') {
            this.z_coord = this.engine.createFloatUniform(data.z_coord || 0)
            bind_group_entries.push({
                binding: 5,
                resource: { buffer: this.z_coord },
            })
            if (algorithm.pos_type === 'vec4f') {
                this.w_coord = this.engine.createFloatUniform(data.w_coord || 0)
                bind_group_entries.push({
                    binding: 6,
                    resource: { buffer: this.w_coord },
                })
            }
        }
        if (transform === 'Warp' || transform === 'Warp 2X') {
            this.n_warp_octaves = this.engine.createIntUniform(data.n_warp_octaves || 1)
            this.warp_strength = this.engine.createFloatUniform(data.warp_strength || 1)

            bind_group_entries.push({
                binding: 7,
                resource: { buffer: this.n_warp_octaves },
            })
            bind_group_entries.push({
                binding: 8,
                resource: { buffer: this.warp_strength },
            })
        }

        this.static_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: bind_group_entries,
        })

        const color_points_data = data.color_points || defaultColorPoints
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

    updateNMainOctaves(value: number) {
        this.engine.updateIntUniform(this.n_main_octaves, value)
        this.render()
    }

    updatePersistence(value: number) {
        this.engine.updateFloatUniform(this.persistence, value)
        this.render()
    }

    updateZCoord(value: number) {
        this.engine.updateFloatUniform(this.z_coord, value)
        this.render()
    }

    updateWCoord(value: number) {
        this.engine.updateFloatUniform(this.w_coord, value)
        this.render()
    }

    updateNWarpOctaves(value: number) {
        this.engine.updateIntUniform(this.n_warp_octaves, value)
        this.render()
    }

    updateWarpStrength(value: number) {
        this.engine.updateFloatUniform(this.warp_strength, value)
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
        this.random_elements?.destroy()
        this.n_grid_columns?.destroy()
        this.n_main_octaves?.destroy()
        this.persistence?.destroy()
        this.z_coord?.destroy()
        this.w_coord?.destroy()
        this.warp_strength?.destroy()
        this.color_points?.destroy()
    }
}
