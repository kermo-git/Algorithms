import Engine, { type FloatArray } from '@/WebGPU/Engine'

import createNoiseShader, { type Setup } from './Shader'

export const defaultColorPoints = new Float32Array([0, 0, 0, 0, 1, 1, 1, 1])

export default class NoiseScene {
    setup!: Setup

    engine!: Engine
    pipeline!: GPUComputePipeline

    noise_data!: GPUBuffer
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

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.setup = setup
        this.engine = new Engine()
        await this.engine.init(canvas)
        canvas.width = 1
        canvas.height = 1

        const { device, canvas_color_format } = this.engine
        const { algorithm, transform } = this.setup

        const shader_code = createNoiseShader(this.setup, canvas_color_format)

        const { module } = await this.engine.compileShader(shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })
        this.n_grid_columns = this.engine.createFloatUniform(setup.n_grid_columns || 16)
        this.n_main_octaves = this.engine.createIntUniform(setup.n_main_octaves || 1)
        this.persistence = this.engine.createFloatUniform(setup.persistence || 0.5)

        const bind_group_entries = [
            {
                binding: 0,
                resource: { buffer: this.n_grid_columns },
            },
            {
                binding: 1,
                resource: { buffer: this.n_main_octaves },
            },
            {
                binding: 2,
                resource: { buffer: this.persistence },
            },
        ]

        if (algorithm.extra_data_type) {
            const data = algorithm.generateExtraData!()
            this.noise_data = this.engine.createStorageBuffer(data)

            bind_group_entries.push({
                binding: 3,
                resource: { buffer: this.noise_data },
            })
        }

        if (algorithm.pos_type !== 'vec2f') {
            this.z_coord = this.engine.createFloatUniform(setup.z_coord || 0)
            bind_group_entries.push({
                binding: 4,
                resource: { buffer: this.z_coord },
            })
            if (algorithm.pos_type === 'vec4f') {
                this.w_coord = this.engine.createFloatUniform(setup.w_coord || 0)
                bind_group_entries.push({
                    binding: 5,
                    resource: { buffer: this.w_coord },
                })
            }
        }
        if (transform === 'Warp' || transform === 'Warp 2X') {
            this.n_warp_octaves = this.engine.createIntUniform(setup.n_warp_octaves || 1)
            this.warp_strength = this.engine.createFloatUniform(setup.warp_strength || 1)

            bind_group_entries.push({
                binding: 6,
                resource: { buffer: this.n_warp_octaves },
            })
            bind_group_entries.push({
                binding: 7,
                resource: { buffer: this.warp_strength },
            })
        }

        this.static_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: bind_group_entries,
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
        encoder.setBindGroup(1, this.static_bind_group)
        encoder.setBindGroup(2, this.color_bind_group)
        this.engine.encodeCompute(encoder, texture.width, texture.height)
        encoder.end()

        this.engine.endComputePass(encoder)
    }

    updateGridDimensions(n_columns: number) {
        this.engine.updateFloatUniform(this.n_grid_columns, n_columns)
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
        this.noise_data?.destroy()
        this.n_grid_columns?.destroy()
        this.n_main_octaves?.destroy()
        this.persistence?.destroy()
        this.z_coord?.destroy()
        this.w_coord?.destroy()
        this.warp_strength?.destroy()
        this.color_points?.destroy()
    }
}
