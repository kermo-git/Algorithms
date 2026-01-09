import {
    createIntUniform,
    updateIntUniform,
    createFloatUniform,
    updateFloatUniform,
    createStorageBuffer,
    updateStorageBuffer,
} from '../ShaderDataUtils'
import { createComputePipeline, type InitInfo, type Scene } from '../ComputeRenderer'
import { defaultColorPoints, generateHashTable } from './Buffers'
import { flatNoiseShader } from './FlatNoiseShader'

export interface ShaderBindIndexes {
    bindGroup: number
    bindingStart: number
}

export interface NoiseUniforms {
    n_grid_columns?: number
    n_main_octaves?: number
    persistence?: number
    z_coord?: number
    w_coord?: number
    n_warp_octaves?: number
    warp_strength?: number
    color_points?: Float32Array<ArrayBuffer>
}

export type DomainTransform = 'None' | 'Rotate' | 'Warp' | 'Warp 2X'
export type NoiseDimension = '2D' | '3D' | '4D'

export abstract class NoiseScene implements Scene {
    dimension: NoiseDimension
    transform: DomainTransform
    noise_shader_code: string

    constructor(
        noise_shader_code: string,
        dimension: NoiseDimension = '2D',
        transform: DomainTransform = 'None',
    ) {
        this.dimension = dimension
        this.transform = transform
        this.noise_shader_code = noise_shader_code
    }

    abstract generateRandomElements(n: number): Float32Array<ArrayBuffer>

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${this.noise_shader_code}
            ${flatNoiseShader(this.dimension, this.transform, color_format)}
        `
    }
    pipeline!: GPUComputePipeline

    getPipeline(): GPUComputePipeline {
        return this.pipeline
    }

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

    async init(data: NoiseUniforms, info: InitInfo) {
        const shader_code = this.createShader(info.color_format)
        this.pipeline = await createComputePipeline(shader_code, info.device)

        this.hash_table = createStorageBuffer(generateHashTable(256), info.device)
        this.random_elements = createStorageBuffer(this.generateRandomElements(256), info.device)
        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, info.device)
        this.n_main_octaves = createIntUniform(data.n_main_octaves || 1, info.device)
        this.persistence = createFloatUniform(data.persistence || 0.5, info.device)

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

        if (this.dimension !== '2D') {
            this.z_coord = createFloatUniform(data.z_coord || 0, info.device)
            bind_group_entries.push({
                binding: 5,
                resource: { buffer: this.z_coord },
            })
            if (this.dimension === '4D') {
                this.w_coord = createFloatUniform(data.w_coord || 0, info.device)
                bind_group_entries.push({
                    binding: 6,
                    resource: { buffer: this.w_coord },
                })
            }
        }
        if (this.transform.startsWith('Warp')) {
            this.n_warp_octaves = createIntUniform(data.n_warp_octaves || 1, info.device)
            this.warp_strength = createFloatUniform(data.warp_strength || 1, info.device)

            bind_group_entries.push({
                binding: 7,
                resource: { buffer: this.n_warp_octaves },
            })
            bind_group_entries.push({
                binding: 8,
                resource: { buffer: this.warp_strength },
            })
        }

        this.static_bind_group = info.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: bind_group_entries,
        })

        const color_points_data = data.color_points || defaultColorPoints
        this.n_colors = color_points_data.length / 4
        this.color_points = createStorageBuffer(color_points_data, info.device, 256)

        this.color_bind_group = info.device.createBindGroup({
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
    }

    render(encoder: GPUComputePassEncoder): void {
        encoder.setBindGroup(1, this.static_bind_group)
        encoder.setBindGroup(2, this.color_bind_group)
    }

    updateNGridColumns(value: number, device: GPUDevice) {
        updateFloatUniform(this.n_grid_columns, value, device)
    }

    updateNMainOctaves(value: number, device: GPUDevice) {
        updateIntUniform(this.n_main_octaves, value, device)
    }

    updatePersistence(value: number, device: GPUDevice) {
        updateFloatUniform(this.persistence, value, device)
    }

    updateZCoord(value: number, device: GPUDevice) {
        updateFloatUniform(this.z_coord, value, device)
    }

    updateWCoord(value: number, device: GPUDevice) {
        updateFloatUniform(this.w_coord, value, device)
    }

    updateNWarpOctaves(value: number, device: GPUDevice) {
        updateIntUniform(this.n_warp_octaves, value, device)
    }

    updateWarpStrength(value: number, device: GPUDevice) {
        updateFloatUniform(this.warp_strength, value, device)
    }

    updateColorPoints(data: Float32Array<ArrayBuffer>, device: GPUDevice) {
        updateStorageBuffer(this.color_points, data, device)
        const new_n_colors = data.length / 4

        if (new_n_colors != this.n_colors) {
            this.n_colors = new_n_colors
            this.color_bind_group = device.createBindGroup({
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
    }

    cleanup() {
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
