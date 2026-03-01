import type { FloatArray } from '@/WebGPU/Engine'

export type VecType = 'vec2f' | 'vec3f' | 'vec4f'

export interface Config {
    name: string
    extraBufferName?: string
}

export interface NoiseAlgorithm {
    pos_type: VecType
    extra_data_type?: string
    generateExtraData?: () => FloatArray
    createShaderDependencies(): string
    createShader(config: Config): string
}

export interface NoiseTransformNames {
    func_name: string
    noise_name: string
    pos_type: VecType
}
