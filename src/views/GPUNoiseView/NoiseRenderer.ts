import ComputeRenderer from './ComputeRenderer'

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

export default class NoiseRenderer extends ComputeRenderer {
    n_grid_cells_x: number
    grid_size_buffer!: GPUBuffer
    shader_noise_function: string

    z_coord: number | null
    z_coord_buffer?: GPUBuffer

    constructor(
        shader_noise_function: string,
        n_grid_cells_x: number,
        z_coord: number | null = null,
        wg_x: number = 8,
        wg_y: number = 8,
    ) {
        super(wg_x, wg_y)
        this.shader_noise_function = shader_noise_function
        this.n_grid_cells_x = n_grid_cells_x
        this.z_coord = z_coord
    }

    override createShader(color_format: string): string {
        const only_2D = this.z_coord == null ? '' : '//'
        const only_3D = this.z_coord == null ? '//' : ''

        return /* wgsl */ `
            ${this.shader_noise_function}

            @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
            @group(1) @binding(0) var<uniform> n_grid_cells_x: f32;
            ${only_3D} @group(1) @binding(1) var<uniform> z_coordinate: f32;

            @compute @workgroup_size(${this.wg_x}, ${this.wg_y})
            fn main(
                @builtin(global_invocation_id) gid: vec3u
            ) {
                let dims = textureDimensions(texture);

                if (gid.x >= dims.x || gid.y >= dims.y) {
                    return;
                }
                let dims_f = vec2f(dims);
                let n_grid_cells = vec2f(n_grid_cells_x, n_grid_cells_x * dims_f.y / dims_f.x);
                ${only_2D} let noise_pos = n_grid_cells * vec2f(gid.xy) / dims_f;
                ${only_3D} let noise_pos = vec3f(n_grid_cells * vec2f(gid.xy) / dims_f, z_coordinate);
                let noise_value = (noise(noise_pos) + 1.0) * 0.5;

                textureStore(
                    texture, gid.xy, 
                    vec4f(noise_value, noise_value, noise_value, 1)
                );
            }
        `
    }

    override createBuffers(): GPUBindGroup {
        const buffers: GPUBindGroupEntry[] = []

        this.grid_size_buffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        let data = new Float32Array([this.n_grid_cells_x])
        this.device.queue.writeBuffer(this.grid_size_buffer, 0, data, 0, data.length)

        buffers.push({
            binding: 0,
            resource: { buffer: this.grid_size_buffer },
        })

        if (this.z_coord != null) {
            this.z_coord_buffer = this.device.createBuffer({
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            })
            data = new Float32Array([this.z_coord])
            this.device.queue.writeBuffer(this.z_coord_buffer, 0, data, 0, data.length)

            buffers.push({
                binding: 1,
                resource: { buffer: this.z_coord_buffer },
            })
        }

        return this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: buffers,
        })
    }

    setGridSize(n_grid_cells_x: number) {
        this.n_grid_cells_x = n_grid_cells_x

        const data = new Float32Array([this.n_grid_cells_x])
        this.device.queue.writeBuffer(this.grid_size_buffer, 0, data, 0, data.length)

        this.render()
    }

    setZCoordinate(z_coord: number) {
        this.z_coord = z_coord

        const data = new Float32Array([this.z_coord])
        this.device.queue.writeBuffer(this.z_coord_buffer!, 0, data, 0, data.length)

        this.render()
    }

    override cleanup() {
        super.cleanup()
        this.grid_size_buffer.destroy()
        this.z_coord_buffer?.destroy()
    }
}
