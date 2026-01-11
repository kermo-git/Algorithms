import { lerpColors, parseHexColor } from './Colors'
import type { Matrix } from './Matrix'

export function drawDiscreteColors(canvas: HTMLCanvasElement, matrix: Matrix, colors: string[]) {
    const n_cols = matrix.n_cols
    const n_rows = matrix.n_rows

    canvas.width = n_cols
    canvas.height = n_rows
    const ctx = canvas.getContext('2d')

    if (ctx) {
        const image_data = ctx.createImageData(n_cols, n_rows)
        const color_array = image_data.data
        const matrix_data = matrix.data

        const parsed_colors = colors.map((color) => parseHexColor(color))

        let color_i = 0
        for (let i = 0; i < n_rows * n_cols; i++) {
            const { red, green, blue } = parsed_colors[matrix_data[i]]

            color_array[color_i++] = red
            color_array[color_i++] = green
            color_array[color_i++] = blue
            color_array[color_i++] = 255
        }
        ctx.putImageData(image_data, 0, 0)
    }
}

export function drawContinuousColors(canvas: HTMLCanvasElement, matrix: Matrix, colors: string[]) {
    const n_cols = matrix.n_cols
    const n_rows = matrix.n_rows

    canvas.width = n_cols
    canvas.height = n_rows
    const ctx = canvas.getContext('2d')

    if (ctx) {
        const image_data = ctx.createImageData(n_cols, n_rows)
        const color_array = image_data.data
        const matrix_data = matrix.data

        const color1 = parseHexColor(colors[0])
        const color2 = parseHexColor(colors[1])

        let color_i = 0
        for (let i = 0; i < n_rows * n_cols; i++) {
            const { red, green, blue } = lerpColors(matrix_data[i], color1, color2)

            color_array[color_i++] = red
            color_array[color_i++] = green
            color_array[color_i++] = blue
            color_array[color_i++] = 255
        }
        ctx.putImageData(image_data, 0, 0)
    }
}
