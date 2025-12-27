import type { RenderLogic } from '../ComputeRenderer'
import {
    defaultColorPoints,
    noiseShader,
    shaderHashTable,
    shaderUnitVectors2D,
    shaderUnitVectors3D,
    type NoiseUniforms,
} from '../NoiseUtils'
import {
    createFloatUniform,
    createStorageBuffer,
    updateArrayBuffer,
    updateFloatUniform,
} from '../ShaderUtils'

export function perlin2DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(2) var<storage> hash_table: array<i32>;
        @group(1) @binding(3) var<storage> gradients: array<vec2f>;

        fn get_gradient(x: i32, y: i32) -> vec2f {
            let hash = hash_table[hash_table[x] + y];
            return gradients[hash];
        }

        fn fade(t: vec2f) -> vec2f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn lerp(t: f32, a: f32, b: f32) -> f32 {
            return a + t * (b - a);
        }

        fn noise(global_pos: vec2f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec2i(floor_pos) & vec2i(255, 255);
            let p1 = (p0 + 1i) & vec2i(255, 255);
            
            let grad_00 = get_gradient(p0.x, p0.y);
            let grad_10 = get_gradient(p1.x, p0.y);
            let grad_01 = get_gradient(p0.x, p1.y);
            let grad_11 = get_gradient(p1.x, p1.y);
            
            let local = global_pos - floor_pos;

            let a = dot(grad_00, local);
            let b = dot(grad_10, vec2f(local.x - 1, local.y));
            let c = dot(grad_01, vec2f(local.x, local.y - 1));
            let d = dot(grad_11, vec2f(local.x - 1, local.y - 1));

            let s = fade(local);
            let n = 1.55 * lerp(s.y, lerp(s.x, a, b), lerp(s.x, c, d));
            return clamp((n + 1)*0.5, 0, 1);
        }
    `
}

export class Perlin2DRenderer implements RenderLogic<NoiseUniforms> {
    n_grid_columns!: GPUBuffer
    hash_table!: GPUBuffer
    gradients!: GPUBuffer
    static_bind_group!: GPUBindGroup

    n_colors = 0
    color_points!: GPUBuffer
    color_bind_group!: GPUBindGroup

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${perlin2DShader()}
            ${noiseShader(false, color_format)}
        `
    }

    createBuffers(data: NoiseUniforms, device: GPUDevice, pipeline: GPUComputePipeline): void {
        const color_points_data = data.color_points || defaultColorPoints
        this.n_colors = color_points_data.length / 4

        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.hash_table = createStorageBuffer(shaderHashTable(256), device)
        this.gradients = createStorageBuffer(shaderUnitVectors2D(256), device)
        this.color_points = createStorageBuffer(color_points_data, device, 256)

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
                    resource: { buffer: this.gradients },
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
        this.hash_table?.destroy()
        this.gradients?.destroy()
        this.color_points?.destroy()
    }
}

export function perlin3DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(2) var<storage> hash_table: array<i32>;
        @group(1) @binding(3) var<storage> gradients: array<vec3f>;

        fn get_gradient(x: i32, y: i32, z: i32) -> vec3f {
            let hash = hash_table[hash_table[hash_table[x] + y] + z];
            return gradients[hash];
        }

        fn fade(t: vec3f) -> vec3f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn lerp(t: f32, a: f32, b: f32) -> f32 {
            return a + t * (b - a);
        }

        fn noise(global_pos: vec3f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec3i(floor_pos) & vec3i(255, 255, 255);
            let p1 = (p0 + 1i) & vec3i(255, 255, 255);
            
            let grad_000 = get_gradient(p0.x, p0.y, p0.z);
            let grad_100 = get_gradient(p1.x, p0.y, p0.z);
            let grad_010 = get_gradient(p0.x, p1.y, p0.z);
            let grad_110 = get_gradient(p1.x, p1.y, p0.z);
            let grad_001 = get_gradient(p0.x, p0.y, p1.z);
            let grad_101 = get_gradient(p1.x, p0.y, p1.z);
            let grad_011 = get_gradient(p0.x, p1.y, p1.z);
            let grad_111 = get_gradient(p1.x, p1.y, p1.z);
            
            let local = global_pos - floor_pos;

            let a = dot(grad_000, local);
            let b = dot(grad_100, vec3f(local.x - 1, local.yz));
            let c = dot(grad_010, vec3f(local.x, local.y - 1, local.z));
            let d = dot(grad_110, vec3f(local.x - 1, local.y - 1, local.z));
            let e = dot(grad_001, vec3f(local.xy, local.z - 1));
            let f = dot(grad_101, vec3f(local.x - 1, local.y, local.z - 1));
            let g = dot(grad_011, vec3f(local.x, local.y - 1, local.z - 1));
            let h = dot(grad_111, vec3f(local.x - 1, local.y - 1, local.z - 1));

            let s = fade(local);
            
            let n = 1.55 * lerp(s.z,
                lerp(s.y, lerp(s.x, a, b), lerp(s.x, c, d)),
                lerp(s.y, lerp(s.x, e, f), lerp(s.x, g, h)),
            );
            return clamp((n + 1)*0.5, 0, 1);
        }
    `
}

export class Perlin3DRenderer implements RenderLogic<NoiseUniforms> {
    n_grid_columns!: GPUBuffer
    z_coord!: GPUBuffer
    hash_table!: GPUBuffer
    gradients!: GPUBuffer
    static_bind_group!: GPUBindGroup

    n_colors = 0
    color_points!: GPUBuffer
    color_bind_group!: GPUBindGroup

    createShader(color_format: GPUTextureFormat): string {
        return `
            ${perlin3DShader()}
            ${noiseShader(true, color_format)}
        `
    }

    createBuffers(data: NoiseUniforms, device: GPUDevice, pipeline: GPUComputePipeline): void {
        const color_points_data = data.color_points || defaultColorPoints
        this.n_colors = color_points_data.length / 4

        this.n_grid_columns = createFloatUniform(data.n_grid_columns || 16, device)
        this.z_coord = createFloatUniform(data.z_coord || 0, device)
        this.hash_table = createStorageBuffer(shaderHashTable(256), device)
        this.gradients = createStorageBuffer(shaderUnitVectors3D(256), device)
        this.color_points = createStorageBuffer(color_points_data, device, 256)

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
                    resource: { buffer: this.gradients },
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
        if (data.z_coord !== null) {
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
        this.gradients?.destroy()
        this.color_points?.destroy()
    }
}
