import type { Vec2, Vec3 } from './Geometry'

export type powerOfTwo = 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024

export class HashTable<E = unknown> {
    mask: number
    hash_table: number[]
    random_elements: E[]

    constructor(generate_random_element: () => E, size: powerOfTwo = 256) {
        this.mask = size - 1
        this.hash_table = new Array(2 * size)
        this.random_elements = new Array(size)

        for (let i = 0; i < size; i++) {
            this.hash_table[i] = i
            this.random_elements[i] = generate_random_element()
        }
        for (let i = 0; i < size; i++) {
            const temp = this.hash_table[i]
            const swap_index = Math.floor(Math.random() * size)
            this.hash_table[i] = this.hash_table[swap_index]
            this.hash_table[swap_index] = temp
        }
        for (let i = 0; i < size; i++) {
            this.hash_table[size + i] = this.hash_table[i]
        }
    }

    hash2D(x: number, y: number): E {
        const m_x = x & this.mask
        const m_y = y & this.mask

        const hash = this.hash_table[this.hash_table[m_x] + m_y]
        return this.random_elements[hash]
    }

    hash3D(x: number, y: number, z: number): E {
        const m_x = x & this.mask
        const m_y = y & this.mask
        const m_z = z & this.mask

        const hash = this.hash_table[this.hash_table[this.hash_table[m_x] + m_y] + m_z]
        return this.random_elements[hash]
    }
}

export interface Noise2D {
    noise(x: number, y: number): number
}

export interface Noise3D {
    noise(x: number, y: number, z: number): number
}

export function randUnitVector2D(): Vec2 {
    const phi = 2 * Math.PI * Math.random()
    return {
        x: Math.cos(phi),
        y: Math.sin(phi),
    }
}

export function randUnitVector3D(): Vec3 {
    const phi = 2 * Math.PI * Math.random()
    const theta = Math.PI * Math.random()

    const sin_phi = Math.sin(phi)
    const cos_phi = Math.cos(phi)
    const sin_theta = Math.sin(theta)
    const cos_theta = Math.cos(theta)

    return {
        x: sin_theta * cos_phi,
        y: sin_theta * sin_phi,
        z: cos_theta,
    }
}
