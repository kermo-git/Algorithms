import { HashTable, randUnitVector2D, randUnitVector3D, type Noise2D, type Noise3D } from './Noise'
import { type Vec2, type Vec3 } from './Geometry'

function fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(t: number, a: number, b: number) {
    return a + t * (b - a)
}

export class Perlin2D implements Noise2D {
    hash_table = new HashTable(randUnitVector2D)

    grad(gradient: Vec2, x: number, y: number) {
        return gradient.x * x + gradient.y * y
    }

    noise(x: number, y: number): number {
        const x0 = Math.floor(x)
        const y0 = Math.floor(y)

        const x1 = x0 + 1
        const y1 = y0 + 1

        const px = x - x0
        const py = y - y0

        const a = this.grad(this.hash_table.hash2D(x0, y0), px, py)
        const b = this.grad(this.hash_table.hash2D(x1, y0), px - 1, py)
        const c = this.grad(this.hash_table.hash2D(x0, y1), px, py - 1)
        const d = this.grad(this.hash_table.hash2D(x1, y1), px - 1, py - 1)

        const Sx = fade(px)
        const Sy = fade(py)

        return lerp(Sy, lerp(Sx, a, b), lerp(Sx, c, d))
    }
}

export class Perlin3D implements Noise3D {
    hash_table = new HashTable(randUnitVector3D)

    grad(gradient: Vec3, x: number, y: number, z: number) {
        return gradient.x * x + gradient.y * y + gradient.z * z
    }

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

        const a = this.grad(this.hash_table.hash3D(x0, y0, z0), px, py, pz)
        const b = this.grad(this.hash_table.hash3D(x1, y0, z0), px - 1, py, pz)
        const c = this.grad(this.hash_table.hash3D(x0, y1, z0), px, py - 1, pz)
        const d = this.grad(this.hash_table.hash3D(x1, y1, z0), px - 1, py - 1, pz)
        const e = this.grad(this.hash_table.hash3D(x0, y0, z1), px, py, pz - 1)
        const f = this.grad(this.hash_table.hash3D(x1, y0, z1), px - 1, py, pz - 1)
        const g = this.grad(this.hash_table.hash3D(x0, y1, z1), px, py - 1, pz - 1)
        const h = this.grad(this.hash_table.hash3D(x1, y1, z1), px - 1, py - 1, pz - 1)

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
