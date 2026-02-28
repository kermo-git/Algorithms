import type { FloatArray } from '@/WebGPU/Engine'

export type VecType = 'vec2f' | 'vec3f' | 'vec4f'
export type FeatureType = 'f32' | VecType
export type PowerOfTwo = 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512

export interface Config {
    name: string
    hash_table_size: PowerOfTwo
    n_channels: PowerOfTwo
}

export interface NoiseAlgorithm {
    pos_type: VecType
    createShaderDependencies(): string
    createShader(config: Config): string
}

export interface NoiseTransformNames {
    func_name: string
    noise_name: string
    pos_type: VecType
}
