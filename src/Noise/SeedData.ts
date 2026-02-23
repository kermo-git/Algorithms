import type { PowerOfTwo } from './Types'

export const noiseSeedUnitShader = /* wgsl */ `
    struct NoiseFeature {
        rand_point: vec4f,
        unit_vector_2d: vec2f,
        unit_vector_3d: vec3f,
        unit_vector_4d: vec4f
    }
`

export function generateHashChannels(n: PowerOfTwo = 256, n_channels: PowerOfTwo = 8) {
    const data = new Int32Array(n_channels * 2 * n)
    for (let c = 0; c < n_channels; c++) {
        data.set(generateHashTable(n), c * n)
    }
    return data
}

export function generateHashTable(n: PowerOfTwo = 256) {
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

export function generateNoiseFeatures(n: PowerOfTwo = 256) {
    const ARRAY_STRIDE = 64
    const data = new ArrayBuffer(ARRAY_STRIDE * n)

    function generatePoint(i: number) {
        const view = new Float32Array(data, ARRAY_STRIDE * i, 4)
        view.set([Math.random(), Math.random(), Math.random(), Math.random()])
    }

    function generateUnitVector2D(i: number) {
        const offset = ARRAY_STRIDE * i + 16
        const view = new Float32Array(data, offset, 2)

        const phi = (2 * Math.PI * i) / n
        const x = Math.cos(phi)
        const y = Math.sin(phi)

        view.set([x, y])
    }

    function generateUnitVector3D(i: number) {
        const offset = ARRAY_STRIDE * i + 32
        const view = new Float32Array(data, offset, 3)

        const phi = 2 * Math.PI * Math.random()
        const theta = Math.PI * Math.random()

        const sin_phi = Math.sin(phi)
        const cos_phi = Math.cos(phi)
        const sin_theta = Math.sin(theta)
        const cos_theta = Math.cos(theta)

        const x = sin_theta * cos_phi
        const y = sin_theta * sin_phi
        const z = cos_theta

        view.set([x, y, z])
    }

    function generateUnitVector4D(i: number) {
        const offset = ARRAY_STRIDE * i + 48
        const view = new Float32Array(data, offset, 4)

        const theta_1 = Math.PI * Math.random()
        const theta_2 = Math.PI * Math.random()
        const phi = 2 * Math.PI * Math.random()

        const sin_theta_1 = Math.sin(theta_1)
        const sin_theta_2 = Math.sin(theta_2)

        const x = Math.cos(theta_1)
        const y = sin_theta_1 * Math.cos(theta_2)
        const z = sin_theta_1 * sin_theta_2 * Math.cos(phi)
        const w = sin_theta_1 * sin_theta_2 * Math.sin(phi)

        view.set([x, y, z, w])
    }

    for (let i = 0; i < n; i++) {
        generatePoint(i)
        generateUnitVector2D(i)
        generateUnitVector3D(i)
        generateUnitVector4D(i)
    }
    return new Uint8Array(data)
}

export const defaultColorPoints = new Float32Array([0, 0, 0, 0, 1, 1, 1, 1])
