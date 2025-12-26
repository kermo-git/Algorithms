import type { RenderLogic } from '../ComputeRenderer'
import {
    noiseShader,
    shaderHashTable,
    shaderRandomPoints2D,
    shaderRandomPoints3D,
    type NoiseUniforms,
} from '../NoiseUtils'
import { createFloatUniform, createStorageBuffer, updateFloatUniform } from '../ShaderUtils'

export function worley2DShader(second_closest = false): string {
    const min_check_code = second_closest
        ? /* wgsl */ `
            if (dist_sqr < min_dist_sqr) {
                min_2nd_dist_sqr = min_dist_sqr;
                min_dist_sqr = dist_sqr;
            } else if (dist_sqr < min_2nd_dist_sqr) {
                min_2nd_dist_sqr = dist_sqr;
            }
        `
        : /* wgsl */ `min_dist_sqr = min(min_dist_sqr, dist_sqr);`

    const return_value = second_closest ? 'min_2nd_dist_sqr' : 'min_dist_sqr'
    const normalizing_factor = second_closest ? 1 / 1.4 : 1 / 1.2

    return /* wgsl */ `
        @group(1) @binding(2) var<storage> hash_table: array<i32>;
        @group(1) @binding(3) var<storage> points: array<vec2f>;

        fn noise(global_pos: vec2f) -> f32 {
            let grid_pos = vec2i(floor(global_pos));
            var min_dist_sqr = 10.0;
            ${second_closest ? 'var min_2nd_dist_sqr = 10.0;' : ''}

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    let neighbor = grid_pos + vec2i(offset_x, offset_y);

                    let hash = hash_table[
                        hash_table[neighbor.x & 255] + (neighbor.y & 255)
                    ];
                    let dist = vec2f(neighbor) + points[hash] - global_pos;
                    let dist_sqr = dist.x * dist.x + dist.y * dist.y;
                    
                    ${min_check_code}
                }
            }
            return clamp(sqrt(${return_value}) * ${normalizing_factor}, 0, 1);
        }
    `
}

export class Worley2DRenderer implements RenderLogic<NoiseUniforms> {
    second_closest: boolean
    n_grid_columns!: GPUBuffer
    hash_table!: GPUBuffer
    points!: GPUBuffer

    constructor(second_closest = false) {
        this.second_closest = second_closest
    }

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${worley2DShader(this.second_closest)}
            ${noiseShader(false, color_format)}
        `
    }

    createBuffers(data: NoiseUniforms, device: GPUDevice): GPUBindGroupEntry[] {
        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.hash_table = createStorageBuffer(shaderHashTable(256), device)
        this.points = createStorageBuffer(shaderRandomPoints2D(256), device)

        return [
            {
                binding: 0,
                resource: { buffer: this.n_grid_columns },
            },
            {
                binding: 2,
                resource: {
                    buffer: this.hash_table,
                },
            },
            {
                binding: 3,
                resource: {
                    buffer: this.points,
                },
            },
        ]
    }

    update(data: NoiseUniforms, device: GPUDevice): void {
        if (data.n_grid_columns !== null) {
            updateFloatUniform(this.n_grid_columns, data.n_grid_columns, device)
        }
    }

    cleanup() {
        this.n_grid_columns?.destroy()
        this.hash_table?.destroy()
        this.points?.destroy()
    }
}

export function worley3DShader(second_closest = false): string {
    const min_check_code = second_closest
        ? /* wgsl */ `
            if (dist_sqr < min_dist_sqr) {
                min_2nd_dist_sqr = min_dist_sqr;
                min_dist_sqr = dist_sqr;
            } else if (dist_sqr < min_2nd_dist_sqr) {
                min_2nd_dist_sqr = dist_sqr;
            }
        `
        : /* wgsl */ `min_dist_sqr = min(min_dist_sqr, dist_sqr);`

    const return_value = second_closest ? 'min_2nd_dist_sqr' : 'min_dist_sqr'
    const normalizing_factor = second_closest ? 1 / 1.26 : 1 / 1.2

    return /* wgsl */ `
        @group(1) @binding(2) var<storage> hash_table: array<i32>;
        @group(1) @binding(3) var<storage> points: array<vec3f>;

        fn noise(global_pos: vec3f) -> f32 {
            let grid_pos = vec3i(floor(global_pos));
            var min_dist_sqr = 10.0;
            ${second_closest ? 'var min_2nd_dist_sqr = 10.0;' : ''}

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    for (var offset_z = -1; offset_z < 2; offset_z++) {
                        let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);

                        let hash = hash_table[
                            hash_table[
                                hash_table[neighbor.x & 255] + (neighbor.y & 255)
                            ] + (neighbor.z & 255)
                        ];
                        let dist = vec3f(neighbor) + points[hash] - global_pos;
                        let dist_sqr = dist.x * dist.x + dist.y * dist.y + dist.z * dist.z;
                        
                        ${min_check_code}
                    }
                }
            }
            return clamp(sqrt(${return_value}) * ${normalizing_factor}, 0, 1);
        }
    `
}

export class Worley3DRenderer implements RenderLogic<NoiseUniforms> {
    second_closest: boolean
    n_grid_columns!: GPUBuffer
    z_coord!: GPUBuffer
    hash_table!: GPUBuffer
    points!: GPUBuffer

    constructor(second_closest = false) {
        this.second_closest = second_closest
    }

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${worley3DShader(this.second_closest)}
            ${noiseShader(true, color_format)}
        `
    }

    createBuffers(data: NoiseUniforms, device: GPUDevice): GPUBindGroupEntry[] {
        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.z_coord = createFloatUniform(data.z_coord || 0, device)
        this.hash_table = createStorageBuffer(shaderHashTable(256), device)
        this.points = createStorageBuffer(shaderRandomPoints3D(256), device)

        return [
            {
                binding: 0,
                resource: { buffer: this.n_grid_columns },
            },
            {
                binding: 1,
                resource: { buffer: this.z_coord },
            },
            {
                binding: 2,
                resource: { buffer: this.hash_table },
            },
            {
                binding: 3,
                resource: { buffer: this.points },
            },
        ]
    }

    update(data: NoiseUniforms, device: GPUDevice): void {
        if (data.n_grid_columns !== null) {
            updateFloatUniform(this.n_grid_columns, data.n_grid_columns, device)
        }
        if (data.z_coord !== null) {
            updateFloatUniform(this.z_coord, data.z_coord, device)
        }
    }

    cleanup() {
        this.n_grid_columns?.destroy()
        this.z_coord?.destroy()
        this.hash_table?.destroy()
        this.points?.destroy()
    }
}
