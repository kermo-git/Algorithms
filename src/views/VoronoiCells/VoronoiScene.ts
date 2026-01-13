import { createComputePipeline, type InitInfo, type Scene } from '@/WebGPU/ComputeRenderer'
import {
    createFloatUniform,
    createIntUniform,
    createStorageBuffer,
    updateFloatUniform,
    updateIntUniform,
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
    voronoi_color_index!: GPUBuffer
    voronoi_colors!: GPUBuffer

    noise_scale!: GPUBuffer
    noise_random_elements!: GPUBuffer
    noise_n_octaves!: GPUBuffer
    noise_persistence!: GPUBuffer
    noise_warp_strength!: GPUBuffer
    noise_z!: GPUBuffer

    bind_group!: GPUBindGroup

    async init(data: VoronoiUniforms, info: InitInfo) {
        const { device, color_format } = info
        const { warp_algorithm, warp_dimension } = this.setup

        const shader_code = `${voronoiShader(this.setup, color_format)}`
        this.pipeline = await createComputePipeline(shader_code, device)

        this.hash_table = createStorageBuffer(generateHashTable(256), device)
        this.voronoi_n_columns = createFloatUniform(data.voronoi_n_columns || 16, device)
        this.voronoi_points = createStorageBuffer(shaderRandomPoints2D(256), device)

        const n_colors = 8
        this.voronoi_color_index = createStorageBuffer(
            new Int32Array(256).map(() => Math.floor(Math.random() * (n_colors + 1))),
            device,
        )
        this.voronoi_colors = createStorageBuffer(
            new Float32Array([
                0,
                0,
                0,
                1, // color 0
                0,
                0,
                1,
                1, // color 1
                0,
                1,
                0,
                1, // color 2
                0,
                1,
                1,
                1, // color 3
                1,
                0,
                0,
                1, // color 4
                1,
                0,
                1,
                1, // color 5
                1,
                1,
                0,
                1, // color 6
                1,
                1,
                1,
                1, // color 7
            ]),
            device,
        )

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
            {
                binding: 4,
                resource: { buffer: this.voronoi_color_index },
            },
            {
                binding: 5,
                resource: { buffer: this.voronoi_colors },
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
                    binding: 6,
                    resource: { buffer: this.noise_scale },
                },
                {
                    binding: 7,
                    resource: { buffer: this.noise_n_octaves },
                },
                {
                    binding: 8,
                    resource: { buffer: this.noise_persistence },
                },
                {
                    binding: 9,
                    resource: { buffer: this.noise_warp_strength },
                },
            ])
            if (warp_dimension === '3D') {
                this.noise_z = createFloatUniform(data.noise_z || 0, device)
                bind_group_entries.push({
                    binding: 10,
                    resource: { buffer: this.noise_z },
                })
            }
        }

        this.bind_group = device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: bind_group_entries,
        })
    }

    render(encoder: GPUComputePassEncoder): void {
        encoder.setBindGroup(1, this.bind_group)
    }

    updateVoronoiNColumns(value: number, device: GPUDevice) {
        updateFloatUniform(this.voronoi_n_columns, value, device)
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
        this.voronoi_color_index?.destroy()
        this.voronoi_colors?.destroy()

        this.noise_random_elements?.destroy()
        this.noise_scale?.destroy()
        this.noise_n_octaves?.destroy()
        this.noise_persistence?.destroy()
        this.noise_warp_strength?.destroy()
        this.noise_z?.destroy()
    }
}
