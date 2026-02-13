export function hashTable(n: number = 256) {
    const hash_table = new Int32Array(2 * n)

    for (let i = 0; i < n; i++) {
        hash_table[i] = i
    }
    for (let i = 0; i < n; i++) {
        const temp = hash_table[i]
        const swap_index = Math.floor(Math.random() * n)
        hash_table[i] = hash_table[swap_index]
        hash_table[swap_index] = temp
    }
    for (let i = 0; i < n; i++) {
        hash_table[n + i] = hash_table[i]
    }
    return hash_table
}

export function randomValues(n: number = 256) {
    return new Float32Array(n).map(Math.random)
}

export function randomPoints2D(n: number = 256) {
    const array = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const offset = 2 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
    }
    return array
}

export function randomPoints3D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const offset = 4 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
        array[offset + 2] = Math.random()
    }
    return array
}

export function randomPoints4D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const offset = 4 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
        array[offset + 2] = Math.random()
        array[offset + 3] = Math.random()
    }
    return array
}

export function unitVectors2D(n: number = 256) {
    const array = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const phi = (2 * Math.PI * i) / n
        const x = Math.cos(phi)
        const y = Math.sin(phi)

        const offset = 2 * i
        array[offset] = x
        array[offset + 1] = y
    }
    return array
}

export function unitVectors3D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const phi = 2 * Math.PI * Math.random()
        const theta = Math.PI * Math.random()

        const sin_phi = Math.sin(phi)
        const cos_phi = Math.cos(phi)
        const sin_theta = Math.sin(theta)
        const cos_theta = Math.cos(theta)

        const x = sin_theta * cos_phi
        const y = sin_theta * sin_phi
        const z = cos_theta

        const offset = 4 * i
        array[offset] = x
        array[offset + 1] = y
        array[offset + 2] = z
    }
    return array
}

export function unitVectors4D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const theta_1 = Math.PI * Math.random()
        const theta_2 = Math.PI * Math.random()
        const phi = 2 * Math.PI * Math.random()

        const sin_theta_1 = Math.sin(theta_1)
        const cos_theta_1 = Math.cos(theta_1)

        const sin_theta_2 = Math.sin(theta_2)
        const cos_theta_2 = Math.cos(theta_2)

        const sin_phi = Math.sin(phi)
        const cos_phi = Math.cos(phi)

        const x = cos_theta_1
        const y = sin_theta_1 * cos_theta_2
        const z = sin_theta_1 * sin_theta_2 * cos_phi
        const w = sin_theta_1 * sin_theta_2 * sin_phi

        const offset = 4 * i
        array[offset] = x
        array[offset + 1] = y
        array[offset + 2] = z
        array[offset + 3] = w
    }
    return array
}

export const defaultColorPoints = new Float32Array([0, 0, 0, 0, 1, 1, 1, 1])
