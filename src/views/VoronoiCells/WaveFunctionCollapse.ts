// https://robertheaton.com/2018/12/17/wavefunction-collapse-algorithm/
// https://github.com/robert/wavefunction-collapse/tree/master

import { Matrix } from '@/utils/Matrix'
import type { IntArray } from '@/WebGPU/ShaderDataUtils'

enum Direction {
    North = 0,
    NorthEast = 1,
    East = 2,
    SouthEast = 3,
    South = 4,
    SouthWest = 5,
    West = 6,
    NorthWest = 7,
}

interface Vec2 {
    x: number
    y: number
}

const direction_vectors = [
    { x: 0, y: 1 }, // North
    { x: 1, y: 1 }, // NorthEast
    { x: 1, y: 0 }, // East
    { x: 1, y: -1 }, // SouthEast
    { x: 0, y: -1 }, // South
    { x: -1, y: -1 }, // SouthWest
    { x: -1, y: 0 }, // West
    { x: -1, y: 1 }, // NorthWest
]

export class WFCRules {
    weights: number[]
    rules: boolean[]

    constructor(n_tiles: number) {
        this.weights = new Array(n_tiles).fill(0)
        this.rules = new Array(n_tiles * n_tiles * 8).fill(false)
    }

    getNTiles() {
        return this.weights.length
    }

    addWeight(tile: number, increment: number) {
        this.weights[tile] += increment
    }

    collapse(superposition: number[]): number {
        let total_weight = 0

        superposition.forEach((tile) => {
            total_weight += this.weights[tile]
        })
        const choice = Math.random() * total_weight
        let decision_boundary = 0

        for (let i = 0; i < superposition.length; i++) {
            decision_boundary += this.weights[i]
            if (choice < decision_boundary) {
                return superposition[i]
            }
        }
        return superposition[0]
    }

    entropy(superposition: number[]): number {
        let sum_w = 0
        let sum_w_log_w = 0

        superposition.forEach((tile) => {
            const w = this.weights[tile]
            sum_w += w
            sum_w_log_w += w * Math.log(w)
        })
        return Math.log(sum_w) - sum_w_log_w / sum_w
    }

    set(tile: number, direction: Direction, neighbor_tile: number, value = true) {
        const n_tiles = this.weights.length
        const index = (tile * 8 + direction) * n_tiles + neighbor_tile
        this.rules[index] = value
    }

    get(tile: number, direction: Direction, neighbor_tile: number): boolean {
        const n_tiles = this.weights.length
        const index = (tile * 8 + direction) * n_tiles + neighbor_tile
        return this.rules[index]
    }

    propagate(to: number[], direction: Direction, from: number[]): number[] {
        return to.filter((to_tile) =>
            from.every((from_tile) => this.get(to_tile, direction, from_tile)),
        )
    }
}

export class WFCState {
    rules: WFCRules
    n_rows: number
    n_cols: number
    wave_function: Matrix<number[]>

    n_collapsed = 0
    is_success = true

    constructor(rules: WFCRules, n_rows: number, n_cols: number) {
        this.rules = rules
        this.n_rows = n_rows
        this.n_cols = n_cols

        const superposition: number[] = []
        for (let i = 0; i < rules.getNTiles(); i++) {
            superposition.push(i)
        }
        this.wave_function = new Matrix<number[]>(n_rows, n_cols, () => superposition.slice())
    }

    collapse(pos: Vec2) {
        const tiles = this.wave_function.get(pos.x, pos.y)

        if (tiles.length > 1) {
            this.n_collapsed += 1
        }
        this.wave_function.set(pos.x, pos.y, [this.rules.collapse(tiles)])
    }

    propagate(to: Vec2, from: Direction[]) {
        const to_x = to.x % this.n_cols
        const to_y = to.y % this.n_rows

        let tiles = this.wave_function.get(to_x, to_y)
        const n_before = tiles.length

        for (const direction of from) {
            const step = direction_vectors[direction]
            const neighbor_x = (to.x + step.x) % this.n_cols
            const neighbor_y = (to.y + step.y) % this.n_rows

            const neighbor_tiles = this.wave_function.get(neighbor_x, neighbor_y)
            tiles = this.rules.propagate(tiles, direction, neighbor_tiles)
        }
        this.wave_function.set(to_x, to_y, tiles)
        const n_now = tiles.length

        if (n_before > n_now && n_now === 1) {
            this.n_collapsed += 1
        }
        this.is_success = n_now > 0

        return {
            n_tiles: n_now,
            entropy: this.rules.entropy(tiles),
        }
    }

