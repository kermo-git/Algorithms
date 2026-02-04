import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import { invertedGaussian, sigmoid } from './Shader'

export interface Example {
    name: string
    color_0: string
    color_1: string
    kernel_radius: number
    get_kernel: () => FloatArray
    activation: string
}

export function normalizeKernel(kernel: FloatArray) {
    let n_nagative = 0
    let n_positive = 0

    kernel.forEach((value) => {
        if (value < 0) {
            n_nagative++
        } else if (value > 0) {
            n_positive++
        }
    })
    const neg_weight = parseFloat((-n_positive / n_nagative).toFixed(2))

    return kernel.map((value) => {
        if (value < 0) {
            return neg_weight
        } else if (value > 0) {
            return 1
        }
        return 0
    })
}

export const examples: Example[] = [
    {
        name: 'Organic maze',
        color_0: '#59F9CE',
        color_1: '#4842FF',

        kernel_radius: 5,
        get_kernel: () => {
            const N = -1
            const P = 1

            return normalizeKernel(
                new Float32Array(
                    [
                        [0, 0, 0, 0, N, N, N, 0, 0, 0, 0],
                        [0, 0, N, N, N, N, N, N, N, 0, 0],
                        [0, N, N, N, N, N, N, N, N, N, 0],
                        [0, N, N, N, P, P, P, N, N, N, 0],
                        [N, N, N, P, P, P, P, P, N, N, N],
                        [N, N, N, P, P, P, P, P, N, N, N],
                        [N, N, N, P, P, P, P, P, N, N, N],
                        [0, N, N, N, P, P, P, N, N, N, 0],
                        [0, N, N, N, N, N, N, N, N, N, 0],
                        [0, 0, N, N, N, N, N, N, N, 0, 0],
                        [0, 0, 0, 0, N, N, N, 0, 0, 0, 0],
                    ].flat(),
                ),
            )
        },
        activation: sigmoid,
    },
    {
        name: 'Zebra',
        color_0: '#000000',
        color_1: '#EBEBEB',

        kernel_radius: 4,
        get_kernel: () => {
            const N = -1
            const P = 1

            return normalizeKernel(
                new Float32Array(
                    [
                        [0, 0, N, N, P, N, N, 0, 0],
                        [0, N, N, P, P, P, N, N, 0],
                        [N, N, N, P, P, P, N, N, N],
                        [N, N, P, P, P, P, P, N, N],
                        [N, N, P, P, P, P, P, N, N],
                        [N, N, P, P, P, P, P, N, N],
                        [N, N, N, P, P, P, N, N, N],
                        [0, N, N, P, P, P, N, N, 0],
                        [0, 0, N, N, P, N, N, 0, 0],
                    ].flat(),
                ),
            )
        },
        activation: sigmoid,
    },
    {
        name: 'Merging bubbles',
        color_0: '#000000',
        color_1: '#D585FF',

        kernel_radius: 1,
        get_kernel: () => {
            const X = -0.7
            const Y = 0.2
            const Z = 0.35

            return new Float32Array(
                [
                    [Z, X, Z],
                    [X, Y, X],
                    [Z, X, Z],
                ].flat(),
            )
        },
        activation: invertedGaussian,
    },
    {
        // https://neuralpatterns.io
        name: 'Slime mold',
        color_0: '#000000',
        color_1: '#FFFC41',

        kernel_radius: 1,
        get_kernel: () => {
            const X = -0.85
            const Y = -0.2
            const Z = 0.8

            return new Float32Array(
                [
                    [Z, X, Z],
                    [X, Y, X],
                    [Z, X, Z],
                ].flat(),
            )
        },
        activation: invertedGaussian,
    },
    {
        // https://neuralpatterns.io
        name: 'Mitosis',
        color_0: '#001E57',
        color_1: '#00CE00',

        kernel_radius: 1,
        get_kernel: () => {
            const X = 0.88
            const Y = 0.4
            const Z = -0.939

            return new Float32Array(
                [
                    [Z, X, Z],
                    [X, Y, X],
                    [Z, X, Z],
                ].flat(),
            )
        },
        activation: invertedGaussian,
    },
]
