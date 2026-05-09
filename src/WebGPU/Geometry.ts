export const DEG_TO_RAD = Math.PI / 180

export function rotateX(rad: number) {
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)

    // prettier-ignore
    return [
        1,  0,   0,   0, // First column
        0,  cos, sin, 0, // Second column
        0, -sin, cos, 0, // Third column
        0,  0,   0,   1
    ]
}

export function rotateY(rad: number) {
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)

    // prettier-ignore
    return [
        cos, 0, -sin, 0,
        0,   1,  0,   0,
        sin, 0,  cos, 0,
        0,  0,   0,   1
    ]
}

export function rotateZ(rad: number) {
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)

    // prettier-ignore
    return [
         cos, sin, 0, 0,
        -sin, cos, 0, 0,
         0,   0,   1, 0,
         0,   0,   0, 1
    ]
}

export function translate(x: number, y: number, z: number) {
    // prettier-ignore
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ]
}

export function to_webGPU_3x3(mat4x4: number[]) {
    return mat4x4.slice(0, 12)
}

export function combine(first_transform: number[], second_transform: number[]) {
    const res = new Array(16).fill(0)

    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            for (let common_dim = 0; common_dim < 4; common_dim++) {
                res[4 * col + row] +=
                    second_transform[4 * common_dim + row] * first_transform[4 * col + common_dim]
            }
        }
    }

    return res
}

export function transform(vec3: number[], transform: number[]) {
    const res = new Array(3).fill(0)
    const last_dim = 3

    for (let row = 0; row < last_dim; row++) {
        for (let col = 0; col < last_dim; col++) {
            res[row] += transform[4 * col + row] * vec3[col]
        }
        res[row] += transform[4 * last_dim + row]
    }
    return res
}
