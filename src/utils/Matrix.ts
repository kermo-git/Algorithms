export class Matrix<T = number> {
    data: T[]
    n_rows: number
    n_cols: number

    constructor(n_rows: number, n_cols: number, fill: (row: number, col: number) => T) {
        this.n_rows = n_rows
        this.n_cols = n_cols
        this.data = new Array(n_rows * n_cols)

        let row = 0
        let col = 0
        const size = this.data.length

        for (let i = 0; i < size; i++) {
            this.data[i] = fill(row, col)
            col++
            if (col == this.n_cols) {
                row++
                col = 0
            }
        }
    }

    get(row: number, col: number): T {
        const index = this.n_cols * row + col
        return this.data[index]
    }

    set(row: number, col: number, value: T) {
        const index = this.n_cols * row + col
        this.data[index] = value
    }

    foreach(op: (row: number, col: number, value: T) => void) {
        let row = 0
        let col = 0

        for (const value of this.data) {
            op(row, col, value)
            col++
            if (col == this.n_cols) {
                row++
                col = 0
            }
        }
    }

    toString(): string {
        const str_values = this.data.map((value) => `${value}`)
        const str_lengths = str_values.map((value) => value.length)
        const has_minus = str_values.find((value) => value[0] === '-')
        const max_length = Math.max(...str_lengths)

        let row = 0
        let col = 0
        let result = '['

        for (const value of str_values) {
            let fixed_value = value
            if (value[0] !== '-' && has_minus) {
                fixed_value = ' ' + value
            }
            result += fixed_value + ' '.repeat(max_length - fixed_value.length)
            col++
            if (col == this.n_cols) {
                col = 0
                row++
                result += ']\n'
                if (row < this.n_rows) {
                    result += '['
                }
            } else {
                result += ', '
            }
        }
        return result
    }
}

export function createMatrix<T>(data: T[][]): Matrix<T> {
    const n_rows = data.length
    const n_cols = data[0].length
    return new Matrix<T>(n_rows, n_cols, (r, c) => data[r][c])
}
