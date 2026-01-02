import {
    createIntUniform,
    updateIntUniform,
    createFloatUniform,
    updateFloatUniform,
    createStorageBuffer,
    updateStorageBuffer,
    WG_DIM,
    randVec2f,
    randVec3f,
    randVec4f,
} from './ShaderUtils'
import type { RenderLogic } from './ComputeRenderer'

export interface ShaderBindIndexes {
    bindGroup: number
    bindingStart: number
}

export const defaultColorPoints = new Float32Array([1, 1, 1, 0, 0, 0, 0, 1])

export interface NoiseUniforms {
    n_grid_columns?: number
    n_octaves?: number
    persistence?: number
    z_coord?: number
    w_coord?: number
    warp_strength?: number
    color_points?: Float32Array<ArrayBuffer>
}

export function generateHashTable(n: number = 256) {
    const hash_table = new Int32Array(2 * n)

    for (let i = 0; i < n; i++) {
        hash_table[i] = i
    }
    for (let i = 0; i < n; i++) {
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

export function shaderRandomPoints4D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const offset = 4 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
        array[offset + 2] = Math.random()
        array[offset + 3] = Math.random()
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

export function shaderUnitVectors4D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const theta_1 = Math.PI * Math.random()
        const theta_2 = Math.PI * Math.random()
        const phi = 2 * Math.PI * Math.random()

        const sin_theta_1 = Math.sin(theta_1)
        const cos_theta_1 = Math.cos(theta_1)

        const sin_theta_2 = Math.sin(theta_2)
        const cos_theta_2 = Math.cos(theta_2)

        const sin_phi = Math.sin(phi)
        const cos_phi = Math.cos(phi)

        const x = cos_theta_1
        const y = sin_theta_1 * cos_theta_2
        const z = sin_theta_1 * sin_theta_2 * cos_phi
        const w = sin_theta_1 * sin_theta_2 * sin_phi

        const offset = 4 * i
        array[offset] = x
        array[offset + 1] = y
        array[offset + 2] = z
        array[offset + 3] = w
    }
    return array
}

export type DomainTransform = 'None' | 'Rotate' | 'Warp'
export type NoiseDimension = '2D' | '3D' | '4D'

export function noiseShader(
    dimension: NoiseDimension,
    transform: DomainTransform,
    color_format: GPUTextureFormat,
): string {
    const high_dim = dimension === '3D' || dimension == '4D' ? '' : '//'
    const only_4D = dimension === '4D' ? '' : '//'
    const only_warp = transform == 'Warp' ? '' : '//'
    const pos_type = dimension === '2D' ? 'vec2f' : dimension === '3D' ? 'vec3f' : 'vec4f'

    let noise_pos_expr = 'noise_pos'
    let rotate_function = ''

    let main_noise_function_name = 'octave_noise'
    let warp_function = ''

    if (dimension === '3D') {
        noise_pos_expr = 'vec3f(noise_pos, z_coordinate)'
    } else if (dimension === '4D') {
        noise_pos_expr = 'vec4f(noise_pos, z_coordinate, w_coordinate)'
    }

    if (dimension !== '2D' && transform === 'Rotate') {
        noise_pos_expr = `rotate(${noise_pos_expr})`

        // https://noiseposti.ng/posts/2022-01-16-The-Perlin-Problem-Moving-Past-Square-Noise.html
        if (dimension === '3D') {
            rotate_function = /* wgsl */ `
                fn rotate(pos: vec3f) -> vec3f {
                    let xz = pos.x + pos.z;
                    let s2 = xz * -0.211324865405187;
                    let yy = pos.y * 0.577350269189626;
                    let xr = pos.x + (s2 + yy);
                    let zr = pos.z + (s2 + yy);
                    let yr = xz * -0.577350269189626 + yy;
                    return vec3f(xr, yr, zr);
                }
            `
        } else if (dimension === '4D') {
            rotate_function = /* wgsl */ `
                fn rotate(pos: vec4f) -> vec4f {
                    let xyz = pos.x + pos.y + pos.z;
                    let s3 = xyz * (-1.0 / 6.0);
                    let ww = pos.w * 0.5;

                    let xr = pos.x + s3 + ww;
                    let yr = pos.y + s3 + ww;
                    let zr = pos.z + s3 + ww;
                    let wr = xyz * -0.5 + ww;

                    return vec4f(xr, yr, zr, wr);
                }
            `
        }
    } else if (dimension !== '4D' && transform === 'Warp') {
        main_noise_function_name = 'warp_noise'

        if (dimension === '2D') {
            warp_function = /* wgsl */ `
                fn warp_noise(noise_pos: vec2f) -> f32 {
                    let pos_q = vec2f(
                        octave_noise(noise_pos + ${randVec2f()}),
                        octave_noise(noise_pos + ${randVec2f()})
                    );
                    return octave_noise(noise_pos + warp_strength * pos_q);
                }
            `
        } else if (dimension === '3D') {
            warp_function = /* wgsl */ `
                fn warp_noise(noise_pos: vec3f) -> f32 {
                    let pos_q = vec3f(
                        octave_noise(noise_pos + ${randVec3f()}),
                        octave_noise(noise_pos + ${randVec3f()}),
                        octave_noise(noise_pos + ${randVec3f()})
                    );
                    return octave_noise(noise_pos + warp_strength * pos_q);
                }
            `
        }
    }

    return /* wgsl */ `
        // Define the noise function here:
        // fn noise(pos: vec2f) -> f32 { ... } (2D noise)
        // fn noise(pos: vec3f) -> f32 { ... } (3D noise)
        // fn noise(pos: vec4f) -> f32 { ... } (4D noise)

        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(2) var<uniform> n_grid_columns: f32;
        @group(1) @binding(3) var<uniform> n_octaves: u32;
        @group(1) @binding(4) var<uniform> persistence: f32;
        ${high_dim} @group(1) @binding(5) var<uniform> z_coordinate: f32;
        ${only_4D} @group(1) @binding(6) var<uniform> w_coordinate: f32;
        ${only_warp} @group(1) @binding(7) var<uniform> warp_strength: f32;
        @group(2) @binding(0) var<storage> color_points: array<vec4f>;

        ${rotate_function}

        fn find_noise_pos(texture_pos: vec2f, texture_dims: vec2f) -> ${pos_type} {
            let n_grid_rows = n_grid_columns * texture_dims.y / texture_dims.x;
            let grid_dims = vec2f(n_grid_columns, n_grid_rows);
            let noise_pos = grid_dims * texture_pos / texture_dims;

            return ${noise_pos_expr};
        }
        
        fn octave_noise(noise_pos: ${pos_type}) -> f32 {
            var amplitude: f32 = 1;
            var frequency: f32 = 1;
            var noise_value: f32 = 0;
            var max_noise_value: f32 = 0;

            for (var i = 0u; i < n_octaves; i++) {
                let scaled_pos = noise_pos * frequency;
                noise_value += amplitude * noise(scaled_pos);
                max_noise_value += amplitude;
                frequency *= 2;
                amplitude *= persistence;
            }
            return noise_value / max_noise_value;
        }

        ${warp_function}

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
            let noise_value = ${main_noise_function_name}(noise_pos);
            let color = interpolate_colors(noise_value);

            textureStore(texture, texture_pos, color);
        }
    `
}

