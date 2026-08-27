import { ShaderModule } from '@/WebGPU/ShaderModuleSystem'
import type { FloatArray } from '@/WebGPU/Engine'

export type VecType = 'vec2f' | 'vec3f' | 'vec4f'

export interface NoiseModule extends ShaderModule {
    posType: VecType
    secondParamType: string
}

export const FBMParams: ShaderModule = {
    name: 'FBMParams',
    emitShaderCode: () => /* wgsl */ `
        struct FBMParams {
            n_octaves: u32,
            lacunarity: f32,
            persistence: f32
        };

        const DEFAULT_FBM_PARAMS = FBMParams(3, 2, 0.5);
    `
}

export function FBMNoiseModule(noise: NoiseModule): ShaderModule {
    return {
        name: `${noise.name}_fbm`,
        imports: [noise, FBMParams],

        emitShaderCode: () => {
            let seed_increment = ''

            if (noise.secondParamType !== 'u32') {
                seed_increment = 'noise_params_copy.seed += 1;'
            } else {
                seed_increment = 'noise_params_copy += 1;'
            }

            return /* wgsl */ `
                fn ${noise.name}_fbm(noise_pos: ${noise.posType}, noise_params: ${noise.secondParamType}, fbm_params: FBMParams) -> f32 {
                    var noise_params_copy = noise_params;

                    var noise_value: f32 = ${noise.name}(noise_pos, noise_params_copy);
                    var min_noise_value: f32 = 0;
                    var max_noise_value: f32 = 1;

                    var frequency: f32 = 2;
                    var amplitude: f32 = persistence;

                    for (var i = 1u; i < fbm_params.n_octaves; i++) {
                        ${seed_increment}
                        noise_value += amplitude * ${noise.name}(noise_pos * frequency, noise_params_copy);

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
