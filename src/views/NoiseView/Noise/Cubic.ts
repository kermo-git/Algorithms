import { HashTable, type Noise2D, type Noise3D } from './Noise'

function interpolate(a: number, b: number, c: number, d: number, t: number) {
    const p = d - c - (a - b)
    return t * (t * (t * p + (a - b - p)) + (c - a)) + b
}

export class Cubic2D implements Noise2D {
    hash_table = new HashTable(Math.random)

    noise(x: number, y: number): number {
        const x1 = Math.floor(x)
        const y1 = Math.floor(y)

        const x0 = x1 - 1
        const x2 = x1 + 1
        const x3 = x1 + 2

        const tx = x - x1
        const ty = y - y1

        const interpolated_x = [0, 0, 0, 0]
        for (let i = 0; i < 4; i++) {
            const yi = y1 - 1 + i
            interpolated_x[i] = interpolate(
                this.hash_table.hash2D(x0, yi),
                this.hash_table.hash2D(x1, yi),
                this.hash_table.hash2D(x2, yi),
                this.hash_table.hash2D(x3, yi),
                tx,
            )
        }

        return interpolate(
            interpolated_x[0],
            interpolated_x[1],
            interpolated_x[2],
            interpolated_x[3],
            ty,
        )
    }
}

export class Cubic3D implements Noise3D {
    hash_table = new HashTable(Math.random)

    noise(x: number, y: number, z: number): number {
        const x1 = Math.floor(x)
        const y1 = Math.floor(y)
        const z1 = Math.floor(z)

        const x0 = x1 - 1
        const x2 = x1 + 1
        const x3 = x1 + 2

        const tx = x - x1
        const ty = y - y1
        const tz = z - z1

        const interpolated_z = [0, 0, 0, 0]

        for (let i = 0; i < 4; i++) {
            const interpolated_x = [0, 0, 0, 0]

            const yi = y1 - 1 + i
            for (let j = 0; j < 4; j++) {
                const zi = z1 - 1 + j
                interpolated_x[j] = interpolate(
                    this.hash_table.hash3D(x0, yi, zi),
                    this.hash_table.hash3D(x1, yi, zi),
                    this.hash_table.hash3D(x2, yi, zi),
                    this.hash_table.hash3D(x3, yi, zi),
                    tx,
                )
            }
            interpolated_z[i] = interpolate(
                interpolated_x[0],
                interpolated_x[1],
                interpolated_x[2],
                interpolated_x[3],
                tz,
            )
        }

        return interpolate(
            interpolated_z[0],
            interpolated_z[1],
            interpolated_z[2],
            interpolated_z[3],
            ty,
        )
    }
}
