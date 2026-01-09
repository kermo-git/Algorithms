import { WG_DIM } from '../ShaderDataUtils'
import type { DomainTransform, NoiseDimension } from './NoiseScene'
import {
    double_warp2D_shader,
    double_warp3D_shader,
    interpolate_colors_shader,
    octave_noise_shader,
    rotate3D_shader,
    rotate4D_shader,
    warp2D_shader,
    warp3D_shader,
} from './ShaderFunctions'

function get_pos_type(dimension: NoiseDimension) {
    return dimension === '2D' ? 'vec2f' : dimension === '3D' ? 'vec3f' : 'vec4f'
}

function compose_noise_function(dimension: NoiseDimension, transform: DomainTransform) {
    const pos_type = get_pos_type(dimension)

    let functions = octave_noise_shader(pos_type)
    let noise_expr = ''
    let pos_expr = 'noise_pos'

    if (transform === 'Rotate') {
        pos_expr = 'rotate(noise_pos)'

        if (dimension === '3D') {
            functions = `
                ${functions}
                ${rotate3D_shader}
            `
        } else if (dimension === '4D') {
            functions = `
                ${functions}
                ${rotate4D_shader}
            `
        }
    }
    if (transform === 'Warp') {
        if (dimension === '2D') {
            functions = `
                ${functions}
                ${warp2D_shader}
            `
        } else if (dimension === '3D') {
            functions = `
                ${functions}
                ${warp3D_shader}
            `
        }
        noise_expr = `warp_noise(${pos_expr})`
    } else if (transform === 'Warp 2X') {
        if (dimension === '2D') {
            functions = `
                ${functions}
                ${double_warp2D_shader}
            `
        } else if (dimension === '3D') {
            functions = `
                ${functions}
                ${double_warp3D_shader}
            `
        }
        noise_expr = `warp_noise(${pos_expr})`
    } else {
        noise_expr = `octave_noise(${pos_expr}, n_main_octaves)`
    }
    return {
        functions,
        noise_expr,
    }
}

export default function noiseSliceShader(
    dimension: NoiseDimension,
    transform: DomainTransform,
    color_format: GPUTextureFormat,
): string {
    const high_dim = dimension !== '2D' ? '' : '//'
    const only_4D = dimension === '4D' ? '' : '//'
    const only_warp = transform.startsWith('Warp') ? '' : '//'
    const pos_type = get_pos_type(dimension)

    let noise_pos_expr = 'noise_pos'

    if (dimension === '3D') {
        noise_pos_expr = 'vec3f(noise_pos, z_coordinate)'
    } else if (dimension === '4D') {
        noise_pos_expr = 'vec4f(noise_pos, z_coordinate, w_coordinate)'
    }

    const { functions, noise_expr } = compose_noise_function(dimension, transform)

    return /* wgsl */ `
        // Define the noise function here:
        // fn noise(pos: vec2f) -> f32 { ... } (2D noise)
        // fn noise(pos: vec3f) -> f32 { ... } (3D noise)
        // fn noise(pos: vec4f) -> f32 { ... } (4D noise)

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(2) var<uniform> n_grid_columns: f32;
        @group(1) @binding(3) var<uniform> n_main_octaves: u32;
        @group(1) @binding(4) var<uniform> persistence: f32;
        ${high_dim} @group(1) @binding(5) var<uniform> z_coordinate: f32;
        ${only_4D} @group(1) @binding(6) var<uniform> w_coordinate: f32;
        ${only_warp} @group(1) @binding(7) var<uniform> n_warp_octaves: u32;
        ${only_warp} @group(1) @binding(8) var<uniform> warp_strength: f32;
        @group(2) @binding(0) var<storage> color_points: array<vec4f>;

        fn find_noise_pos(texture_pos: vec2f, texture_dims: vec2f) -> ${pos_type} {
            let n_grid_rows = n_grid_columns * texture_dims.y / texture_dims.x;
            let grid_dims = vec2f(n_grid_columns, n_grid_rows);
            let noise_pos = grid_dims * texture_pos / texture_dims;

            return ${noise_pos_expr};
        }

        ${functions}

        ${interpolate_colors_shader}
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let texture_pos = gid.xy;
            let texture_dims = textureDimensions(texture);

            if (texture_pos.x >= texture_dims.x || texture_pos.y >= texture_dims.y) {
                return;
            }
            let noise_pos = find_noise_pos(vec2f(texture_pos), vec2f(texture_dims));
            let noise_value = ${noise_expr};
            let color = interpolate_colors(noise_value);

            textureStore(texture, texture_pos, color);
        }
    `
}
