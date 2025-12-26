import ComputeRenderer, { type RenderLogic } from './ComputeRenderer'

export function generateHashTable() {
    const size = 256
    const hash_table = new Array(2 * size)

    for (let i = 0; i < size; i++) {
        hash_table[i] = i
    }
    for (let i = 0; i < 256; i++) {
        const temp = hash_table[i]
        const swap_index = Math.floor(Math.random() * size)
        hash_table[i] = hash_table[swap_index]
        hash_table[swap_index] = temp
    }
    for (let i = 0; i < size; i++) {
        hash_table[size + i] = hash_table[i]
    }
    return hash_table
}

export interface NoiseState {
    n_grid_columns: number | null
    z_coord: number | null
}

export class Noise2DLogic implements RenderLogic<NoiseState> {
    n_grid_columns_buffer!: GPUBuffer
    shader_noise_function: string

    constructor(shader_noise_function: string) {
        this.shader_noise_function = shader_noise_function
    }

    createShader(wg_x: number, wg_y: number, color_format: string): string {
        return /* wgsl */ `
            ${this.shader_noise_function}

            @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
            @group(1) @binding(0) var<uniform> n_grid_columns: f32;

            @compute @workgroup_size(${wg_x}, ${wg_y})
            fn main(
                @builtin(global_invocation_id) gid: vec3u
            ) {
                let dims = textureDimensions(texture);

                if (gid.x >= dims.x || gid.y >= dims.y) {
                    return;
                }
                let dims_f = vec2f(dims);
                let n_grid_cells = vec2f(n_grid_columns, n_grid_columns * dims_f.y / dims_f.x);
                let noise_pos = n_grid_cells * vec2f(gid.xy) / dims_f;
                let noise_value = (noise(noise_pos) + 1.0) * 0.5;

                textureStore(
                    texture, gid.xy, 
                    vec4f(noise_value, noise_value, noise_value, 1)
                );
            }
        `
    }

    createBuffers(initial_state: NoiseState, device: GPUDevice): GPUBindGroupEntry[] {
        this.n_grid_columns_buffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        const data = new Float32Array([initial_state.n_grid_columns || 16])
        device.queue.writeBuffer(this.n_grid_columns_buffer, 0, data, 0, data.length)

        return [
            {
                binding: 0,
                resource: { buffer: this.n_grid_columns_buffer },
            },
        ]
    }

    update(state: NoiseState, device: GPUDevice) {
        if (state.n_grid_columns !== null) {
            const data = new Float32Array([state.n_grid_columns])
            device.queue.writeBuffer(this.n_grid_columns_buffer, 0, data, 0, data.length)
        }
    }

    cleanup() {
        this.n_grid_columns_buffer.destroy()
    }
}

export class Noise3DLogic implements RenderLogic<NoiseState> {
    n_grid_columns_buffer!: GPUBuffer
    z_coord_buffer!: GPUBuffer
    shader_noise_function: string

    constructor(shader_noise_function: string) {
        this.shader_noise_function = shader_noise_function
    }

    createShader(wg_x: number, wg_y: number, color_format: string): string {
        return /* wgsl */ `
            ${this.shader_noise_function}

            @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
            @group(1) @binding(0) var<uniform> n_grid_columns: f32;
            @group(1) @binding(1) var<uniform> z_coordinate: f32;

            @compute @workgroup_size(${wg_x}, ${wg_y})
            fn main(
                @builtin(global_invocation_id) gid: vec3u
            ) {
                let dims = textureDimensions(texture);

                if (gid.x >= dims.x || gid.y >= dims.y) {
                    return;
                }
                let dims_f = vec2f(dims);
                let n_grid_cells = vec2f(n_grid_columns, n_grid_columns * dims_f.y / dims_f.x);
                let noise_pos_2d = n_grid_cells * vec2f(gid.xy) / dims_f;
                let noise_pos_3d = vec3f(noise_pos_2d, z_coordinate);
                let noise_value = (noise(noise_pos_3d) + 1.0) * 0.5;

                textureStore(
                    texture, gid.xy, 
                    vec4f(noise_value, noise_value, noise_value, 1)
                );
            }
        `
    }

    createBuffers(initial_state: NoiseState, device: GPUDevice): GPUBindGroupEntry[] {
        this.n_grid_columns_buffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        let data = new Float32Array([initial_state.n_grid_columns || 16])
        device.queue.writeBuffer(this.n_grid_columns_buffer, 0, data, 0, data.length)

        this.z_coord_buffer = device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        data = new Float32Array([initial_state.z_coord || 0])
        device.queue.writeBuffer(this.z_coord_buffer, 0, data, 0, data.length)

        return [
            {
                binding: 0,
                resource: { buffer: this.n_grid_columns_buffer },
            },
            {
                binding: 1,
                resource: { buffer: this.z_coord_buffer },
            },
        ]
    }

    update(state: NoiseState, device: GPUDevice) {
        if (state.n_grid_columns != null) {
            const data = new Float32Array([state.n_grid_columns])
            device.queue.writeBuffer(this.n_grid_columns_buffer, 0, data, 0, data.length)
        }
        if (state.z_coord != null) {
            const data = new Float32Array([state.z_coord!])
            device.queue.writeBuffer(this.z_coord_buffer!, 0, data, 0, data.length)
        }
    }

    cleanup() {
        this.n_grid_columns_buffer?.destroy()
        this.z_coord_buffer?.destroy()
    }
}
