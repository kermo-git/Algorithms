import { parseHexColor } from '@/utils/Colors'
import {
    createFloatUniform,
    createStorageBuffer,
    updateArrayBuffer,
    updateFloatUniform,
    WG_DIM,
} from './ShaderUtils'
import type { RenderLogic } from './ComputeRenderer'

export interface ShaderBindIndexes {
    bindGroup: number
    bindingStart: number
}

export const defaultColorPoints = new Float32Array([1, 1, 1, 0, 0, 0, 0, 1])

export interface NoiseUniforms {
    n_grid_columns: number | null
    z_coord: number | null
    color_points: Float32Array<ArrayBuffer> | null
}

export function generateHashTable(n: number = 256) {
    const hash_table = new Int32Array(2 * n)

    for (let i = 0; i < n; i++) {
        hash_table[i] = i
    }
    for (let i = 0; i < 256; i++) {
        const temp = hash_table[i]
        const swap_index = Math.floor(Math.random() * n)
        hash_table[i] = hash_table[swap_index]
        hash_table[swap_index] = temp
    }
    for (let i = 0; i < n; i++) {
        hash_table[n + i] = hash_table[i]
    }
    return hash_table
}

export function shaderRandomPoints2D(n: number = 256) {
    const array = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const offset = 2 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
    }
    return array
}

export function shaderRandomPoints3D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const offset = 4 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
        array[offset + 2] = Math.random()
    }
    return array
}

export function shaderUnitVectors2D(n: number = 256) {
    const array = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const phi = (2 * Math.PI * i) / n
        const x = Math.cos(phi)
        const y = Math.sin(phi)

        const offset = 2 * i
        array[offset] = x
        array[offset + 1] = y
    }
    return array
}

export function shaderUnitVectors3D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const phi = 2 * Math.PI * Math.random()
        const theta = Math.PI * Math.random()

        const sin_phi = Math.sin(phi)
        const cos_phi = Math.cos(phi)
        const sin_theta = Math.sin(theta)
        const cos_theta = Math.cos(theta)

        const x = sin_theta * cos_phi
        const y = sin_theta * sin_phi
        const z = cos_theta

        const offset = 4 * i
        array[offset] = x
        array[offset + 1] = y
        array[offset + 2] = z
    }
    return array
}

export function noiseShader(is_3D: boolean, color_format: GPUTextureFormat): string {
    const only_2D = is_3D ? '//' : ''
    const only_3D = is_3D ? '' : '//'
    const vec_type = is_3D ? 'vec3f' : 'vec2f'

    return /* wgsl */ `
        // Define the noise function here:
        // fn noise(pos: vec2f) -> f32 { ... } (2D noise)
        // fn noise(pos: vec3f) -> f32 { ... } (3D noise)

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(0) var<uniform> n_grid_columns: f32;
        ${only_3D} @group(1) @binding(1) var<uniform> z_coordinate: f32;
        @group(2) @binding(0) var<storage> color_points: array<vec4f>;

        fn find_noise_pos(texture_pos: vec2f, texture_dims: vec2f) -> ${vec_type} {
            let n_grid_rows = n_grid_columns * texture_dims.y / texture_dims.x;
            let grid_dims = vec2f(n_grid_columns, n_grid_rows);

            ${only_2D} return grid_dims * texture_pos / texture_dims;

            ${only_3D} let noise_pos_2d = grid_dims * texture_pos / texture_dims;
            ${only_3D} return vec3f(noise_pos_2d, z_coordinate);
        }

        fn interpolate_colors(noise_value: f32) -> vec4f {
            let n_colors = arrayLength(&color_points);

            if noise_value <= color_points[0].w {
                return vec4f(color_points[0].xyz, 1);
            } else if noise_value > color_points[n_colors - 1].w {
                return vec4f(color_points[n_colors - 1].xyz, 1);
            } else {
                var prev_color = color_points[0].xyz;
                var prev_point = color_points[0].w;

                for (var i = 1u; i < n_colors; i++) {
                    var current_color = color_points[i].xyz;
                    var current_point = color_points[i].w;

                    if noise_value <= current_point {
                        let blend_factor = (noise_value - prev_point) / (current_point - prev_point);
                        let color = mix(prev_color, current_color, blend_factor);
                        return vec4f(color, 1);
                    }
                    prev_color = current_color;
                    prev_point = current_point;
                }
            }
            return vec4f(vec3f(noise_value), 1);
        }
        
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
            let noise_value = noise(noise_pos);

            textureStore(
                texture, texture_pos, 
                interpolate_colors(noise_value)
            );
        }
    `
}

export abstract class ProceduralNoise implements RenderLogic<NoiseUniforms> {
    /**
     * This buffer contains elements that give each noise pattern its randomness.
     * They could be either scalars or vectors depending on noise algorithm.
     */
    random_elements!: GPUBuffer
    abstract generateRandomElements(n: number): Float32Array<ArrayBuffer>
    abstract createShader(color_format: GPUTextureFormat): string
    abstract is_3D: boolean

    n_grid_columns!: GPUBuffer
    z_coord!: GPUBuffer
    hash_table!: GPUBuffer

    static_bind_group!: GPUBindGroup

    n_colors = 0
    color_points!: GPUBuffer
    color_bind_group!: GPUBindGroup

    createBuffers(data: NoiseUniforms, device: GPUDevice, pipeline: GPUComputePipeline): void {
        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.hash_table = createStorageBuffer(generateHashTable(256), device)
        this.random_elements = createStorageBuffer(this.generateRandomElements(256), device)

        const bind_group_entries = [
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
                resource: { buffer: this.random_elements },
            },
        ]

        if (this.is_3D) {
            this.z_coord = createFloatUniform(data.z_coord || 0, device)
            bind_group_entries.push({
                binding: 1,
                resource: { buffer: this.z_coord },
            })
        }

        this.static_bind_group = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: bind_group_entries,
        })

        const color_points_data = data.color_points || defaultColorPoints
        this.n_colors = color_points_data.length / 4
        this.color_points = createStorageBuffer(color_points_data, device, 256)

        this.color_bind_group = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(2),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.color_points,
                        size: color_points_data.byteLength,
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
        if (this.is_3D && data.z_coord !== null) {
            updateFloatUniform(this.z_coord, data.z_coord, device)
        }
        if (data.color_points !== null) {
            updateArrayBuffer(this.color_points, data.color_points, device)
            const new_n_colors = data.color_points.length / 4

            if (new_n_colors != this.n_colors) {
                this.n_colors = new_n_colors
                this.color_bind_group = device.createBindGroup({
                    layout: pipeline.getBindGroupLayout(2),
                    entries: [
                        {
                            binding: 0,
                            resource: {
                                buffer: this.color_points,
                                size: data.color_points.byteLength,
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
        this.random_elements?.destroy()
        this.color_points?.destroy()
    }
}
