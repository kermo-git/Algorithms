import { parseHexColor } from '@/utils/Colors'

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
    neighborhood_radius: number
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

function getNeighborhood(
    generation: number[],
    center_col: number,
    radius: number
): number[] {
    const start_col = center_col - radius
    const result = new Array(2 * radius + 1)

    for (let i = 0; i < result.length; i++) {
        let col = start_col + i
        if (col < 0) {
            col += generation.length
        } else if (col >= generation.length) {
            col -= generation.length
        }
        result[i] = generation[col]
    }
    return result
}

export type FirstGenType = 'Center' | 'Random'

export function generateRandomRow(size: number, n_states: number): number[] {
    return new Array(size)
        .fill(0)
        .map(() => Math.floor(Math.random() * n_states))
}

export function initializeCenter(size: number): number[] {
    const result = new Array(size).fill(0)
    const center_col = Math.floor((size - 1) / 2)
    result[center_col] = 1
    return result
}

export function generatePattern(
    canvas: HTMLCanvasElement,
    first_gen: number[],
    hex_colors: string[],
    automaton: Automaton1D
) {
    const ctx = canvas.getContext('2d')

    if (ctx) {
        const n_cols = canvas.width
        const n_rows = canvas.height

        let prev_gen: number[] = first_gen.slice()
        const current_gen: number[] = first_gen.slice()

        const image_data = ctx.createImageData(n_cols, n_rows)
        const image_array = image_data.data
        const colors = hex_colors.map(parseHexColor)

        function setColor(row: number, col: number, state: number) {
            const { red, green, blue } = colors[state]

            const offset = 4 * (n_cols * row + col)
            image_array[offset + 0] = red
            image_array[offset + 1] = green
            image_array[offset + 2] = blue
            image_array[offset + 3] = 255
        }

        const radius = automaton.neighborhood_radius

        for (let col = 0; col < n_cols; col++) {
            setColor(0, col, first_gen[col])
        }

        for (let row = 1; row < n_rows; row++) {
            for (let col = 0; col < n_cols; col++) {
                const neighborhood = getNeighborhood(prev_gen, col, radius)
                const state = automaton.get(neighborhood)
                current_gen[col] = state
                setColor(row, col, state)
            }
            prev_gen = current_gen.slice()
        }
        ctx.putImageData(image_data, 0, 0)
    }
}
