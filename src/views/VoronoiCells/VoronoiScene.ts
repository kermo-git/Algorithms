import {
    compileShader,
    type InitInfo,
    type Scene,
    type ShaderIssue,
} from '@/WebGPU/ComputeRenderer'
import {
    type FloatArray,
    createFloatUniform,
    createIntUniform,
    createStorageBuffer,
    updateFloatUniform,
    updateIntUniform,
    updateBuffer,
} from '@/WebGPU/ShaderDataUtils'

import { generateHashTable, shaderRandomPoints2D } from '@/Noise/Buffers'
import { getNoiseShaderRandomElements } from '@/Noise/ShaderUtils'
import { type VoronoiSetup, voronoiShader, type VoronoiUniforms } from './VoronoiShader'

export default class VoronoiScene implements Scene {
    setup: VoronoiSetup

    constructor(setup: VoronoiSetup) {
        this.setup = setup
    }

    pipeline!: GPUComputePipeline

    getPipeline(): GPUComputePipeline {
        return this.pipeline
    }

    hash_table!: GPUBuffer

    voronoi_n_columns!: GPUBuffer
    voronoi_points!: GPUBuffer
    voronoi_color_grid!: GPUBuffer
    voronoi_colors!: GPUBuffer
    n_colors: number = 0

    noise_scale!: GPUBuffer
    noise_random_elements!: GPUBuffer
    noise_n_octaves!: GPUBuffer
    noise_persistence!: GPUBuffer
    noise_warp_strength!: GPUBuffer
    noise_z!: GPUBuffer

    static_bind_group!: GPUBindGroup
    color_bind_group!: GPUBindGroup

    async init(data: VoronoiUniforms, info: InitInfo): Promise<ShaderIssue[]> {
        const { device, color_format } = info
        const { warp_algorithm, warp_dimension } = this.setup

        const shader_code = `${voronoiShader(this.setup, color_format)}`

        const { module, issues } = await compileShader(device, shader_code)

        this.pipeline = device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: module,
            },
        })
        this.hash_table = createStorageBuffer(generateHashTable(256), device)
        this.voronoi_n_columns = createFloatUniform(data.voronoi_n_columns || 16, device)
        this.voronoi_points = createStorageBuffer(shaderRandomPoints2D(256), device)

        let bind_group_entries: GPUBindGroupEntry[] = [
            {
                binding: 0,
                resource: { buffer: this.hash_table },
            },
            {
                binding: 2,
                resource: { buffer: this.voronoi_n_columns },
            },
            {
                binding: 3,
                resource: { buffer: this.voronoi_points },
            },
        ]

        if (warp_algorithm && warp_dimension) {
            const random_elements = getNoiseShaderRandomElements(
                warp_algorithm,
                warp_dimension,
                256,
            )
            this.noise_scale = createFloatUniform(data.noise_scale || 1, device)
            this.noise_random_elements = createStorageBuffer(random_elements, device)
            this.noise_n_octaves = createIntUniform(data.noise_n_octaves || 1, device)
            this.noise_persistence = createFloatUniform(data.noise_persistence || 0.5, device)
            this.noise_warp_strength = createFloatUniform(data.noise_warp_strength || 1, device)

            bind_group_entries = bind_group_entries.concat([
                {
                    binding: 1,
                    resource: { buffer: this.noise_random_elements },
                },
                {
                    binding: 5,
                    resource: { buffer: this.noise_scale },
                },
                {
                    binding: 6,
                    resource: { buffer: this.noise_n_octaves },
                },
                {
                    binding: 7,
                    resource: { buffer: this.noise_persistence },
                },
                {
                    binding: 8,
                    resource: { buffer: this.noise_warp_strength },
                },
            ])
            if (warp_dimension === '3D') {
                this.noise_z = createFloatUniform(data.noise_z || 0, device)
                bind_group_entries.push({
                    binding: 9,
                    resource: { buffer: this.noise_z },
                })
            }
        }

        this.static_bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: bind_group_entries,
        })

        this.n_colors = data.voronoi_colors!.length / 4
        this.voronoi_colors = createStorageBuffer(data.voronoi_colors!, device, 256)

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

        return issues
    }

    render(encoder: GPUComputePassEncoder): void {
        encoder.setBindGroup(1, this.static_bind_group)
        encoder.setBindGroup(2, this.color_bind_group)
    }

    updateVoronoiNColumns(value: number, device: GPUDevice) {
        updateFloatUniform(this.voronoi_n_columns, value, device)
    }

    updateVoronoiColorGrid(value: FloatArray, device: GPUDevice) {
        updateBuffer(this.voronoi_color_grid, value, device)
    }

    updateVoronoiColors(value: FloatArray, device: GPUDevice) {
        updateBuffer(this.voronoi_colors, value, device)
        const new_n_colors = value.length / 4

        if (new_n_colors != this.n_colors) {
            this.n_colors = new_n_colors

            this.color_bind_group = device.createBindGroup({
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
    }

    updateNoiseScale(value: number, device: GPUDevice) {
        updateFloatUniform(this.noise_scale, value, device)
    }

    updateNoiseOctaves(value: number, device: GPUDevice) {
        updateIntUniform(this.noise_n_octaves, value, device)
    }

    updateNoisePersistence(value: number, device: GPUDevice) {
        updateFloatUniform(this.noise_persistence, value, device)
    }

    updateNoiseWarpStrength(value: number, device: GPUDevice) {
        updateFloatUniform(this.noise_warp_strength, value, device)
    }

    updateNoiseZ(value: number, device: GPUDevice) {
        updateFloatUniform(this.noise_z, value, device)
    }

    cleanup() {
        this.hash_table?.destroy()

        this.voronoi_n_columns?.destroy()
        this.voronoi_points?.destroy()
        this.voronoi_color_grid?.destroy()
        this.voronoi_colors?.destroy()

        this.noise_random_elements?.destroy()
        this.noise_scale?.destroy()
        this.noise_n_octaves?.destroy()
        this.noise_persistence?.destroy()
        this.noise_warp_strength?.destroy()
        this.noise_z?.destroy()
    }
}
