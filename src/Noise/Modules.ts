import {
    ReadOnlyShaderModule,
    StorageBuffer
} from '@/WebGPU/ShaderModuleSystem/Modules'

export type VecType = 'vec2f' | 'vec3f' | 'vec4f'

export interface NoiseModule extends ReadOnlyShaderModule {
    posType: VecType
}

export function FBMNoiseModule(noise: NoiseModule): ReadOnlyShaderModule {
    const fbm_params = {
        name: 'FBMParams',
        code: /* wgsl */ `
            struct FBMParams {
                n_octaves: u32,
                persistence: f32,
                lacunarity: f32
            };
        `
    }

    return {
        name: `${noise.name}_fbm`,
        imports: [noise, fbm_params],

        code: /* wgsl */ `
            fn ${noise.name}_fbm(noise_pos: ${noise.posType}, 
                                 seed: u32, 
                                 fbm_params: FBMParams) -> f32 {
                var octave_seed = seed;

                var noise_value: f32 = ${noise.name}(noise_pos, octave_seed);
                var min_noise_value: f32 = 0;
                var max_noise_value: f32 = 1;

                var frequency: f32 = 2;
                var amplitude: f32 = fbm_params.persistence;

                for (var i = 1u; i < fbm_params.n_octaves; i++) {
                    octave_seed += 1;
                    noise_value += amplitude * ${noise.name}(noise_pos * frequency, octave_seed);

                    min_noise_value += amplitude * 0.4;
                    max_noise_value += amplitude * 0.6;

                    frequency *= fbm_params.lacunarity;
                    amplitude *= fbm_params.persistence;
                }
                return (noise_value - min_noise_value) / (max_noise_value - min_noise_value);
            }
        `
    }
}

export const Gradients2D: StorageBuffer = {
    kind: 'StorageBuffer',
    name: 'gradients_2D',
    dataType: 'array<vec2f>',
    data: generateUnitVectors2D(16).buffer
}

export const Gradients3D: StorageBuffer = {
    kind: 'StorageBuffer',
    name: 'gradients_3D',
    dataType: 'array<vec3f>',
    data: generateUnitVectors3D(64).buffer
}

export const Gradients4D: StorageBuffer = {
    kind: 'StorageBuffer',
    name: 'gradients_4D',
    dataType: 'array<vec4f>',
    data: generateUnitVectors4D(64).buffer
}

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

// https://math.stackexchange.com/questions/3291489/can-the-fibonacci-lattice-be-extended-to-dimensions-higher-than-3
// https://marcalexa.github.io/superfibonacci/
export function generateUnitVectors4D(n: number) {
    const data = new Float32Array(4 * n)

    const phi = Math.SQRT2
    const psi = 1.533751168755204288118041

    for (let i = 0; i < n; i++) {
        const s = i + 0.5
        const r = Math.sqrt(s / n)
        const R = Math.sqrt(1 - s / n)
        const alpha = (2.0 * Math.PI * s) / phi
        const beta = (2.0 * Math.PI * s) / psi

        const offset = 4 * i
        data[offset] = r * Math.sin(alpha)
        data[offset + 1] = r * Math.cos(alpha)
        data[offset + 2] = R * Math.sin(beta)
        data[offset + 3] = R * Math.cos(beta)
    }

    return data
}
