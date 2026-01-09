import {
    createIntUniform,
    updateIntUniform,
    createFloatUniform,
    updateFloatUniform,
    createStorageBuffer,
    updateStorageBuffer,
} from '../ShaderDataUtils'
import { createComputePipeline, type InitInfo, type Scene } from '../ComputeRenderer'
import {
    defaultColorPoints,
    generateHashTable,
    shaderRandomPoints2D,
    shaderRandomPoints3D,
    shaderRandomPoints4D,
    shaderUnitVectors2D,
    shaderUnitVectors3D,
    shaderUnitVectors4D,
} from './Buffers'
import { flatNoiseShader } from './FlatNoiseShader'
import { perlin2DShader, perlin3DShader, perlin4DShader } from '../NoiseFunctions/Perlin'
import { simplex2DShader, simplex3DShader, simplex4DShader } from '../NoiseFunctions/Simplex'
import { cubic2DShader, cubic3DShader } from '../NoiseFunctions/Cubic'
import { value2DShader, value3DShader, value4DShader } from '../NoiseFunctions/Value'
import { worley2DShader, worley3DShader, worley4DShader } from '../NoiseFunctions/Worley'

export type NoiseAlgorithm =
    | 'Perlin'
    | 'Simplex'
    | 'Cubic'
    | 'Value'
    | 'Worley'
    | 'Worley (2nd closest)'

export type DomainTransform = 'None' | 'Rotate' | 'Warp' | 'Warp 2X'
export type NoiseDimension = '2D' | '3D' | '4D'

export interface NoiseSceneSetup {
    algorithm: NoiseAlgorithm
    dimension: NoiseDimension
    transform: DomainTransform
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

function getNoiseShaderRandomElements(
    algorithm: NoiseAlgorithm,
    dimension: NoiseDimension,
    n_random_elements: number,
) {
    if (algorithm === 'Perlin' || algorithm === 'Simplex') {
        switch (dimension) {
            case '2D':
                return shaderUnitVectors2D(n_random_elements)
            case '3D':
                return shaderUnitVectors3D(n_random_elements)
            case '4D':
                return shaderUnitVectors4D(n_random_elements)
        }
    } else if (algorithm === 'Worley' || algorithm === 'Worley (2nd closest)') {
        switch (dimension) {
            case '2D':
                return shaderRandomPoints2D(n_random_elements)
            case '3D':
                return shaderRandomPoints3D(n_random_elements)
            case '4D':
                return shaderRandomPoints4D(n_random_elements)
        }
    } else {
        return new Float32Array(n_random_elements).map(Math.random)
    }
}

function getNoiseShaderFunction(algorithm: NoiseAlgorithm, dimension: NoiseDimension) {
    switch (algorithm) {
        case 'Perlin':
            switch (dimension) {
                case '2D':
                    return perlin2DShader()
                case '3D':
                    return perlin3DShader()
                case '4D':
                    return perlin4DShader()
            }
        case 'Simplex':
            switch (dimension) {
                case '2D':
                    return simplex2DShader()
                case '3D':
                    return simplex3DShader()
                case '4D':
                    return simplex4DShader()
            }
        case 'Cubic':
            switch (dimension) {
                case '2D':
                    return cubic2DShader()
                case '3D':
                    return cubic3DShader()
                case '4D':
                    return cubic3DShader()
            }
        case 'Value':
            switch (dimension) {
                case '2D':
                    return value2DShader()
                case '3D':
                    return value3DShader()
                case '4D':
                    return value4DShader()
            }
        case 'Worley':
            switch (dimension) {
                case '2D':
                    return worley2DShader(false)
                case '3D':
                    return worley3DShader(false)
                case '4D':
                    return worley4DShader(false)
            }
        case 'Worley (2nd closest)':
            switch (dimension) {
                case '2D':
                    return worley2DShader(true)
                case '3D':
                    return worley3DShader(true)
                case '4D':
                    return worley4DShader(true)
            }
    }
}

export class NoiseScene implements Scene {
    setup: NoiseSceneSetup

    constructor(setup: NoiseSceneSetup) {
        this.setup = setup
    }

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${getNoiseShaderFunction(this.setup.algorithm, this.setup.dimension)}
            ${flatNoiseShader(this.setup.dimension, this.setup.transform, color_format)}
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
        const setup = this.setup
        const shader_code = this.createShader(info.color_format)
        const random_elements = getNoiseShaderRandomElements(setup.algorithm, setup.dimension, 256)

        this.pipeline = await createComputePipeline(shader_code, info.device)
        this.hash_table = createStorageBuffer(generateHashTable(256), info.device)
        this.random_elements = createStorageBuffer(random_elements, info.device)
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

        if (setup.dimension !== '2D') {
            this.z_coord = createFloatUniform(data.z_coord || 0, info.device)
            bind_group_entries.push({
                binding: 5,
                resource: { buffer: this.z_coord },
            })
            if (setup.dimension === '4D') {
                this.w_coord = createFloatUniform(data.w_coord || 0, info.device)
                bind_group_entries.push({
                    binding: 6,
                    resource: { buffer: this.w_coord },
                })
            }
        }
        if (setup.transform === 'Warp' || setup.transform === 'Warp 2X') {
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
