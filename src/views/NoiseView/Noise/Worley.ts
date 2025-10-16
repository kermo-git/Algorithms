import { HashTable, type Noise3D, type Noise2D } from './Noise'

export class Worley2D implements Noise2D {
    hash_table = new HashTable(() => {
        return {
            x: Math.random(),
            y: Math.random(),
        }
    })

    noise(x: number, y: number): number {
        const grid_x = Math.floor(x)
        const grid_y = Math.floor(y)
        let min_dist_sqr = Number.MAX_VALUE

        for (let offset_x = -1; offset_x < 2; offset_x++) {
            for (let offset_y = -1; offset_y < 2; offset_y++) {
                const neighbor_x = grid_x + offset_x
                const neighbor_y = grid_y + offset_y
                const point = this.hash_table.hash2D(neighbor_x, neighbor_y)

                const x_dist = neighbor_x + point.x - x
                const y_dist = neighbor_y + point.y - y
                const dist_sqr = x_dist * x_dist + y_dist * y_dist

                min_dist_sqr = Math.min(dist_sqr, min_dist_sqr)
            }
        }
        return Math.sqrt(min_dist_sqr)
    }
}

export class Worley3D implements Noise3D {
    hash_table = new HashTable(() => {
        return {
            x: Math.random(),
            y: Math.random(),
            z: Math.random(),
        }
    })

    noise(x: number, y: number, z: number): number {
        const grid_x = Math.floor(x)
        const grid_y = Math.floor(y)
        const grid_z = Math.floor(z)
        let min_dist_sqr = Number.MAX_VALUE

        for (let offset_x = -1; offset_x < 2; offset_x++) {
            for (let offset_y = -1; offset_y < 2; offset_y++) {
                for (let offset_z = -1; offset_z < 2; offset_z++) {
                    const neighbor_x = grid_x + offset_x
                    const neighbor_y = grid_y + offset_y
                    const neighbor_z = grid_z + offset_z
                    const point = this.hash_table.hash3D(neighbor_x, neighbor_y, neighbor_z)

                    const x_dist = neighbor_x + point.x - x
                    const y_dist = neighbor_y + point.y - y
                    const z_dist = neighbor_z + point.z - z
                    const dist_sqr = x_dist * x_dist + y_dist * y_dist + z_dist * z_dist

                    min_dist_sqr = Math.min(dist_sqr, min_dist_sqr)
                }
            }
        }
        return Math.sqrt(min_dist_sqr)
    }
}
