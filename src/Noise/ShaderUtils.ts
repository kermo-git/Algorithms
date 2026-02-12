import { cubic2DShader, cubic3DShader, cubic4DShader } from './Algorithms/Cubic'
import { perlin2DShader, perlin3DShader, perlin4DShader } from './Algorithms/Perlin'
import { simplex2DShader, simplex3DShader, simplex4DShader } from './Algorithms/Simplex'
import { value2DShader, value3DShader, value4DShader } from './Algorithms/Value'
import { worley2DShader, worley3DShader, worley4DShader } from './Algorithms/Worley'
import {
    shaderRandomPoints2D,
    shaderRandomPoints3D,
    shaderRandomPoints4D,
    shaderUnitVectors2D,
    shaderUnitVectors3D,
    shaderUnitVectors4D,
} from './Buffers'

export type NoiseAlgorithm =
    | 'Perlin'
    | 'Simplex'
    | 'Cubic'
    | 'Value'
    | 'Worley'
    | 'Worley (2nd closest)'

export type DomainTransform = 'None' | 'Rotate' | 'Warp' | 'Warp 2X'
export type NoiseDimension = '2D' | '3D' | '4D'

export interface NoiseShaderNames {
    hash_table: string
    features: string
    noise: string
}

export interface NoiseTransformNames {
    func_name: string
    noise_name: string
    dimension: NoiseDimension
}

export function getNoiseShaderRandomElements(
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

export function noiseFunctionShader(
    algorithm: NoiseAlgorithm,
    dimension: NoiseDimension,
    names: NoiseShaderNames,
) {
    switch (algorithm) {
        case 'Perlin':
            switch (dimension) {
                case '2D':
                    return perlin2DShader(names)
                case '3D':
                    return perlin3DShader(names)
                case '4D':
                    return perlin4DShader(names)
            }
        case 'Simplex':
            switch (dimension) {
                case '2D':
                    return simplex2DShader(names)
                case '3D':
                    return simplex3DShader(names)
                case '4D':
                    return simplex4DShader(names)
            }
        case 'Cubic':
            switch (dimension) {
                case '2D':
                    return cubic2DShader(names)
                case '3D':
                    return cubic3DShader(names)
                case '4D':
                    return cubic4DShader(names)
            }
        case 'Value':
            switch (dimension) {
                case '2D':
                    return value2DShader(names)
                case '3D':
                    return value3DShader(names)
                case '4D':
                    return value4DShader(names)
            }
        case 'Worley':
            switch (dimension) {
                case '2D':
                    return worley2DShader(false, names)
                case '3D':
                    return worley3DShader(false, names)
                case '4D':
                    return worley4DShader(false, names)
            }
        case 'Worley (2nd closest)':
            switch (dimension) {
                case '2D':
                    return worley2DShader(true, names)
                case '3D':
                    return worley3DShader(true, names)
                case '4D':
                    return worley4DShader(true, names)
            }
    }
}

export function noiseFeatureType(algorithm: NoiseAlgorithm, dimension: NoiseDimension) {
    if (algorithm === 'Perlin' || algorithm === 'Simplex' || algorithm.startsWith('Worley')) {
        switch (dimension) {
            case '2D':
                return 'vec2f'
            case '3D':
                return 'vec3f'
            case '4D':
                return 'vec4f'
        }
    }
    return 'f32'
}

export function shaderVecType(dimension: NoiseDimension) {
    return dimension === '2D' ? 'vec2f' : dimension === '3D' ? 'vec3f' : 'vec4f'
}
