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
import { CANVAS_GROUP, NOISE_GROUP, TERRAIN_GROUP } from './Layout'
import { noiseSeedUnitShader } from '@/Noise/SeedData'

function noiseFunctionShader(group: number) {
    function createNoiseFunctions(algorithm: NoiseAlgorithm, name: string) {
        return `
            ${algorithm.createShader({
                name: name,
                hash_table_size: 256,
                n_channels: 8,
            })}

            ${octaveNoiseShader({
                func_name: `${name}_octaves`,
                noise_name: name,
                pos_type: algorithm.pos_type,
            })}
        `
    }

    return /* wgsl */ `
        ${noiseSeedUnitShader}

        @group(${group}) @binding(0) var<uniform> n_grid_columns: f32;
        @group(${group}) @binding(1) var<storage> hash_table: array<i32>;
        @group(${group}) @binding(2) var<storage> noise_features: array<NoiseFeature>;

        ${unitVector2DShader}
        ${unitVector3DShader}
        ${rotate3DShader}

        ${createNoiseFunctions(Value2D, 'value_2d')}
        ${createNoiseFunctions(Value3D, 'value_3d')}

        ${createNoiseFunctions(Cubic2D, 'cubic_2d')}
        ${createNoiseFunctions(Cubic3D, 'cubic_3d')}

        ${createNoiseFunctions(Perlin2D, 'perlin_2d')}
        ${createNoiseFunctions(Perlin3D, 'perlin_3d')}

        ${createNoiseFunctions(Simplex2D, 'simplex_2d')}
        ${createNoiseFunctions(Simplex3D, 'simplex_3d')}

        ${createNoiseFunctions(Worley2D, 'worley_2d')}
        ${createNoiseFunctions(Worley3D, 'worley_3d')}

        ${createNoiseFunctions(Worley2nd2D, 'worley_2nd_2d')}
        ${createNoiseFunctions(Worley2nd3D, 'worley_2nd_3d')}

        ${findGridPosShader}
    `
}

export interface Setup {
    start_elevation_shader: string
    color_shader: string
    n_pixels_x: number
    n_pixels_y: number
    n_grid_cells_x: number
    n_grid_cells_y: number
}

export const terrainUnitShader = /* wgsl */ `
    struct TerrainUnit {
        elevation: f32,
        water: f32,
        sediment: f32,
        water_outflow_flux: vec4f,
        velocity: vec2f
    };
`

export function startElevationShader(setup: Setup): string {
    return /* wgsl */ `
        ${noiseFunctionShader(NOISE_GROUP)}

        ${terrainUnitShader}
        @group(${TERRAIN_GROUP}) @binding(0) var<storage, read> prev_terrain: array<TerrainUnit>;
        @group(${TERRAIN_GROUP}) @binding(1) var<storage, read_write> next_terrain: array<TerrainUnit>;

        ${setup.start_elevation_shader}
        const pixel_dims = vec2u(${setup.n_pixels_x}, ${setup.n_pixels_y});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= pixel_dims.x || pixel_pos.y >= pixel_dims.y) {
                return;
            }
            let grid_pos = find_grid_pos(pixel_pos, pixel_dims, n_grid_columns);
            let pixel_index = pixel_pos.y * pixel_dims.x + pixel_pos.x;

            next_terrain[pixel_index].elevation = start_elevation(grid_pos);
        }
    `
}

export function flatDisplayShader(setup: Setup, color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        ${noiseFunctionShader(NOISE_GROUP)}
        
        ${terrainUnitShader}

        @group(${TERRAIN_GROUP}) @binding(0) var<storage, read> prev_terrain: array<TerrainUnit>;
        @group(${TERRAIN_GROUP}) @binding(1) var<storage, read_write> next_terrain: array<TerrainUnit>;
        @group(${CANVAS_GROUP}) @binding(0) var texture: texture_storage_2d<${color_format}, write>;

        ${setup.color_shader}

        const pixel_dims = vec2u(${setup.n_pixels_x}, ${setup.n_pixels_y});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= pixel_dims.x || pixel_pos.y >= pixel_dims.y) {
                return;
            }
            let grid_pos = find_grid_pos(pixel_pos, pixel_dims, n_grid_columns);
            let pixel_index = pixel_pos.y * pixel_dims.x + pixel_pos.x;
            let elevation = prev_terrain[pixel_index].elevation;

            let color = terrain_color(vec3f(grid_pos, elevation));
            textureStore(texture, pixel_pos, color);
        }
    `
}
