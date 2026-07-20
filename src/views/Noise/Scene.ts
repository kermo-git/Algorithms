import Engine, { type FloatArray } from '@/WebGPU/Engine'

import createNoiseShader, { type Setup } from './Shader'
import { parseHexColor } from '@/utils/Colors'

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

    n_colors!: GPUBuffer
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

        const colors = setup.colors || ['#000000', '#FFFFFF']
        const color_points = setup.color_points || [0, 1]
        const color_data = this.createColorData(colors, color_points)

        this.n_colors = this.engine.createIntUniform(colors.length)
        this.color_points = this.engine.createStorageBuffer(color_data, 256)

        this.color_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.color_points,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.n_colors,
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

    createColorData(colors: string[], points: number[]) {
        const result = new Float32Array(colors.length * 4)

        for (let i = 0; i < colors.length; i++) {
            const { red, green, blue } = parseHexColor(colors[i])
            const offset = 4 * i

            result[offset + 0] = red / 255
            result[offset + 1] = green / 255
            result[offset + 2] = blue / 255
            result[offset + 3] = points[i]
        }
        return result
    }

    updateColor(index: number, hex_color: string) {
        const { red, green, blue } = parseHexColor(hex_color)
        const bytes = new Float32Array([red / 255, green / 255, blue / 255])

        const offset = 16 * index
        this.engine.updateBuffer(this.color_points, bytes, offset)
        this.render()
    }

    updateColorPoint(index: number, value: number) {
        const offset = 16 * index + 12
        this.engine.updateBuffer(this.color_points, new Float32Array([value]), offset)
        this.render()
    }

    updateColorData(colors: string[], points: number[]) {
        const new_data = this.createColorData(colors, points)
        this.engine.updateBuffer(this.color_points, new_data)
        this.engine.updateIntUniform(this.n_colors, colors.length)
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
        this.n_colors?.destroy()
    }
}
