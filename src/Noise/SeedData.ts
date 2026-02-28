export function generateUnitVectors2D(n: number) {
    const data = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const phi = (2 * Math.PI * i) / n
        data[2 * i] = Math.cos(phi)
        data[2 * i + 1] = Math.sin(phi)
    }
    return data
}

// https://radi-cal.org/method/a-fibonacci-hemisphere/
// https://extremelearning.com.au/how-to-evenly-distribute-points-on-a-sphere-more-effectively-than-the-canonical-fibonacci-lattice/
export function generateUnitVectors3D(n: number) {
    const data = new Float32Array(4 * n)
    const eps = 0.3613
    const golden_ratio = (1 + Math.sqrt(5)) / 2

    for (let i = 0; i < n; i++) {
        const phi = (i * 2 * Math.PI) / golden_ratio
        const theta = Math.acos(1 - (2 * (i + eps)) / (n - 1 + 2 * eps))

        const x = Math.sin(theta) * Math.cos(phi)
        const y = Math.sin(theta) * Math.sin(phi)
        const z = Math.cos(theta)

        const offset = 4 * i
        data[offset] = x
        data[offset + 1] = y
        data[offset + 2] = z
    }

    return data
}

// TODO: 4D version of Fibonacci sphere
// https://math.stackexchange.com/questions/3291489/can-the-fibonacci-lattice-be-extended-to-dimensions-higher-than-3
// https://marcalexa.github.io/superfibonacci/
export function generateUnitVectors4D(n: number) {
    const data = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const theta_1 = Math.PI * Math.random()
        const theta_2 = Math.PI * Math.random()
        const phi = 2 * Math.PI * Math.random()

        const sin_theta_1 = Math.sin(theta_1)
        const sin_theta_2 = Math.sin(theta_2)

        const x = Math.cos(theta_1)
        const y = sin_theta_1 * Math.cos(theta_2)
        const z = sin_theta_1 * sin_theta_2 * Math.cos(phi)
        const w = sin_theta_1 * sin_theta_2 * Math.sin(phi)

        const offset = 4 * i
        data[offset] = x
        data[offset + 1] = y
        data[offset + 2] = z
        data[offset + 4] = w
    }

    return data
}

export const defaultColorPoints = new Float32Array([0, 0, 0, 0, 1, 1, 1, 1])
