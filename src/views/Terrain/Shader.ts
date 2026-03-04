import { WG_DIM } from '@/WebGPU/Engine'
import {
    findGridPosShader,
    rotate3DShader,
    octaveNoiseShader,
    unitVector2DShader,
    unitVector3DShader,
} from '@/Noise/ShaderUtils'
import type { NoiseAlgorithm } from '@/Noise/Types'
import { Value2D, Value3D } from '@/Noise/Algorithms/Value'
import { Perlin2D, Perlin3D } from '@/Noise/Algorithms/Perlin'
import { Simplex2D, Simplex3D } from '@/Noise/Algorithms/Simplex'
import { Cubic2D, Cubic3D } from '@/Noise/Algorithms/Cubic'
import { Worley2D, Worley3D } from '@/Noise/Algorithms/Worley'
import { Worley2nd2D, Worley2nd3D } from '@/Noise/Algorithms/Worley2nd'
import { allFunctions } from '@/Noise/Algorithms/Common'

function noiseFunctionShader(group: number) {
    function createNoiseFunctions(
        algorithm: NoiseAlgorithm,
        name: string,
        extraBufferName?: string,
    ) {
        return `
            ${algorithm.createShader({
                name,
                extraBufferName,
            })}

            ${octaveNoiseShader({
                func_name: `${name}_octaves`,
                noise_name: name,
                pos_type: algorithm.pos_type,
            })}
        `
    }

    return /* wgsl */ `
        @group(${group}) @binding(0) var<uniform> n_grid_columns: f32;
        @group(${group}) @binding(1) var<storage> unit_vectors_2D: array<vec2f>;
        @group(${group}) @binding(2) var<storage> unit_vectors_3D: array<vec3f>;

        ${unitVector2DShader}
        ${unitVector3DShader}
        ${rotate3DShader}
        ${allFunctions}

        ${createNoiseFunctions(Value2D, 'value_2d')}
        ${createNoiseFunctions(Value3D, 'value_3d')}

        ${createNoiseFunctions(Cubic2D, 'cubic_2d')}
        ${createNoiseFunctions(Cubic3D, 'cubic_3d')}

        ${createNoiseFunctions(Perlin2D, 'perlin_2d', 'unit_vectors_2D')}
        ${createNoiseFunctions(Perlin3D, 'perlin_3d', 'unit_vectors_3D')}

        ${createNoiseFunctions(Simplex2D, 'simplex_2d', 'unit_vectors_2D')}
        ${createNoiseFunctions(Simplex3D, 'simplex_3d', 'unit_vectors_3D')}

        ${createNoiseFunctions(Worley2D, 'worley_2d')}
        ${createNoiseFunctions(Worley3D, 'worley_3d')}

        ${createNoiseFunctions(Worley2nd2D, 'worley_2nd_2d')}
        ${createNoiseFunctions(Worley2nd3D, 'worley_2nd_3d')}

        ${findGridPosShader}
    `
}

export interface Setup {
    elevation_shader: string
    color_shader: string
    n_pixels_x: number
    n_pixels_y: number
    n_grid_cells_x: number
    n_grid_cells_y: number
}

export const terrainUnitShader = /* wgsl */ `
    struct TerrainUnit {
        elevation: f32,
        gradient: vec2f,

        water: f32,
        sediment: f32,
        velocity: vec2f,
        water_outflow_flux: vec4f,

        color: vec4f,
    };
`

export function elevationShader(setup: Setup): string {
    return /* wgsl */ `
        ${noiseFunctionShader(0)}

        ${terrainUnitShader}
        @group(1) @binding(0) var<storage, read> prev_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> next_terrain: array<TerrainUnit>;

        ${setup.elevation_shader}
        const pixel_dims = vec2u(${setup.n_pixels_x}, ${setup.n_pixels_y});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= pixel_dims.x || pixel_pos.y >= pixel_dims.y) {
                return;
            }
            let noise_pos = find_grid_pos(pixel_pos, pixel_dims, n_grid_columns);
            let pixel_index = pixel_pos.y * pixel_dims.x + pixel_pos.x;

            next_terrain[pixel_index].elevation = elevation(noise_pos);
        }
    `
}

export function colorShader(setup: Setup): string {
    return /* wgsl */ `
        ${noiseFunctionShader(0)}
        
        ${terrainUnitShader}

        @group(1) @binding(0) var<storage, read> prev_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> next_terrain: array<TerrainUnit>;

        ${setup.color_shader}

        const pixel_dims = vec2u(${setup.n_pixels_x}, ${setup.n_pixels_y});

        fn find_index(pos: vec2u) -> u32 {
            return pos.y * pixel_dims.x + pos.x;
        }

        fn find_gradient(pixel_pos: vec2u) -> vec2f {
            let pixel_index = find_index(pixel_pos);
            let current = prev_terrain[pixel_index].elevation;
            let pixel_size = f32(n_grid_columns) / f32(pixel_dims.x);

            var gradient = vec2f(0);
            var before = vec2f(current);
            var after = vec2f(current);
            var delta_input = vec2f(pixel_size);

            let not_max_edge = pixel_pos < (pixel_dims - 1);
            let not_min_edge = pixel_pos > vec2u(0);

            if not_min_edge.x {
                before.x = prev_terrain[pixel_index - 1].elevation;
            }
            if not_max_edge.x {
                after.x = prev_terrain[pixel_index + 1].elevation;
            }
            if not_min_edge.x && not_max_edge.x {
                delta_input.x = 2 * pixel_size;
            }

            if not_min_edge.y {
                before.y = prev_terrain[
                    pixel_index - pixel_dims.x
                ].elevation;
            }
            if not_max_edge.y {
                after.y = prev_terrain[
                    pixel_index + pixel_dims.x
                ].elevation;
            }
            if not_min_edge.y && not_max_edge.y {
                delta_input.y = 2 * pixel_size;
            }

            return (after - before) / delta_input;
        }
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= pixel_dims.x || pixel_pos.y >= pixel_dims.y) {
                return;
            }

            let noise_pos = find_grid_pos(pixel_pos, pixel_dims, n_grid_columns);
            let pixel_index = find_index(pixel_pos);
            let elevation = prev_terrain[pixel_index].elevation;
            let surface_pos = vec3f(noise_pos, elevation);
            let gradient = find_gradient(pixel_pos);
            let terrain_color = color(surface_pos, gradient);

            next_terrain[pixel_index].elevation = prev_terrain[pixel_index].elevation;
            next_terrain[pixel_index].gradient = gradient;

            next_terrain[pixel_index].water = prev_terrain[pixel_index].water;
            next_terrain[pixel_index].sediment = prev_terrain[pixel_index].sediment;
            next_terrain[pixel_index].velocity = prev_terrain[pixel_index].velocity;

            next_terrain[pixel_index].water_outflow_flux = prev_terrain[pixel_index].water_outflow_flux;
            next_terrain[pixel_index].color = terrain_color;
        }
    `
}

export function flatDisplayShader(setup: Setup, color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        ${terrainUnitShader}

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(0) var<storage, read> prev_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> next_terrain: array<TerrainUnit>;

        const pixel_dims = vec2u(${setup.n_pixels_x}, ${setup.n_pixels_y});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= pixel_dims.x || pixel_pos.y >= pixel_dims.y) {
                return;
            }

            let pixel_index = pixel_pos.y * pixel_dims.x + pixel_pos.x;
            let color = prev_terrain[pixel_index].color;
            textureStore(texture, pixel_pos, color);
        }
    `
}
