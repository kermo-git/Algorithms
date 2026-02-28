import type { FloatArray } from '@/WebGPU/Engine'

export type VecType = 'vec2f' | 'vec3f' | 'vec4f'
export type PowerOfTwo = 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512

export function log2(p: PowerOfTwo) {
    switch (p) {
        case 2:
            return 1
        case 4:
            return 2
        case 8:
            return 3
        case 16:
            return 4
        case 32:
            return 5
        case 64:
            return 6
        case 128:
            return 7
        case 256:
            return 8
        case 512:
            return 9
    }
}

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
