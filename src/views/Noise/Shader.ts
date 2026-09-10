import { FBMNoiseModule, type NoiseModule } from '@/Noise/Types'
import {
    ComputeShader,
    readView,
    ShaderModule
} from '@/WebGPU/ShaderModuleSystem/Modules'
import { parseHexColor } from '@/utils/Colors'
import { createModule } from '@/Noise/Algorithms/Common'

export type DomainTransform = 'None' | 'Rotate' | 'Warp'

export interface Setup {
    noise: NoiseModule
    transform: DomainTransform
    n_grid_columns?: number
    n_main_octaves?: number
    persistence?: number
    lacunarity?: number
    z_coord?: number
    w_coord?: number
    n_warp_octaves?: number
    warp_strength?: number
    colors?: string[]
    color_points?: number[]
}

export function MainModule(
    setup: Setup,
    wg_dim_x: number,
    wg_dim_y: number
): ComputeShader {
    const fbm_module = FBMNoiseModule(setup.noise)
    const imports = [
        RandomSeed(),
        ParametersUniform(setup),
        InterPolateColor(
            setup.colors || ['#000000', '#FFFFFF'],
            setup.color_points || [0, 1],
            16
        ),
        fbm_module
    ]
    let noise_pos_expr

    switch (setup.noise.posType) {
        case 'vec2f':
            noise_pos_expr = 'noise_pos_2D'
            if (setup.transform === 'Warp') {
                imports.push(Warp2D(setup))
                noise_pos_expr = `warp_2d(${noise_pos_expr})`
            }
            break
        case 'vec3f':
            noise_pos_expr = 'vec3f(noise_pos_2D, parameters.z_coordinate)'
            switch (setup.transform) {
                case 'Rotate':
                    imports.push(createModule('rotate_3d'))
                    noise_pos_expr = `rotate_3d(${noise_pos_expr})`
                    break
                case 'Warp':
                    imports.push(Warp3D(setup))
                    noise_pos_expr = `warp_3d(${noise_pos_expr})`
                    break
            }
            break
        case 'vec4f':
            noise_pos_expr =
                'vec4f(noise_pos_2D, parameters.z_coordinate, parameters.w_coordinate)'
            if (setup.transform === 'Rotate') {
                imports.push(createModule('rotate_4d'))
                noise_pos_expr = `rotate_4d(${noise_pos_expr})`
            }
            break
    }

    return {
        kind: 'ComputeShader',
        name: 'main',
        imports,
        canvas: 'canvas',
        code: /* wgsl */ `
        @compute @workgroup_size(${wg_dim_x}, ${wg_dim_y})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let canvas_pos = gid.xy;
            let canvas_dims = textureDimensions(canvas);

            if (canvas_pos.x >= canvas_dims.x || canvas_pos.y >= canvas_dims.y) {
                return;
            }
            let canvas_dims_f = vec2f(canvas_dims);
            let n_grid_rows = parameters.n_grid_columns * canvas_dims_f.y / canvas_dims_f.x;
            let grid_dims = vec2f(parameters.n_grid_columns, n_grid_rows);
            
            let noise_pos_2D = grid_dims * vec2f(canvas_pos) / canvas_dims_f;
            let noise_pos = ${noise_pos_expr};

            var fbm: FBMParams;
            fbm.n_octaves = parameters.n_main_octaves;
            fbm.persistence = parameters.persistence;
            fbm.lacunarity = parameters.lacunarity;

            let noise_value = ${fbm_module.name}(noise_pos, random_seed, fbm);
            let color = interpolate_color(noise_value);

            textureStore(canvas, canvas_pos, color);
        }
    `
    }
}

function RandomSeed(): ShaderModule {
    return {
        name: 'random_seed',
        code: `const random_seed = bitcast<u32>(i32(${Date.now() >> 0}));`
    }
}

function ParametersUniform(setup: Setup): ShaderModule {
    const data = new ArrayBuffer(32)
    const int_view = new Uint32Array(data, 0, 2)
    const float_view = new Float32Array(data, 8)

    int_view[0] = setup.n_main_octaves || 1
    int_view[1] = setup.n_warp_octaves || 1

    float_view[0] = setup.warp_strength || 0.1
    float_view[1] = setup.persistence || 0.5
    float_view[2] = setup.lacunarity || 2
    float_view[3] = setup.n_grid_columns || 16
    float_view[4] = setup.z_coord || 0
    float_view[5] = setup.w_coord || 0

    return {
        name: 'parameters',
        resources: [
            {
                kind: 'Uniform',
                name: 'parameters',
                dataType: 'Parameters',
                data: data
            }
        ],
        code: /* wgsl */ `
            struct Parameters {
                n_main_octaves: u32,
                n_warp_octaves: u32,
                warp_strength: f32,
                persistence: f32,
                lacunarity: f32,
                n_grid_columns: f32,
                z_coordinate: f32,
                w_coordinate: f32
            };
        `
    }
}

