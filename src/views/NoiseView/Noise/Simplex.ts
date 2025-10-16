// https://en.wikipedia.org/wiki/Simplex_noise
// https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf

import {
    HashTable,
    randUnitVector2D,
    randUnitVector3D,
    type Noise2D,
    type Noise3D,
    type powerOfTwo,
} from './Noise'
import {
    type Vec2,
    type Vec3,
    add3D,
    subtract3D,
    dot3D,
    subtract2D,
    dot2D,
    add2D,
} from './Geometry'

function skew_constant(n_dimensions: number) {
    return (Math.sqrt(n_dimensions + 1) - 1) / n_dimensions
}

function unskew_constant(n_dimensions: number) {
    return (1 - 1 / Math.sqrt(n_dimensions + 1)) / n_dimensions
}

const SKEW_CONSTANT_2D = skew_constant(2)
const UNSKEW_CONSTANT_2D = unskew_constant(2)

function skew2D(point: Vec2): Vec2 {
    const s = (point.x + point.y) * SKEW_CONSTANT_2D
    return {
        x: point.x + s,
        y: point.y + s,
    }
}

function unSkew2D(point: Vec2): Vec2 {
    const s = (point.x + point.y) * UNSKEW_CONSTANT_2D
    return {
        x: point.x - s,
        y: point.y - s,
    }
}

const UNSKEW_XY = unSkew2D({ x: 1, y: 1 })

export class Simplex2D implements Noise2D {
    hash_table = new HashTable(randUnitVector2D)

    noise(x: number, y: number): number {
        const input = { x, y }
        const skewed_input = skew2D(input)
        const skewed_origin = {
            x: Math.floor(skewed_input.x),
            y: Math.floor(skewed_input.y),
        }
        const origin = unSkew2D(skewed_origin)
        const v_origin_input = subtract2D(input, origin)

        let skewed_v_origin_corner1: Vec2
        if (v_origin_input.x >= v_origin_input.y) {
            skewed_v_origin_corner1 = { x: 1, y: 0 }
        } else {
            skewed_v_origin_corner1 = { x: 0, y: 1 }
        }
        const i0 = this.calculateInfluence(skewed_origin, v_origin_input)

        const skewed_corner1 = add2D(skewed_origin, skewed_v_origin_corner1)
        const v_origin_corner1 = unSkew2D(skewed_v_origin_corner1)
        const v_corner1_input = subtract2D(v_origin_input, v_origin_corner1)
        const i1 = this.calculateInfluence(skewed_corner1, v_corner1_input)

        const skewed_corner2 = add2D(skewed_origin, { x: 1, y: 1 })
        const v_corner2_input = subtract2D(v_origin_input, UNSKEW_XY)
        const i2 = this.calculateInfluence(skewed_corner2, v_corner2_input)

        return 70 * (i0 + i1 + i2)
    }

    calculateInfluence(skewed_corner: Vec2, v_corner_input: Vec2): number {
        const t = 0.5 - dot2D(v_corner_input, v_corner_input)
        if (t < 0) {
            return 0
        }
        const corner_gradient = this.hash_table.hash2D(skewed_corner.x, skewed_corner.y)
        return t * t * t * t * dot2D(corner_gradient, v_corner_input)
    }
}

const SKEW_CONSTANT_3D = skew_constant(3)
const UNSKEW_CONSTANT_3D = unskew_constant(3)

function skew3D(point: Vec3): Vec3 {
    const s = (point.x + point.y + point.z) * SKEW_CONSTANT_3D
    return {
        x: point.x + s,
        y: point.y + s,
        z: point.z + s,
    }
}

function unSkew3D(point: Vec3): Vec3 {
    const s = (point.x + point.y + point.z) * UNSKEW_CONSTANT_3D
    return {
        x: point.x - s,
        y: point.y - s,
        z: point.z - s,
    }
}

const UNSKEW_XYZ = unSkew3D({ x: 1, y: 1, z: 1 })

export class Simplex3D implements Noise3D {
    hash_table = new HashTable(randUnitVector3D)

    noise(x: number, y: number, z: number): number {
        const input = { x, y, z }
        const skewed_input = skew3D(input)
        const skewed_origin = {
            x: Math.floor(skewed_input.x),
            y: Math.floor(skewed_input.y),
            z: Math.floor(skewed_input.z),
        }
        const origin = unSkew3D(skewed_origin)
        const v_origin_input = subtract3D(input, origin)

        const { skewed_v_origin_corner1, skewed_v_origin_corner2 } =
            this.findSimplex(v_origin_input)

        const i0 = this.calculateInfluence(skewed_origin, v_origin_input)

        const skewed_corner1 = add3D(skewed_origin, skewed_v_origin_corner1)
        const v_origin_corner1 = unSkew3D(skewed_v_origin_corner1)
        const v_corner1_input = subtract3D(v_origin_input, v_origin_corner1)
        const i1 = this.calculateInfluence(skewed_corner1, v_corner1_input)

        const skewed_corner2 = add3D(skewed_origin, skewed_v_origin_corner2)
        const v_origin_corner2 = unSkew3D(skewed_v_origin_corner2)
        const v_corner2_input = subtract3D(v_origin_input, v_origin_corner2)
        const i2 = this.calculateInfluence(skewed_corner2, v_corner2_input)

        const skewed_corner3 = add3D(skewed_origin, { x: 1, y: 1, z: 1 })
        const v_corner3_input = subtract3D(v_origin_input, UNSKEW_XYZ)
        const i3 = this.calculateInfluence(skewed_corner3, v_corner3_input)

        return 32 * (i0 + i1 + i2 + i3)
    }

    findSimplex(v_origin_input: Vec3) {
        if (v_origin_input.x >= v_origin_input.y) {
            if (v_origin_input.y >= v_origin_input.z)
                return {
                    skewed_v_origin_corner1: { x: 1, y: 0, z: 0 },
                    skewed_v_origin_corner2: { x: 1, y: 1, z: 0 },
                }
            else if (v_origin_input.x >= v_origin_input.z)
                return {
                    skewed_v_origin_corner1: { x: 1, y: 0, z: 0 },
                    skewed_v_origin_corner2: { x: 1, y: 0, z: 1 },
                }
            else
                return {
                    skewed_v_origin_corner1: { x: 0, y: 0, z: 1 },
                    skewed_v_origin_corner2: { x: 1, y: 0, z: 1 },
                }
        } else {
            if (v_origin_input.y < v_origin_input.z)
                return {
                    skewed_v_origin_corner1: { x: 0, y: 0, z: 1 },
                    skewed_v_origin_corner2: { x: 0, y: 1, z: 1 },
                }
            else if (v_origin_input.x < v_origin_input.z)
                return {
                    skewed_v_origin_corner1: { x: 0, y: 1, z: 0 },
                    skewed_v_origin_corner2: { x: 0, y: 1, z: 1 },
                }
            else
                return {
                    skewed_v_origin_corner1: { x: 0, y: 1, z: 0 },
                    skewed_v_origin_corner2: { x: 1, y: 1, z: 0 },
                }
        }
    }

    calculateInfluence(skewed_corner: Vec3, v_corner_input: Vec3): number {
        const t = 0.6 - dot3D(v_corner_input, v_corner_input)
        if (t < 0) {
            return 0
        }
        const corner_gradient = this.hash_table.hash3D(
            skewed_corner.x,
            skewed_corner.y,
            skewed_corner.z,
        )
        return t * t * t * t * dot3D(corner_gradient, v_corner_input)
    }
}
