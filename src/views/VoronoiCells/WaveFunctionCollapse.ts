// https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/

import { Matrix } from '@/utils/Matrix'
import type { IntArray } from '@/WebGPU/ShaderDataUtils'

export enum Direction {
    North = 0,
    East = 1,
    South = 2,
    West = 3,
}

export class WFCRules {
    weigths: number[] = []
    rules: boolean[] = []

    constructor(n_tiles: number) {
        this.weigths = new Array(n_tiles).fill(0)
        this.rules = new Array(n_tiles * n_tiles * 4).fill(false)
    }

    addWeight(tile: number, increment: number) {
        this.weigths[tile] += increment
    }

    normalizeWeights() {
        let sum = 0
        for (let i = 0; i < this.weigths.length; i++) {
            sum += this.weigths[i]
        }
        for (let i = 0; i < this.weigths.length; i++) {
            this.weigths[i] /= sum
        }
    }

    set(tile: number, direction: Direction, neighbor_tile: number, value = true) {
        const n_tiles = this.weigths.length
        const index = (tile * n_tiles + neighbor_tile) * 4 + direction
        this.rules[index] = value
    }

    get(tile: number, direction: Direction, neighbor_tile: number): boolean {
        const n_tiles = this.weigths.length
        const index = (tile * n_tiles + neighbor_tile) * 4 + direction
        return this.rules[index]
    }
}

export function createWFCRules(sample_picture: Matrix<number>): WFCRules {
    let n_tiles = 0

    sample_picture.foreach((row, col, tile) => {
        if (tile > n_tiles) {
            n_tiles = tile
        }
    })
    const rules = new WFCRules(n_tiles)

    const max_row = sample_picture.n_rows - 1
    const max_col = sample_picture.n_cols - 1

    sample_picture.foreach((row, col, tile) => {
        rules.addWeight(tile, 1)

        const north_row = row < max_row ? row + 1 : 0
        const east_col = col < max_col ? col + 1 : 0
        const south_row = row > 0 ? row - 1 : max_row
        const west_col = col > 0 ? col - 1 : max_col

        const north_tile = sample_picture.get(north_row, col)
        const east_tile = sample_picture.get(row, east_col)
        const south_tile = sample_picture.get(south_row, col)
        const west_tile = sample_picture.get(row, west_col)

        rules.set(tile, Direction.North, north_tile)
        rules.set(tile, Direction.East, east_tile)
        rules.set(tile, Direction.South, south_tile)
        rules.set(tile, Direction.West, west_tile)
    })

    rules.normalizeWeights()
    return rules
}

export function generateWFCShaderImage(rules: WFCRules, n_rows: number, n_cols: number): IntArray {
    const superposition: number[] = []
    const weigths = rules.weigths
    const n_tiles = weigths.length

    for (let i = 0; i < n_tiles; i++) {
        superposition.push(i)
    }

    function shannon_entropy(superposition: number[]) {
        let sum_w = 0
        let sum_w_log_w = 0

        superposition.forEach((tile) => {
            const w = weigths[tile]
            sum_w += w
            sum_w_log_w += w * Math.log(w)
        })
        return Math.log(sum_w) - sum_w_log_w / sum_w
    }

    const wave_function = new Matrix<number[]>(n_rows, n_cols, superposition)

    // TODO

    const result = new Int32Array()

    wave_function.foreach((row, col, superposition) => {
        result[row * n_cols + col] = superposition[0]
    })
    return result
}
