import { WG_DIM } from '@/WebGPU/ComputeRenderer'
import { enchancedNoiseShader, shaderVecType, interpolate_colors_shader } from '@/Noise/ShaderUtils'
import type { DomainTransform, NoiseDimension } from '@/Noise/Types'

export default function noiseSliceShader(
    dimension: NoiseDimension,
    transform: DomainTransform,
    color_format: GPUTextureFormat,
): string {
    const high_dim = dimension !== '2D' ? '' : '//'
    const only_4D = dimension === '4D' ? '' : '//'
    const only_warp = transform.startsWith('Warp') ? '' : '//'
    const pos_type = shaderVecType(dimension)

    let noise_pos_expr = 'noise_pos'

    if (dimension === '3D') {
        noise_pos_expr = 'vec3f(noise_pos, z_coordinate)'
    } else if (dimension === '4D') {
        noise_pos_expr = 'vec4f(noise_pos, z_coordinate, w_coordinate)'
    }

    const { functions, noise_expr } = enchancedNoiseShader(dimension, transform)

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