export abstract class ProceduralNoise implements RenderLogic<NoiseUniforms> {
    dimension: NoiseDimension
    transform: DomainTransform
    noise_shader_code: string

    constructor(
        noise_shader_code: string,
        dimension: NoiseDimension = '2D',
        transform: DomainTransform = 'None',
    ) {
        this.dimension = dimension
        this.transform = transform
        this.noise_shader_code = noise_shader_code
    }

    abstract generateRandomElements(n: number): Float32Array<ArrayBuffer>

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${this.noise_shader_code}
            ${noiseShader(this.dimension, this.transform, color_format)}
        `
    }

    hash_table!: GPUBuffer
    random_elements!: GPUBuffer
    n_grid_columns!: GPUBuffer
    n_octaves!: GPUBuffer
    persistence!: GPUBuffer
    z_coord!: GPUBuffer
    w_coord!: GPUBuffer
    warp_strength!: GPUBuffer

    static_bind_group!: GPUBindGroup

    n_colors = 0
    color_points!: GPUBuffer
    color_bind_group!: GPUBindGroup

    createBuffers(data: NoiseUniforms, device: GPUDevice, pipeline: GPUComputePipeline): void {
        this.hash_table = createStorageBuffer(generateHashTable(256), device)
        this.random_elements = createStorageBuffer(this.generateRandomElements(256), device)
        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.n_octaves = createIntUniform(data.n_octaves || 1, device)
        this.persistence = createFloatUniform(data.persistence || 0.5, device)

        const bind_group_entries = [
            {
                binding: 0,
                resource: { buffer: this.hash_table },
            },
            {
                binding: 1,
                resource: { buffer: this.random_elements },
            },
            {
                binding: 2,
                resource: { buffer: this.n_grid_columns },
            },
            {
                binding: 3,
                resource: { buffer: this.n_octaves },
            },
            {
                binding: 4,
                resource: { buffer: this.persistence },
            },
        ]

        if (this.dimension !== '2D') {
            this.z_coord = createFloatUniform(data.z_coord || 0, device)
            bind_group_entries.push({
                binding: 5,
                resource: { buffer: this.z_coord },
            })
            if (this.dimension === '4D') {
                this.w_coord = createFloatUniform(data.w_coord || 0, device)
                bind_group_entries.push({
                    binding: 6,
                    resource: { buffer: this.w_coord },
                })
            }
        }
        if (this.transform === 'Warp') {
            this.warp_strength = createFloatUniform(data.warp_strength || 1, device)
            bind_group_entries.push({
                binding: 7,
                resource: { buffer: this.warp_strength },
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
        if (data.n_grid_columns) {
            updateFloatUniform(this.n_grid_columns, data.n_grid_columns, device)
        }
        if (data.n_octaves) {
            updateIntUniform(this.n_octaves, data.n_octaves, device)
        }
        if (data.persistence) {
            updateFloatUniform(this.persistence, data.persistence, device)
        }
        if (this.dimension !== '2D') {
            if (data.z_coord !== undefined) {
                updateFloatUniform(this.z_coord, data.z_coord, device)
            }
            if (this.dimension === '4D' && data.w_coord !== undefined) {
                updateFloatUniform(this.w_coord, data.w_coord, device)
            }
        }
        if (data.warp_strength) {
            updateFloatUniform(this.warp_strength, data.warp_strength, device)
        }
        if (data.color_points) {
            updateStorageBuffer(this.color_points, data.color_points, device)
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
