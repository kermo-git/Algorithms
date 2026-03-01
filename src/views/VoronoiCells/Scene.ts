import Engine, { type FloatArray } from '@/WebGPU/Engine'

import { type Setup, createShader, type UniformData } from './Shader'

export default class VoronoiScene {
    setup: Setup

    constructor(setup: Setup) {
        this.setup = setup
    }

    engine!: Engine
    pipeline!: GPUComputePipeline

    voronoi_n_columns!: GPUBuffer
    voronoi_color_grid!: GPUBuffer
    voronoi_colors!: GPUBuffer
    n_colors: number = 0

    noise_scale!: GPUBuffer
    noise_data!: GPUBuffer
    noise_n_octaves!: GPUBuffer
    noise_persistence!: GPUBuffer
    noise_warp_strength!: GPUBuffer
    noise_z!: GPUBuffer

    static_bind_group!: GPUBindGroup
    color_bind_group!: GPUBindGroup

    async init(data: UniformData, canvas: HTMLCanvasElement) {
        this.engine = new Engine()
        await this.engine.init(canvas)

        const { device, color_format } = this.engine
        const { warp_algorithm } = this.setup

        const shader_code = `${createShader(this.setup, color_format)}`

        const { module } = await this.engine.compileShader(shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })
        this.voronoi_n_columns = this.engine.createFloatUniform(data.voronoi_n_columns || 16)
        this.noise_scale = this.engine.createFloatUniform(data.noise_scale || 1)
        this.noise_n_octaves = this.engine.createIntUniform(data.noise_n_octaves || 1)
        this.noise_persistence = this.engine.createFloatUniform(data.noise_persistence || 0.5)
        this.noise_warp_strength = this.engine.createFloatUniform(data.noise_warp_strength || 0)

        const bind_group_entries: GPUBindGroupEntry[] = [
            {
                binding: 0,
                resource: { buffer: this.voronoi_n_columns },
            },
            {
                binding: 1,
                resource: { buffer: this.noise_scale },
            },
            {
                binding: 2,
                resource: { buffer: this.noise_n_octaves },
            },
            {
                binding: 3,
                resource: { buffer: this.noise_persistence },
            },
            {
                binding: 4,
                resource: { buffer: this.noise_warp_strength },
            },
        ]

        if (warp_algorithm.pos_type === 'vec3f') {
            this.noise_z = this.engine.createFloatUniform(data.noise_z || 0)
            bind_group_entries.push({
                binding: 5,
                resource: { buffer: this.noise_z },
            })
        }

        if (warp_algorithm.extra_data_type) {
            const data = warp_algorithm.generateExtraData!()
            this.noise_data = this.engine.createStorageBuffer(data)
            bind_group_entries.push({
                binding: 6,
                resource: { buffer: this.noise_data },
            })
        }

        this.static_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: bind_group_entries,
        })

        this.n_colors = data.voronoi_colors!.length / 4
        this.voronoi_colors = this.engine.createStorageBuffer(data.voronoi_colors!, 256)

        this.color_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.voronoi_colors,
                        size: data.voronoi_colors!.byteLength,
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

    updateVoronoiNColumns(value: number) {
        this.engine.updateFloatUniform(this.voronoi_n_columns, value)
        this.render()
    }

    updateVoronoiColorGrid(value: FloatArray) {
        this.engine.updateBuffer(this.voronoi_color_grid, value)
        this.render()
    }

    updateVoronoiColors(value: FloatArray) {
        this.engine.updateBuffer(this.voronoi_colors, value)
        const new_n_colors = value.length / 4

        if (new_n_colors != this.n_colors) {
            this.n_colors = new_n_colors

            this.color_bind_group = this.engine.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(2),
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: this.voronoi_colors,
                            size: value.byteLength,
                        },
                    },
                ],
            })
        }
        this.render()
    }

    updateNoiseScale(value: number) {
        this.engine.updateFloatUniform(this.noise_scale, value)
        this.render()
    }

    updateNoiseOctaves(value: number) {
        this.engine.updateIntUniform(this.noise_n_octaves, value)
        this.render()
    }

    updateNoisePersistence(value: number) {
        this.engine.updateFloatUniform(this.noise_persistence, value)
        this.render()
    }

    updateNoiseWarpStrength(value: number) {
        this.engine.updateFloatUniform(this.noise_warp_strength, value)
        this.render()
    }

    updateNoiseZ(value: number) {
        this.engine.updateFloatUniform(this.noise_z, value)
        this.render()
    }

    cleanup() {
        this.engine.cleanup()

        this.voronoi_n_columns?.destroy()
        this.voronoi_color_grid?.destroy()
        this.voronoi_colors?.destroy()

        this.noise_data?.destroy()
        this.noise_scale?.destroy()
        this.noise_n_octaves?.destroy()
        this.noise_persistence?.destroy()
        this.noise_warp_strength?.destroy()
        this.noise_z?.destroy()
    }
}
