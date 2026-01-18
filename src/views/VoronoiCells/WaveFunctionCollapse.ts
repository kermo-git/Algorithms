// https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/
// https://github.com/robert/wavefunction-collapse/tree/master

import { Matrix } from '@/utils/Matrix'
import type { IntArray } from '@/WebGPU/ShaderDataUtils'

enum Direction {
    North = 0,
    East = 1,
    South = 2,
    West = 3,
}

interface Vec2 {
    x: number
    y: number
}

const DirectionVectors = [
    { x: 0, y: 1 }, // North
    { x: 1, y: 0 }, // East
    { x: 0, y: -1 }, // South
    { x: -1, y: 0 }, // West
]

function add(vec_a: Vec2, vec_b: Vec2): Vec2 {
    return {
        x: vec_a.x + vec_b.x,
        y: vec_a.y + vec_b.y,
    }
}

function step(pos: Vec2, direction: Direction): Vec2 {
    return add(pos, DirectionVectors[direction])
}

export class WFCRules {
    weights: number[] = []
    rules: boolean[] = []

    constructor(n_tiles: number) {
        this.weights = new Array(n_tiles).fill(0)
        this.rules = new Array(n_tiles * n_tiles * 4).fill(false)
    }

    addWeight(tile: number, increment: number) {
        this.weights[tile] += increment
    }

    set(tile: number, direction: Direction, neighbor_tile: number, value = true) {
        const n_tiles = this.weights.length
        const index = (tile * n_tiles + neighbor_tile) * 4 + direction
        this.rules[index] = value
    }

    get(tile: number, direction: Direction, neighbor_tile: number): boolean {
        const n_tiles = this.weights.length
        const index = (tile * n_tiles + neighbor_tile) * 4 + direction
        return this.rules[index]
    }

    filterMatchingTiles(cell_A: number[], direction: Direction, cell_B: number[]): number[] {
        return cell_B.filter((tile_B) =>
            cell_A.every((tile_A) => this.get(tile_A, direction, tile_B)),
        )
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

    return rules
}

function shannon_entropy(weigths: number[], superposition: number[]): number {
    let sum_w = 0
    let sum_w_log_w = 0

    superposition.forEach((tile) => {
        const w = weigths[tile]
        sum_w += w
        sum_w_log_w += w * Math.log(w)
    })
    return Math.log(sum_w) - sum_w_log_w / sum_w
}

function collapse(weigths: number[], superposition: number[]): number {
    let total_weight = 0

    superposition.forEach((tile) => {
        total_weight += weigths[tile]
    })
    const choice = Math.random() * total_weight
    let decision_boundary = 0

    for (let i = 0; i < superposition.length; i++) {
        decision_boundary += weigths[i]
        if (choice < decision_boundary) {
            return superposition[i]
        }
    }
    return superposition[0]
}

interface PropagationResult {
    entropy: number
    nPossibilities: number
}

/**
 * This function signature is part of wave function collapse algorithm and it propagates consequences from grid cell A to grid cell B. In other words, it might remove some tiles from B's possibilities if they conflict with A's possibilities according to adjacency rules.
 *
 * @param cell_A The position of cell A.
 * @param direction The direction of cell B relative to A.
 * @param cell_B The position of cell A.
 *
 * @returns An object of type {@link PropagationResult} that contains B's `entropy` and number of remaining possibilities (`nPossibilities`).
 */
type PropagateToCellFn = (cell_A: Vec2, direction: Direction, cell_B: Vec2) => PropagationResult

/**
 * This function is part of the wave function collapse algorithm. It propagates the consequences of "collapsing" one cell all over the grid.
 *
 * @param start_pos The position of the grid cell from which propagation starts
 * @param size A pair of integers for number of rows and columns in the grid.
 * @param callback A callback function that propagates consequences from one grid cell to another. See {@link PropagateToCellFn} for details.
 */
function propagateToGrid(start_pos: Vec2, size: Vec2, callback: PropagateToCellFn) {
    const max_row = size.x - 1
    const max_col = size.y - 1

    const queue = [start_pos]
    let min_entropy = Number.MAX_VALUE
    let min_entropy_pos = start_pos

    function process(current_pos: Vec2, direction: Direction, add_to_stack: boolean): boolean {
        const neighbor_pos = step(current_pos, direction)
        const { entropy, nPossibilities } = callback(current_pos, direction, neighbor_pos)

        if (nPossibilities > 1) {
            if (entropy < min_entropy) {
                min_entropy = entropy
                min_entropy_pos = neighbor_pos
            }
            if (add_to_stack) {
                queue.push(neighbor_pos)
            }
        }
        return nPossibilities > 0
    }
    let failed = false

    while (queue.length > 1 && !failed) {
        const current_pos = queue.splice(0, 1)[0]

        if (current_pos.y < max_row && current_pos.y >= start_pos.y) {
            failed &&= process(current_pos, Direction.North, true)
        }
        if (current_pos.x < max_col && current_pos.x >= start_pos.x) {
            failed &&= process(current_pos, Direction.East, current_pos.y == start_pos.y)
        }
        if (current_pos.y > 0 && current_pos.y <= start_pos.y) {
            failed &&= process(current_pos, Direction.South, true)
        }
        if (current_pos.x > 0 && current_pos.x <= start_pos.x) {
            failed &&= process(current_pos, Direction.West, current_pos.y == start_pos.y)
        }
    }
    return { failed, min_entropy_pos }
}

export function generateWFCShaderImage(rules: WFCRules, n_rows: number, n_cols: number): IntArray {
    const superposition: number[] = []
    const weigths = rules.weights
    const n_tiles = weigths.length

    for (let i = 0; i < n_tiles; i++) {
        superposition.push(i)
    }

    const wave_function = new Matrix<number[]>(n_rows, n_cols, superposition)

    // TODO
    const start_row = Math.floor(Math.random() * n_rows)
    const start_col = Math.floor(Math.random() * n_cols)

    const result = new Int32Array()

    wave_function.foreach((row, col, superposition) => {
        result[row * n_cols + col] = superposition[0]
    })
    return result
}
