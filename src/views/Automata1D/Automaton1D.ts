import type { Matrix } from '@/utils/Matrix'

type numberArray = Uint8Array | number[]

export class Automaton1D {
    n_states: number
    neighborhood_radius: number
    new_center: Uint8Array

    constructor(n_states: number, neighborhood_radius: number) {
        this.n_states = n_states
        this.neighborhood_radius = neighborhood_radius
        const n_configurations = getNumConfigs(n_states, neighborhood_radius)
        this.new_center = new Uint8Array(Number(n_configurations))
    }

    getIndex(neighborhood: numberArray): number {
        let index = neighborhood[0]
        for (let i = 1; i < neighborhood.length; i++) {
            index = index * this.n_states + neighborhood[i]
        }
        return index
    }

    get(neighborhood: numberArray): number {
        const index = this.getIndex(neighborhood)
        return this.new_center[index]
    }

    set(neighborhood: numberArray, new_center: number) {
        const index = this.getIndex(neighborhood)
        this.new_center[index] = new_center
    }

    randomize(lambda: number) {
        for (let i = 0; i < this.new_center.length; i++) {
            if (Math.random() > lambda) {
                const random_state = Math.floor(Math.random() * this.n_states)
                this.new_center[i] = random_state
            } else {
                this.new_center[i] = 0
            }
        }
        this.new_center[0] = 0
    }

    getRuleNumber(): bigint {
        const n_states = BigInt(this.n_states)
        const n_configurations = BigInt(this.new_center.length)
        const n_neighbors = getNumNeighbors(this.neighborhood_radius)

        const neighborhood = new Uint8Array(n_neighbors)
        let result = 0n

        for (let i = 0n; i < n_configurations; i++) {
            const value = BigInt(this.get(neighborhood))
            result += value * n_states ** i
            advance(neighborhood, this.n_states)
        }
        return result
    }
}

function advance(neighborhood: numberArray, n_states: number) {
    let i = neighborhood.length - 1
    while (i >= 0) {
        neighborhood[i] += 1
        if (neighborhood[i] === n_states) {
            neighborhood[i] = 0
            i -= 1
        } else {
            break
        }
    }
}

function getNumNeighbors(radius: number): number {
    return 2 * radius + 1
}

function getNumConfigs(n_states: number, radius: number): bigint {
    const size = BigInt(getNumNeighbors(radius))
    return BigInt(n_states) ** size
}

export function getNumRules(n_states: number, radius: number): bigint {
    return BigInt(n_states) ** getNumConfigs(n_states, radius)
}

export function createRule(
    rule_number: bigint,
    n_states: number,
    neighborhood_radius: number,
): Automaton1D {
    const automaton = new Automaton1D(n_states, neighborhood_radius)

    const n_neighbor_configurations = automaton.new_center.length
    const neighborhood = new Uint8Array(getNumNeighbors(neighborhood_radius))
    const n_states_bigint = BigInt(n_states)

    let remaining = rule_number

    for (let i = 0; i < n_neighbor_configurations; i++) {
        let new_center = 0n
        if (remaining > 0n) {
            new_center = remaining % n_states_bigint
            remaining = (remaining - new_center) / n_states_bigint
        }
        automaton.set(neighborhood, Number(new_center))
        advance(neighborhood, n_states)
    }
    return automaton
}

export type FirstGenType = 'Center' | 'Random'

export function generatePattern(matrix: Matrix, first_gen: FirstGenType, automaton: Automaton1D) {
    const max_col = matrix.n_cols - 1

    if (first_gen == 'Random') {
        for (let col = 0; col < matrix.n_cols; col++) {
            const state = Math.floor(Math.random() * automaton.n_states)
            matrix.set(0, col, state)
        }
    } else {
        for (let col = 0; col < matrix.n_cols; col++) {
            matrix.set(0, col, 0)
        }
        const center_col = Math.floor(max_col / 2)
        matrix.set(0, center_col, 1)
    }
    const radius = automaton.neighborhood_radius

    for (let row = 1; row < matrix.n_rows; row++) {
        for (let col = 0; col < matrix.n_cols; col++) {
            const neighborhood = getNeighborhood(matrix, row - 1, col, radius)
            const new_center = automaton.get(neighborhood)
            matrix.set(row, col, new_center)
        }
    }
}

function getNeighborhood(
    matrix: Matrix,
    row: number,
    center_col: number,
    radius: number,
): Uint8Array {
    const start_col = center_col - radius
    const n_cols = matrix.n_cols
    const result = new Uint8Array(getNumNeighbors(radius))

    for (let i = 0; i < result.length; i++) {
        let col = i + start_col
        if (col < 0) {
            col = n_cols + col
        } else if (col >= n_cols) {
            col = col - n_cols
        }
        result[i] = matrix.get(row, col)
    }
    return result
}
