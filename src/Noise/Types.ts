import type { FloatArray } from '@/WebGPU/Engine'

export type VecType = 'vec2f' | 'vec3f' | 'vec4f'
export type FeatureType = 'f32' | VecType

export interface NoiseShaderNames {
    hash_table: string
    features: string
    noise: string
}

export interface NoiseAlgorithm {
    feature_type: FeatureType
    generateFeatures(n: number): FloatArray

    pos_type: VecType
    createShader(names: NoiseShaderNames): string
}

export interface NoiseTransformNames {
    func_name: string
    noise_name: string
    pos_type: VecType
}
