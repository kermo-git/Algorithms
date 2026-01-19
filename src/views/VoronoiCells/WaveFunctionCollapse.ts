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

function vec2(x: number, y: number): Vec2 {
    return { x, y }
}

const DirectionVectors = [
    { x: 0, y: 1 }, // North
    { x: 1, y: 1 }, // NorthEast
    { x: 1, y: 0 }, // East
    { x: 1, y: -1 }, // SouthEast
    { x: 0, y: -1 }, // South
    { x: -1, y: -1 }, // SouthWest
    { x: -1, y: 0 }, // West
    { x: -1, y: 1 }, // NorthWest
]

function add(vec_a: Vec2, vec_b: Vec2): Vec2 {
    return {
        x: vec_a.x + vec_b.x,
        y: vec_a.y + vec_b.y,
    }
}

function subtract(vec_a: Vec2, vec_b: Vec2): Vec2 {
    return {
        x: vec_a.x - vec_b.x,
        y: vec_a.y - vec_b.y,
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
        this.rules = new Array(n_tiles * n_tiles * 8).fill(false)
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
        const index = (tile * n_tiles + neighbor_tile) * 8 + direction
        this.rules[index] = value
    }

    get(tile: number, direction: Direction, neighbor_tile: number): boolean {
        const n_tiles = this.weights.length
        const index = (tile * n_tiles + neighbor_tile) * 4 + direction
        return this.rules[index]
    }

    filterMatchingTiles(
        superposition_A: number[],
        direction: Direction,
        superposition_B: number[],
    ): number[] {
        return superposition_B.filter((tile_B) =>
            superposition_A.every((tile_A) => this.get(tile_A, direction, tile_B)),
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

function propagateToGrid(wave_function: Matrix<number[]>, start_pos: Vec2, rules: WFCRules) {
    const tiles = wave_function.get(start_pos.x, start_pos.y)
    wave_function.set(start_pos.x, start_pos.y, [rules.collapse(tiles)])

    const n_rows = wave_function.n_rows
    const n_cols = wave_function.n_cols

    function mask(x: number, y: number): Vec2 {
        return {
            x: x % n_cols,
            y: y % n_rows,
        }
    }

    let min_entropy = Number.MAX_VALUE
    let min_entropy_pos = start_pos
    let success = true

    function process(x: number, y: number, directions: Direction[]) {
        const pos = { x, y }
        const m_pos = mask(x, y)

        for (const direction of directions) {
            const neighbor = step(pos, direction)
            const masked_neighbor = mask(neighbor.x, neighbor.y)

            const neighbor_tiles = wave_function.get(masked_neighbor.x, masked_neighbor.y)
            const tiles = wave_function.get(m_pos.x, m_pos.y)

            const filtered_tiles = rules.filterMatchingTiles(neighbor_tiles, direction, tiles)
            wave_function.set(m_pos.x, m_pos.y, filtered_tiles)
        }
        const tiles = wave_function.get(m_pos.x, m_pos.y)
        const entropy = rules.entropy(tiles)

        if (entropy < min_entropy) {
            min_entropy = entropy
            min_entropy_pos = m_pos
        }
        success = success && tiles.length > 0
    }

    const NORTH_SOUTH = [Direction.North, Direction.South]

    const EAST_SIDE = [Direction.NorthEast, Direction.East, Direction.SouthEast]
    const WEST_SIDE = [Direction.SouthWest, Direction.West, Direction.NorthWest]
    const BOTH_SIDES = EAST_SIDE.concat(WEST_SIDE)
    const ALL_SIDES = BOTH_SIDES.concat(NORTH_SOUTH)

    const L_SHAPE = EAST_SIDE.concat([Direction.South])
    const C_SHAPE = EAST_SIDE.concat(NORTH_SOUTH)
    const U_SHAPE = BOTH_SIDES.concat([Direction.South])

    // | # # # S # # # # # | # # # S # # # # # |

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
        process(x, start_pos.y, EAST_SIDE)

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

    return { success, min_entropy_pos }
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