function Warp2D(setup: Setup): ShaderModule {
    const fbm_module = FBMNoiseModule(setup.noise)

    return {
        name: `warp_2d`,
        imports: [
            fbm_module,
            ParametersUniform(setup),
            RandomSeed(),
            createModule('unit_vector_2d')
        ],

        code: /* wgsl */ `
            fn warp_2d(noise_pos: vec2f) -> vec2f {
                var fbm: FBMParams;
                fbm.n_octaves = parameters.n_warp_octaves;
                fbm.persistence = parameters.persistence;
                fbm.lacunarity = parameters.lacunarity;
                
                const warp_seed = random_seed + 1u;
                let warp_noise_value = ${fbm_module.name}(noise_pos, warp_seed, fbm);
                return noise_pos + parameters.warp_strength * unit_vector_2d(warp_noise_value);
            }
        `
    }
}

function Warp3D(setup: Setup): ShaderModule {
    const fbm_module = FBMNoiseModule(setup.noise)

    return {
        name: `warp_3d`,
        imports: [
            fbm_module,
            ParametersUniform(setup),
            RandomSeed(),
            createModule('unit_vector_3d')
        ],

        code: /* wgsl */ `
            fn warp_3d(noise_pos: vec3f) -> vec3f {
                const phi_seed = random_seed + 1u;
                const theta_seed = random_seed + 2u;

                var fbm: FBMParams;
                fbm.n_octaves = parameters.n_warp_octaves;
                fbm.persistence = parameters.persistence;
                fbm.lacunarity = parameters.lacunarity;

                let phi_noise = ${fbm_module.name}(noise_pos, phi_seed, fbm);
                let theta_noise = ${fbm_module.name}(noise_pos, theta_seed, fbm);
                
                return noise_pos + parameters.warp_strength * unit_vector_3d(phi_noise, theta_noise);
            }
        `
    }
}

export function createColorData(colors: string[], points: number[]) {
    const result = new ArrayBuffer(16 * colors.length + 16)

    const int_view = new Uint32Array(result, 0, 1)
    int_view[0] = colors.length

    const float_view = new Float32Array(result, 16)

    for (let i = 0; i < colors.length; i++) {
        const { red, green, blue } = parseHexColor(colors[i])
        const offset = 4 * i

        float_view[offset + 0] = red / 255
        float_view[offset + 1] = green / 255
        float_view[offset + 2] = blue / 255
        float_view[offset + 3] = points[i]
    }
    return result
}

function InterPolateColor(
    initial_colors: string[],
    initial_points: number[],
    max_n_colors: number
): ShaderModule {
    return {
        name: 'interpolate_color',
        resources: [
            readView({
                kind: 'StorageBuffer',
                name: 'color_data',
                dataType: 'ColorArray',
                byteLength: 16 * max_n_colors + 16,
                data: createColorData(initial_colors, initial_points)
            })
        ],
        code: /* wgsl */ `
            struct ColorPoint {
                color: vec3f,
                value: f32,
            };

            struct ColorArray {
                n_colors: u32,
                points: array<ColorPoint>
            };

            fn interpolate_color(value: f32) -> vec4f {
                let n_colors = color_data.n_colors;
                
                if value <= color_data.points[0].value {
                    return vec4f(color_data.points[0].color, 1);
                } else if value > color_data.points[n_colors - 1].value {
                    return vec4f(color_data.points[n_colors - 1].color, 1);
                } else {
                    var prev_color = color_data.points[0].color;
                    var prev_value = color_data.points[0].value;

                    for (var i = 1u; i < n_colors; i++) {
                        var current_color = color_data.points[i].color;
                        var current_point = color_data.points[i].value;

                        if value <= current_point {
                            let blend_factor = (value - prev_value) / (current_point - prev_value);
                            let color = mix(prev_color, current_color, blend_factor);
                            return vec4f(color, 1);
                        }
                        prev_color = current_color;
                        prev_value = current_point;
                    }
                }
                return vec4f(vec3f(value), 1);
            }`
    }
}
