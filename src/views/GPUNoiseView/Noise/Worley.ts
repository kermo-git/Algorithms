import type { RenderLogic } from '../ComputeRenderer'
import {
    colorPointBytes,
    defaultColorPoints,
    noiseShader,
    shaderHashTable,
    shaderRandomPoints2D,
    shaderRandomPoints3D,
    toShaderArray,
    type NoiseUniforms,
} from '../NoiseUtils'
import {
    createFloatUniform,
    createStorageBuffer,
    updateArrayBuffer,
    updateFloatUniform,
} from '../ShaderUtils'

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
    static_bind_group!: GPUBindGroup

    n_colors = 0
    color_points!: GPUBuffer
    color_bind_group!: GPUBindGroup

    constructor(second_closest = false) {
        this.second_closest = second_closest
    }

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${worley2DShader(this.second_closest)}
            ${noiseShader(false, color_format)}
        `
    }

    createBuffers(data: NoiseUniforms, device: GPUDevice, pipeline: GPUComputePipeline): void {
        const color_points = data.color_points || defaultColorPoints
        const color_points_bytes = toShaderArray(color_points)
        this.n_colors = color_points.length

        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.hash_table = createStorageBuffer(shaderHashTable(256), device)
        this.points = createStorageBuffer(shaderRandomPoints2D(256), device)
        this.color_points = createStorageBuffer(color_points_bytes, device, colorPointBytes(10))

        this.static_bind_group = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.n_grid_columns },
                },
                {
                    binding: 2,
                    resource: { buffer: this.hash_table },
                },
                {
                    binding: 3,
                    resource: { buffer: this.points },
                },
            ],
        })

        this.color_bind_group = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.color_points,
                        size: color_points_bytes.byteLength,
                    },
                },
            ],
        })
    }

    bindBuffers(encoder: GPUComputePassEncoder): void {
        encoder.setBindGroup(1, this.static_bind_group)
        encoder.setBindGroup(2, this.color_bind_group)
    }

    update(data: NoiseUniforms, device: GPUDevice, pipeline: GPUComputePipeline): void {
        if (data.n_grid_columns !== null) {
            updateFloatUniform(this.n_grid_columns, data.n_grid_columns, device)
        }
        if (data.color_points !== null) {
            const bytes = toShaderArray(data.color_points)
            updateArrayBuffer(this.color_points, bytes, device)

            if (data.color_points.length != this.n_colors) {
                this.n_colors = data.color_points.length
                this.color_bind_group = device.createBindGroup({
                    layout: pipeline.getBindGroupLayout(2),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                buffer: this.color_points,
                                size: bytes.byteLength,
                            },
                        },
                    ],
                })
            }
        }
    }

    cleanup() {
        this.n_grid_columns?.destroy()
        this.hash_table?.destroy()
        this.points?.destroy()
        this.color_points?.destroy()
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
    static_bind_group!: GPUBindGroup

    n_colors = 0
    color_points!: GPUBuffer
    color_bind_group!: GPUBindGroup

    constructor(second_closest = false) {
        this.second_closest = second_closest
    }

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${worley3DShader(this.second_closest)}
            ${noiseShader(true, color_format)}
        `
    }

    createBuffers(data: NoiseUniforms, device: GPUDevice, pipeline: GPUComputePipeline): void {
        const color_points = data.color_points || defaultColorPoints
        const color_points_bytes = toShaderArray(color_points)
        this.n_colors = color_points.length

        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.z_coord = createFloatUniform(data.z_coord || 0, device)
        this.hash_table = createStorageBuffer(shaderHashTable(256), device)
        this.points = createStorageBuffer(shaderRandomPoints3D(256), device)
        this.color_points = createStorageBuffer(color_points_bytes, device, colorPointBytes(10))

        this.static_bind_group = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
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
            ],
        })

        this.color_bind_group = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.color_points,
                        size: color_points_bytes.byteLength,
                    },
                },
            ],
        })
    }

    bindBuffers(encoder: GPUComputePassEncoder): void {
        encoder.setBindGroup(1, this.static_bind_group)
        encoder.setBindGroup(2, this.color_bind_group)
    }

    update(data: NoiseUniforms, device: GPUDevice, pipeline: GPUComputePipeline): void {
        if (data.n_grid_columns !== null) {
            updateFloatUniform(this.n_grid_columns, data.n_grid_columns, device)
        }
        if (data.z_coord !== null) {
            updateFloatUniform(this.z_coord, data.z_coord, device)
        }
        if (data.color_points !== null) {
            const bytes = toShaderArray(data.color_points)
            updateArrayBuffer(this.color_points, bytes, device)

            if (data.color_points.length != this.n_colors) {
                this.n_colors = data.color_points.length
                this.color_bind_group = device.createBindGroup({
                    layout: pipeline.getBindGroupLayout(2),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                buffer: this.color_points,
                                size: bytes.byteLength,
                            },
                        },
                    ],
                })
            }
        }
    }

    cleanup() {
        this.n_grid_columns?.destroy()
        this.z_coord?.destroy()
        this.hash_table?.destroy()
        this.points?.destroy()
        this.color_points?.destroy()
    }
}
