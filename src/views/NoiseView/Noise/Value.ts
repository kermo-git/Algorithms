import { HashTable, type Noise2D, type Noise3D } from './Noise'

function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(t: number, a: number, b: number) {
    return a + t * (b - a)
}

export class Value2D implements Noise2D {
    hash_table = new HashTable(Math.random)

    noise(x: number, y: number): number {
        const x0 = Math.floor(x)
        const y0 = Math.floor(y)

        const x1 = x0 + 1
        const y1 = y0 + 1

        const px = x - x0
        const py = y - y0

        const a = this.hash_table.hash2D(x0, y0)
        const b = this.hash_table.hash2D(x1, y0)
        const c = this.hash_table.hash2D(x0, y1)
        const d = this.hash_table.hash2D(x1, y1)

        const Sx = fade(px)
        const Sy = fade(py)

        return lerp(Sy, lerp(Sx, a, b), lerp(Sx, c, d))
    }
}

export class Value3D implements Noise3D {
    hash_table = new HashTable(Math.random)

    noise(x: number, y: number, z: number): number {
        const x0 = Math.floor(x)
        const y0 = Math.floor(y)
        const z0 = Math.floor(z)

        const x1 = x0 + 1
        const y1 = y0 + 1
        const z1 = z0 + 1

        const px = x - x0
        const py = y - y0
        const pz = z - z0

        const a = this.hash_table.hash3D(x0, y0, z0)
        const b = this.hash_table.hash3D(x1, y0, z0)
        const c = this.hash_table.hash3D(x0, y1, z0)
        const d = this.hash_table.hash3D(x1, y1, z0)
        const e = this.hash_table.hash3D(x0, y0, z1)
        const f = this.hash_table.hash3D(x1, y0, z1)
        const g = this.hash_table.hash3D(x0, y1, z1)
        const h = this.hash_table.hash3D(x1, y1, z1)

        const Sx = fade(px)
        const Sy = fade(py)
        const Sz = fade(pz)

        return lerp(
            Sz,
            lerp(Sy, lerp(Sx, a, b), lerp(Sx, c, d)),
            lerp(Sy, lerp(Sx, e, f), lerp(Sx, g, h)),
        )
    }
}
