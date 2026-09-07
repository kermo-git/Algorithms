import type { FloatArray } from '@/WebGPU/Engine'
import { ShaderModule } from '@/WebGPU/ShaderModuleSystem/Modules'

export type VecType = 'vec2f' | 'vec3f' | 'vec4f'

export interface NoiseModule extends ShaderModule {
    posType: VecType
}

export function FBMNoiseModule(noise: NoiseModule): ShaderModule {
    return {
        name: `${noise.name}_fbm`,
        imports: [noise],

        code: /* wgsl */ `
            struct FBMParams {
                n_octaves: u32,
                lacunarity: f32,
                persistence: f32
            };

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

export interface Config {
    functionName: string
    extraBufferName?: string
}

export interface NoiseShaderFactory {
    pos_type: VecType
    extra_data_type?: string
    generateExtraData?: () => FloatArray
    createShaderDependencies(): string
    createShader(config: Config): string
}

export interface NoiseTransformNames {
    func_name: string
    noise_name: string
    pos_type: VecType
}
