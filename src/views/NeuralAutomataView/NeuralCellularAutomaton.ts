import { Matrix } from '@/utils/Matrix'

export function randomize(matrix: Matrix) {
    const matrix_size = matrix.n_rows * matrix.n_cols

    for (let i = 0; i < matrix_size; i++) {
        const new_value = Math.floor(Math.random() * 2)
        matrix.data[i] = new_value
    }
}

export function discrete(x: number): number {
    if (x > 0) {
        return 1
    } else {
        return 0
    }
}

export function sigmoid(x: number): number {
    const exp = Math.exp(x)
    return exp / (exp + 1)
}

export function invertedGaussian(x: number): number {
    return -1 / Math.pow(2, Math.pow(x, 2)) + 1
}

export function neuralAutomatonStep(
    old_gen: Matrix,
    new_gen: Matrix,
    filter: Matrix,
    activation: (x: number) => number,
) {
    const matrix_size = old_gen.n_rows * old_gen.n_cols

    for (let i = 0; i < matrix_size; i++) {
        const row = Math.trunc(i / old_gen.n_cols)
        const col = i % old_gen.n_cols

        const c = convolution(old_gen, row, col, filter)
        new_gen.data[i] = activation(c)
    }
}

function convolution(
    matrix: Matrix,
    center_row: number,
    center_col: number,
    filter: Matrix,
): number {
    const n_cols = matrix.n_cols
    const n_rows = matrix.n_rows

    const radius = Math.trunc(filter.n_rows / 2)
    const start_row = center_row - radius + n_rows
    const start_col = center_col - radius + n_cols

    let result = 0
    const filter_size = filter.n_rows * filter.n_cols

    for (let i = 0; i < filter_size; i++) {
        const filter_row = Math.trunc(i / filter.n_cols)
        const filter_col = i % filter.n_cols

        const matrix_row = (start_row + filter_row) % n_rows
        const matrix_col = (start_col + filter_col) % n_cols

        result += filter.data[i] * matrix.get(matrix_row, matrix_col)
    }
    return result
}