    isFinished() {
        return !this.is_success || this.n_collapsed === this.n_rows * this.n_cols
    }

    toArray(): IntArray {
        const result = new Int32Array()

        this.wave_function.foreach((row, col, superposition) => {
            result[row * this.n_cols + col] = superposition.length > 0 ? superposition[0] : 0
        })
        return result
    }
}

export function learnWFCRules(sample_picture: Matrix<number>): WFCRules {
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
        const north_east_tile = sample_picture.get(north_row, east_col)
        const east_tile = sample_picture.get(row, east_col)
        const south_east_tile = sample_picture.get(south_row, east_col)
        const south_tile = sample_picture.get(south_row, col)
        const south_west_tile = sample_picture.get(south_row, west_col)
        const west_tile = sample_picture.get(row, west_col)
        const north_west_tile = sample_picture.get(north_row, west_col)

        rules.set(tile, Direction.North, north_tile)
        rules.set(tile, Direction.NorthEast, north_east_tile)
        rules.set(tile, Direction.East, east_tile)
        rules.set(tile, Direction.SouthEast, south_east_tile)
        rules.set(tile, Direction.South, south_tile)
        rules.set(tile, Direction.SouthWest, south_west_tile)
        rules.set(tile, Direction.West, west_tile)
        rules.set(tile, Direction.NorthWest, north_west_tile)
    })

    return rules
}

function collapseAndPropagate(state: WFCState, start_pos: Vec2) {
    const n_rows = state.n_rows
    const n_cols = state.n_cols

    let min_entropy = Number.MAX_VALUE
    let min_entropy_pos = start_pos

    state.collapse(start_pos)

    function process(x: number, y: number, directions: Direction[]) {
        const { n_tiles, entropy } = state.propagate({ x, y }, directions)

        if (n_tiles > 1 && entropy < min_entropy) {
            min_entropy = entropy
            min_entropy_pos = {
                x: x % n_cols,
                y: y % n_rows,
            }
        }
    }
    const NORTH_SOUTH = [Direction.North, Direction.South]
    const EAST_SIDE = [Direction.NorthEast, Direction.East, Direction.SouthEast]
    const WEST_SIDE = [Direction.SouthWest, Direction.West, Direction.NorthWest]

    const BOTH_SIDES = EAST_SIDE.concat(WEST_SIDE)
    const ALL_SIDES = BOTH_SIDES.concat(NORTH_SOUTH)
    const L_SHAPE = WEST_SIDE.concat([Direction.South])
    const C_SHAPE = WEST_SIDE.concat(NORTH_SOUTH)
    const U_SHAPE = BOTH_SIDES.concat([Direction.South])

    const y_start = start_pos.y + 1
    const y_end = start_pos.y + n_rows - 2
    const y_connect = y_end + 1

    const x_start = start_pos.x + 1
    const x_end = start_pos.x + n_cols - 2
    const x_connect = x_end + 1

    for (let y = y_start; y <= y_end; y++) {
        process(start_pos.x, y, [Direction.South])
    }
    process(start_pos.x, y_connect, NORTH_SOUTH)

    for (let x = x_start; x <= x_end; x++) {
        process(x, start_pos.y, WEST_SIDE)

        for (let y = y_start; y <= y_end; y++) {
            process(x, y, L_SHAPE)
        }
        process(x, y_connect, C_SHAPE)
    }
    process(x_connect, start_pos.y, BOTH_SIDES)

    for (let y = y_start; y <= y_end; y++) {
        process(x_connect, y, U_SHAPE)
    }
    process(x_connect, y_connect, ALL_SIDES)

    return min_entropy_pos
}

export function generateWFCShaderImage(
    sample_picture: Matrix<number>,
    n_rows: number,
    n_cols: number,
): IntArray {
    const rules = learnWFCRules(sample_picture)
    const state = new WFCState(rules, n_rows, n_cols)

    let collapse_pos = {
        x: Math.floor(Math.random() * n_rows),
        y: Math.floor(Math.random() * n_cols),
    }
    while (!state.isFinished()) {
        collapse_pos = collapseAndPropagate(state, collapse_pos)
    }
    return state.toArray()
}
