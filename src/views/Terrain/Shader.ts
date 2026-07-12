import { WG_DIM } from '@/WebGPU/Engine'
import type { Mat4x4 } from '@/WebGPU/Geometry'
import {
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
        @group(${group}) @binding(0) var<storage> unit_vectors_2D: array<vec2f>;
        @group(${group}) @binding(1) var<storage> unit_vectors_3D: array<vec3f>;

        ${unitVector2DShader}
        ${unitVector3DShader}
        ${rotate3DShader}
        ${allFunctions}

        ${createNoiseFunctions(Value2D, 'value_2d')}
        ${createNoiseFunctions(Value3D, 'value_3d')}

        ${createNoiseFunctions(Cubic2D, 'cubic_2d')}
        ${createNoiseFunctions(Cubic3D, 'cubic_3d')}

        ${createNoiseFunctions(new Perlin2D(), 'perlin_2d', 'unit_vectors_2D')}
        ${createNoiseFunctions(new Perlin3D(), 'perlin_3d', 'unit_vectors_3D')}

        ${createNoiseFunctions(new Perlin2D(true), 'quadratic_2d', 'unit_vectors_2D')}
        ${createNoiseFunctions(new Perlin3D(true), 'quadratic_3d', 'unit_vectors_3D')}

        ${createNoiseFunctions(Simplex2D, 'simplex_2d', 'unit_vectors_2D')}
        ${createNoiseFunctions(Simplex3D, 'simplex_3d', 'unit_vectors_3D')}

        ${createNoiseFunctions(Worley2D, 'worley_2d')}
        ${createNoiseFunctions(Worley3D, 'worley_3d')}

        ${createNoiseFunctions(Worley2nd2D, 'worley_2nd_2d')}
        ${createNoiseFunctions(Worley2nd3D, 'worley_2nd_3d')}
    `
}

export interface Setup {
    noise_shader: string
    color_shader: string
    terrain_dims: number[]
    grid_dims: number[]
    light_dir: number[]
    ambient_intensity: number
    camera_pos: number[]
    camera_rotation: Mat4x4
    render_3D: boolean
}

const terrainStruct = /* wgsl */ `
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

const terrainSampleStruct = /* wgsl */ `
    struct TerrainSample {
        altitude: f32,
        gradient: vec2f,
        hit: bool,
        color: vec4f,
    };
`

const lightStruct = /* wgsl */ `
    struct Light {
        dir: vec3f,
        ambient_intensity: f32,
    };
`

const cameraStruct = /* wgsl */ `
    struct Camera {
        pos: vec3f,
        rotation: mat3x3f,
    }
`

export function noiseShader(setup: Setup): string {
    return /* wgsl */ `
        ${noiseFunctionShader(0)}

        ${terrainStruct}

        @group(1) @binding(0) var<storage, read> read_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> write_terrain: array<TerrainUnit>;

        ${setup.noise_shader}

        const terrain_dims = vec2u(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        const grid_dims = vec2f(${setup.grid_dims[0]}, ${setup.grid_dims[1]});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= terrain_dims.x || pixel_pos.y >= terrain_dims.y) {
                return;
            }
            let noise_pos = grid_dims * vec2f(pixel_pos) / vec2f(terrain_dims);
            let pixel_index = pixel_pos.y * terrain_dims.x + pixel_pos.x;

            write_terrain[pixel_index].elevation = elevation(noise_pos);
        }
    `
}

export function colorShader(setup: Setup): string {
    return /* wgsl */ `
        ${noiseFunctionShader(0)}
        
        ${terrainStruct}

        @group(1) @binding(0) var<storage, read> read_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> write_terrain: array<TerrainUnit>;

        ${setup.color_shader}

        const terrain_dims = vec2u(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        const grid_dims = vec2f(${setup.grid_dims[0]}, ${setup.grid_dims[1]});

        fn find_index(pos: vec2u) -> u32 {
            return pos.y * terrain_dims.x + pos.x;
        }

        fn find_gradient(pixel_pos: vec2u) -> vec2f {
            let pixel_index = find_index(pixel_pos);
            let current = read_terrain[pixel_index].elevation;
            let pixel_size = grid_dims.x / f32(terrain_dims.x);

            var gradient = vec2f(0);
            var before = vec2f(current);
            var after = vec2f(current);
            var delta_input = vec2f(pixel_size);

            let not_max_edge = pixel_pos < (terrain_dims - 1);
            let not_min_edge = pixel_pos > vec2u(0);

            if not_min_edge.x {
                before.x = read_terrain[pixel_index - 1].elevation;
            }
            if not_max_edge.x {
                after.x = read_terrain[pixel_index + 1].elevation;
            }
            if not_min_edge.x && not_max_edge.x {
                delta_input.x = 2 * pixel_size;
            }

            if not_min_edge.y {
                before.y = read_terrain[
                    pixel_index - terrain_dims.x
                ].elevation;
            }
            if not_max_edge.y {
                after.y = read_terrain[
                    pixel_index + terrain_dims.x
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

            if (pixel_pos.x >= terrain_dims.x || pixel_pos.y >= terrain_dims.y) {
                return;
            }

            let noise_pos = grid_dims * vec2f(pixel_pos) / vec2f(terrain_dims);
            let pixel_index = find_index(pixel_pos);
            let elevation = read_terrain[pixel_index].elevation;
            let surface_pos = vec3f(noise_pos, elevation);
            let gradient = find_gradient(pixel_pos);
            let terrain_color = color(surface_pos, gradient);

            write_terrain[pixel_index].elevation = read_terrain[pixel_index].elevation;
            write_terrain[pixel_index].gradient = gradient;

            write_terrain[pixel_index].water = read_terrain[pixel_index].water;
            write_terrain[pixel_index].sediment = read_terrain[pixel_index].sediment;
            write_terrain[pixel_index].velocity = read_terrain[pixel_index].velocity;

            write_terrain[pixel_index].water_outflow_flux = read_terrain[pixel_index].water_outflow_flux;
            write_terrain[pixel_index].color = terrain_color;
        }
    `
}

export function display2DShader(setup: Setup, canvas_color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        ${terrainStruct}
        ${lightStruct}
        ${cameraStruct}

        @group(0) @binding(0) var canvas: texture_storage_2d<${canvas_color_format}, write>;

        @group(1) @binding(0) var<storage, read> read_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> write_terrain: array<TerrainUnit>;

        @group(2) @binding(0) var<uniform> light: Light;

        const terrain_dims = vec2u(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let pixel_pos = gid.xy;

            if (pixel_pos.x >= terrain_dims.x || pixel_pos.y >= terrain_dims.y) {
                return;
            }

            let pixel_index = pixel_pos.y * terrain_dims.x + pixel_pos.x;
            let pixel = read_terrain[pixel_index];

            let a = light.ambient_intensity;
            let normal = normalize(vec3f(-pixel.gradient.xy, 1));
            let light_level = dot(normal, light.dir);

            let color = a * pixel.color + (1 - a) * pixel.color * light_level;

            let canvas_pos = vec2u(pixel_pos.x, terrain_dims.y - 1 - pixel_pos.y);
            textureStore(canvas, canvas_pos, color);
        }
    `
}

export function display3DShader(setup: Setup, canvas_color_format: GPUTextureFormat): string {
    return /* wgsl */ `
        ${terrainStruct}
        ${terrainSampleStruct}
        ${lightStruct}
        ${cameraStruct}

        @group(0) @binding(0) var canvas: texture_storage_2d<${canvas_color_format}, write>;

        @group(1) @binding(0) var<storage, read> read_terrain: array<TerrainUnit>;
        @group(1) @binding(1) var<storage, read_write> write_terrain: array<TerrainUnit>;

        @group(2) @binding(0) var<uniform> light: Light;
        @group(2) @binding(1) var<uniform> camera: Camera;

        const STEP_SCALE = 0.1;
        const HIT_THRESHOLD = ${setup.grid_dims[0] / setup.terrain_dims[0]};

        const CAMERA_FOV = radians(70);
        const IMAGE_WIDTH = 2 * tan(CAMERA_FOV / 2);

        const terrain_dims = vec2i(${setup.terrain_dims[0]}, ${setup.terrain_dims[1]});
        const terrain_dims_f = vec2f(terrain_dims);
        const box_dims = vec3f(${setup.grid_dims[0]}, ${setup.grid_dims[1]}, 3);

        fn find_box_distance(ray_origin: vec3f, ray_direction: vec3f) -> f32 {
            let t1 = -ray_origin / ray_direction;
            let t2 = (box_dims - ray_origin) / ray_direction;

            let t_min = min(t1, t2);
            let t_max = max(t1, t2);

            if !(t_max.x < t_min.y || t_max.y < t_min.x) {
                if !(t_max.x < t_min.z || t_max.z < t_min.x || t_max.y < t_min.z || t_max.z < t_min.y) {
                    let outside_dist = max(t_min.z, max(t_min.x, t_min.y));

                    if (outside_dist >= 0) {
                        return outside_dist;
                    } else {
                        let inside_dist = min(t_max.z, min(t_max.x, t_max.y));

                        if (inside_dist >= 0) {
                            return inside_dist;
                        }
                    }
                }
            }
            return -1;
        }

        fn find_box_normal(surface_point: vec3f) -> vec3f {
            if (surface_point.x < 0 + HIT_THRESHOLD) {
                return vec3f(-1, 0, 0);
            }
            if (surface_point.x > box_dims.x - HIT_THRESHOLD) {
                return vec3f(1, 0, 0);
            }
            if (surface_point.y < 0 + HIT_THRESHOLD) {
                return vec3f(0, -1, 0);
            }
            if (surface_point.y > box_dims.y - HIT_THRESHOLD) {
                return vec3f(0, 1, 0);
            }
            if (surface_point.z < 0 + HIT_THRESHOLD) {
                return vec3f(0, 0, -1);
            }
            return vec3f(0, 0, 1);
        }
        
        fn sample_terrain(pos: vec3f) -> TerrainSample {
            const pixels_per_grid_cell = terrain_dims_f / box_dims.xy;

            let pixel_pos_float = pos.xy * pixels_per_grid_cell;
            let pixel_pos_floor = floor(pixel_pos_float);
            let pixel_pos = vec2i(pixel_pos_floor);

            let pixel_relative_pos = pixel_pos_float - pixel_pos_floor;
            let pixel_center_offset = pixel_relative_pos - vec2f(0.5);
            let mix_factor = abs(pixel_center_offset);

            let not_min_edge = select(
                vec2i(0), vec2i(1), pixel_pos > vec2i(0)
            );
            let not_max_edge = select(
                vec2i(0), vec2i(1), 
                pixel_pos < terrain_dims - vec2i(1)
            );
            let neighbor_pos = pixel_pos + select(
                /* false */ 
                vec2i(-1) * not_min_edge, 
                /* true */ 
                vec2i(1) * not_max_edge, 
                /* condition */ 
                pixel_center_offset >= vec2f(0)
            );

            let pixel = read_terrain[pixel_pos.y * terrain_dims.x + pixel_pos.x];
            let neighbor_x = read_terrain[pixel_pos.y * terrain_dims.x + neighbor_pos.x];
            let neighbor_y = read_terrain[neighbor_pos.y * terrain_dims.x + pixel_pos.x];
            let neighbor_xy = read_terrain[neighbor_pos.y * terrain_dims.x + neighbor_pos.x];

            let elevation = mix(
                mix(pixel.elevation, neighbor_x.elevation, mix_factor.x),
                mix(neighbor_y.elevation, neighbor_xy.elevation, mix_factor.x),
                mix_factor.y
            );
            let gradient = mix(
                mix(pixel.gradient, neighbor_x.gradient, mix_factor.x),
                mix(neighbor_y.gradient, neighbor_xy.gradient, mix_factor.x),
                mix_factor.y
            );
            let altitude = pos.z - elevation;

            if abs(altitude) <= HIT_THRESHOLD {
                let color = mix(
                    mix(pixel.color, neighbor_x.color, mix_factor.x),
                    mix(neighbor_y.color, neighbor_xy.color, mix_factor.x),
                    mix_factor.y
                );

                return TerrainSample(
                    altitude,
                    gradient,
                    true,
                    color
                );
            } else {
                return TerrainSample(
                    altitude,
                    gradient,
                    false,
                    vec4f(0)
                );
            }
        }
        
        @compute @workgroup_size(${WG_DIM}, ${WG_DIM})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let canvas_dims = textureDimensions(canvas);
            let pixel_pos = vec2u(gid.x, canvas_dims.y - 1 - gid.y);

            if (pixel_pos.x >= canvas_dims.x || pixel_pos.y < 0) {
                return;
            }

            let canvas_dims_f = vec2f(canvas_dims);

            let image_height = IMAGE_WIDTH * canvas_dims_f.y / canvas_dims_f.x;
            let image_dims = vec2f(IMAGE_WIDTH, image_height);

            let norm_pixel_pos = vec2f(pixel_pos) / canvas_dims_f;
            let image_pos = image_dims * (norm_pixel_pos - 0.5);
            let camera_ray = camera.rotation * normalize(vec3f(image_pos.x, 1, image_pos.y));

            var current_distance = find_box_distance(camera.pos, camera_ray) + HIT_THRESHOLD;
            
            if current_distance > 0 {
                var current_pos = camera.pos + current_distance * camera_ray;

                var terrain = sample_terrain(current_pos);
                let a = light.ambient_intensity;

                if terrain.altitude < 0 {
                    let normal = find_box_normal(current_pos);
                    let light_level = dot(normal, light.dir);
                    const box_color = vec4f(0.5, 0.5, 0.5, 1);
                    let color = a * box_color + (1 - a) * box_color * light_level;
                    textureStore(canvas, gid.xy, color);
                } else {
                    const MAX_STEPS = 1000;
                    for (var s = 0; s < MAX_STEPS; s++) {
                        current_distance += 0.1 * terrain.altitude;
                        current_pos = camera.pos + current_distance * camera_ray;
                        terrain = sample_terrain(current_pos);

                        if terrain.hit {
                            let normal = normalize(vec3f(-terrain.gradient.xy, 1));
                            let light_level = dot(normal, light.dir);
                            let color = a * terrain.color + (1 - a) * terrain.color * light_level;
                            textureStore(canvas, gid.xy, color);
                            break;
                        } else if (
                            any(current_pos <= vec3f(0)) || 
                            any(current_pos >= box_dims)
                        ) {
                            textureStore(canvas, gid.xy, vec4f(0, 0, 0, 1));
                            break;
                        }
                    }
                }
            } else {
                textureStore(canvas, gid.xy, vec4f(0, 0, 0, 1));
            }
        }
    `
}
