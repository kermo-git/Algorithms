import { createComputePipeline, type InitInfo, type Scene } from '@/WebGPU/ComputeRenderer'
import {
    createFloatUniform,
    createIntUniform,
    createStorageBuffer,
    updateFloatUniform,
    updateIntUniform,
    updateStorageBuffer,
} from '@/WebGPU/ShaderDataUtils'

import type { NoiseUniforms } from '@/Noise/Types'
import { defaultColorPoints, generateHashTable, shaderRandomPoints2D } from '@/Noise/Buffers'
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
    n_grid_columns!: GPUBuffer
    voronoi_points!: GPUBuffer
    color_index_data!: GPUBuffer
    colors!: GPUBuffer

    noise_scale!: GPUBuffer
    noise_warp_strength!: GPUBuffer
    noise_random_elements!: GPUBuffer
    n_noise_octaves!: GPUBuffer
    noise_persistence!: GPUBuffer
    noise_z_coord!: GPUBuffer

    bind_group!: GPUBindGroup

    async init(data: VoronoiUniforms, info: InitInfo) {
        const { device, color_format } = info
        const { warp_algorithm, warp_dimension } = this.setup
        const shader_code = `${voronoiShader(this.setup, color_format)}`

        this.pipeline = await createComputePipeline(shader_code, device)
        this.hash_table = createStorageBuffer(generateHashTable(256), device)
        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.voronoi_points = createStorageBuffer(shaderRandomPoints2D(256), device)

        const n_colors = 8
        this.color_index_data = createStorageBuffer(
            new Int32Array(256).map(() => Math.floor(Math.random() * (n_colors + 1))),
            device,
        )
        this.colors = createStorageBuffer(
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
                resource: { buffer: this.n_grid_columns },
            },
            {
                binding: 3,
                resource: { buffer: this.voronoi_points },
            },
            {
                binding: 4,
                resource: { buffer: this.color_index_data },
            },
            {
                binding: 5,
                resource: { buffer: this.colors },
            },
        ]

        if (warp_algorithm && warp_dimension) {
            const random_elements = getNoiseShaderRandomElements(
                warp_algorithm,
                warp_dimension,
                256,
            )
            this.noise_scale = createFloatUniform(data.noise_scale || 1, device)
            this.noise_warp_strength = createFloatUniform(data.noise_warp_strength || 1, device)
            this.noise_random_elements = createStorageBuffer(random_elements, device)
            this.n_noise_octaves = createIntUniform(data.n_noise_octaves || 1, device)
            this.noise_persistence = createFloatUniform(data.noise_persistence || 0.5, device)

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
                    resource: { buffer: this.noise_warp_strength },
                },
                {
                    binding: 8,
                    resource: { buffer: this.n_noise_octaves },
                },
                {
                    binding: 9,
                    resource: { buffer: this.noise_persistence },
                },
            ])
            if (warp_dimension === '3D') {
                this.noise_z_coord = createFloatUniform(data.noise_z_coord || 0, device)
                bind_group_entries.push({
                    binding: 10,
                    resource: { buffer: this.noise_z_coord },
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

    updateNGridColumns(value: number, device: GPUDevice) {
        updateFloatUniform(this.n_grid_columns, value, device)
    }

    updateNoiseScale(value: number, device: GPUDevice) {
        updateFloatUniform(this.noise_scale, value, device)
    }

    updateNoiseWarpStrength(value: number, device: GPUDevice) {
        updateFloatUniform(this.noise_warp_strength, value, device)
    }

    updateNoiseOctaves(value: number, device: GPUDevice) {
        updateIntUniform(this.n_noise_octaves, value, device)
    }

    updateNoisePersistence(value: number, device: GPUDevice) {
        updateFloatUniform(this.noise_persistence, value, device)
    }

    updateNoiseZCoord(value: number, device: GPUDevice) {
        updateFloatUniform(this.noise_z_coord, value, device)
    }

    cleanup() {
        this.hash_table?.destroy()
        this.n_grid_columns?.destroy()
        this.voronoi_points?.destroy()
        this.color_index_data?.destroy()
        this.colors?.destroy()

        this.noise_scale?.destroy()
        this.noise_warp_strength?.destroy()
        this.noise_random_elements?.destroy()
        this.n_noise_octaves?.destroy()
        this.noise_persistence?.destroy()
        this.noise_z_coord?.destroy()
    }
}
