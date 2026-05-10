export const DEG_TO_RAD = Math.PI / 180

export class Mat4x4 {
    columns_flat: Float32Array

    constructor(columns?: number[][]) {
        if (columns?.length === 4 && columns.every((c) => c.length === 4)) {
            this.columns_flat = new Float32Array(columns.flat())
        } else {
            this.columns_flat = new Float32Array(16)
        }
    }

    get(row: number, col: number) {
        return this.columns_flat[4 * col + row]
    }

    set(row: number, col: number, value: number) {
        this.columns_flat[4 * col + row] = value
    }

    matmul(other: Mat4x4): Mat4x4 {
        const res = new Mat4x4()

        for (let col = 0; col < 4; col++) {
            for (let row = 0; row < 4; row++) {
                let value = 0
                for (let common_dim = 0; common_dim < 4; common_dim++) {
                    value += this.get(row, common_dim) * other.get(common_dim, col)
                }
                res.set(row, col, value)
            }
        }

        return res
    }

    matmul_vec(vec3: number[]): number[] {
        const res = new Array(3)
        const last_dim = 3

        for (let row = 0; row < last_dim; row++) {
            let value = 0
            for (let col = 0; col < last_dim; col++) {
                value += this.get(row, col) * vec3[col]
            }
            res[row] = value + this.get(row, last_dim)
        }
        return res
    }

    toWebGPU_mat4x4() {
        return new Float32Array(this.columns_flat)
    }

    toWebGPU_rotation_mat3x3() {
        return new Float32Array(this.columns_flat.slice(0, 12))
    }
}

export function rotateX(rad: number): Mat4x4 {
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)

    // prettier-ignore
    return new Mat4x4([
        [1,  0,   0,   0],
        [0,  cos, sin, 0],
        [0, -sin, cos, 0],
        [0,  0,   0,   1]
    ])
}

export function rotateY(rad: number): Mat4x4 {
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)

    // prettier-ignore
    return new Mat4x4([
        [cos, 0, -sin, 0],
        [0,   1,  0,   0],
        [sin, 0,  cos, 0],
        [0,   0,  0,   1]
    ])
}

export function rotateZ(rad: number): Mat4x4 {
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)

    // prettier-ignore
    return new Mat4x4([
        [ cos, sin, 0, 0],
        [-sin, cos, 0, 0],
        [ 0,   0,   1, 0],
        [ 0,   0,   0, 1]
    ])
}

export function translate(x: number, y: number, z: number): Mat4x4 {
    // prettier-ignore
    return new Mat4x4([
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [x, y, z, 1]
    ])
}
