import { KernelSymmetry } from './Types'

export interface Example {
    name: string
    activation: string
    kernel_radius: number
    kernel_symmetry: KernelSymmetry
    get_kernel: () => number[]
    color_1: string
    color_2: string
    skipFrames: boolean
}

const invertedGaussian = /* wgsl */ `// Inverted Gaussian function
fn activate(x: f32) -> f32 {
    return -1/(0.89 * pow(x, 2) + 1) + 1;
}`

const sigmoid = /* wgsl */ `// Sigmoid function
fn activate(x: f32) -> f32 {
    let exp_x = exp(x);
    return exp_x / (exp_x + 1);
}`

function normalizeKernel(kernel: number[]) {
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

function mazeKernel() {
    const N = -1
    const P = 1

    return normalizeKernel(
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
            [0, 0, 0, 0, N, N, N, 0, 0, 0, 0]
        ].flat()
    )
}

export const examples: Example[] = [
    {
        name: 'Organic maze',
        color_1: '#59F9CE',
        color_2: '#4842FF',

        kernel_radius: 5,
        kernel_symmetry: KernelSymmetry.FULL,
        get_kernel: () => {
            return mazeKernel()
        },
        activation: sigmoid,
        skipFrames: false
    },
    {
        name: 'Flowing maze',
        color_1: '#59F9CE',
        color_2: '#4842FF',

        kernel_radius: 5,
        kernel_symmetry: KernelSymmetry.NONE,
        get_kernel: () => {
            const kernel = mazeKernel()
            kernel[22] = 1
            kernel[98] = -1
            return kernel
        },
        activation: sigmoid,
        skipFrames: false
    },
    {
        name: 'Zebra',
        color_1: '#000000',
        color_2: '#EBEBEB',

        kernel_radius: 4,
        kernel_symmetry: KernelSymmetry.VERTICAL_HORIZONTAL,
        get_kernel: () => {
            const N = -1
            const P = 1

            return normalizeKernel(
                [
                    [0, 0, N, N, P, N, N, 0, 0],
                    [0, N, N, P, P, P, N, N, 0],
                    [N, N, N, P, P, P, N, N, N],
                    [N, N, P, P, P, P, P, N, N],
                    [N, N, P, P, P, P, P, N, N],
                    [N, N, P, P, P, P, P, N, N],
                    [N, N, N, P, P, P, N, N, N],
                    [0, N, N, P, P, P, N, N, 0],
                    [0, 0, N, N, P, N, N, 0, 0]
                ].flat()
            )
        },
        activation: sigmoid,
        skipFrames: false
    },
    {
        name: 'Merging bubbles',
        color_1: '#000000',
        color_2: '#D585FF',

        kernel_radius: 1,
        kernel_symmetry: KernelSymmetry.FULL,
        get_kernel: () => {
            const X = -0.7
            const Y = 0.2
            const Z = 0.35

            return [
                [Z, X, Z],
                [X, Y, X],
                [Z, X, Z]
            ].flat()
        },
        activation: invertedGaussian,
        skipFrames: true
    },
    {
        // https://neuralpatterns.io
        name: 'Slime mold',
        color_1: '#000000',
        color_2: '#FFFC41',

        kernel_radius: 1,
        kernel_symmetry: KernelSymmetry.FULL,
        get_kernel: () => {
            const X = -0.85
            const Y = -0.2
            const Z = 0.8

            return [
                [Z, X, Z],
                [X, Y, X],
                [Z, X, Z]
            ].flat()
        },
        activation: invertedGaussian,
        skipFrames: true
    },
    {
        // https://neuralpatterns.io
        name: 'Small bacteria',
        color_1: '#001E57',
        color_2: '#00CE00',

        kernel_radius: 1,
        kernel_symmetry: KernelSymmetry.FULL,
        get_kernel: () => {
            const X = 0.79
            const Y = 0.55
            const Z = -0.86

            return [
                [Z, X, Z],
                [X, Y, X],
                [Z, X, Z]
            ].flat()
        },
        activation: invertedGaussian,
        skipFrames: true
    },
    {
        name: 'Long bacteria',
        color_1: '#000000',
        color_2: '#aaff00',

        kernel_radius: 1,
        kernel_symmetry: KernelSymmetry.FULL,
        get_kernel: () => {
            const X = -0.8
            const Y = -0.5
            const Z = 0.85

            return [
                [Z, X, Z],
                [X, Y, X],
                [Z, X, Z]
            ].flat()
        },
        activation: invertedGaussian,
        skipFrames: true
    }
]
