import { generateHashTable, ComputeRenderer } from './Utils'

export class Perlin2D extends ComputeRenderer {
    n_grid_cells_x: number
    grid_size_buffer: GPUBuffer | null = null

    constructor(n_grid_cells_x: number) {
        super()
        this.n_grid_cells_x = n_grid_cells_x
    }

    override createShader(color_format: string): string {
        const n_gradients = 16
        const gradient_mask = n_gradients - 1
        let gradient_array_shader = ''

        for (let i = 0; i < n_gradients; i++) {
            const phi = (2 * Math.PI * i) / n_gradients
            const x = Math.cos(phi)
            const y = Math.sin(phi)

            gradient_array_shader += `vec2f(${x}, ${y})`
            if (i < n_gradients - 1) {
                gradient_array_shader += ', '
            }
        }

        const hash_table = generateHashTable()

        return /* wgsl */ `
            const hash_table = array<u32, ${hash_table.length}>(${hash_table});
            const gradients = array(${gradient_array_shader});
            @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
            @group(0) @binding(1) var<uniform> n_grid_cells_x: f32;

            fn get_gradient(x: u32, y: u32) -> vec2f {
                let hash = hash_table[hash_table[x] + y];
                return gradients[hash & ${gradient_mask}];
            }

            fn fade(t: vec2f) -> vec2f {
                return t * t * t * (t * (t * 6 - 15) + 10);
            }

            fn lerp(t: f32, a: f32, b: f32) -> f32 {
                return a + t * (b - a);
            }

            fn noise(global_pos: vec2f) -> f32 {
                let floor_pos = floor(global_pos);
                let p0 = vec2u(floor_pos) & vec2u(255, 255);
                let p1 = (p0 + 1u) & vec2u(255, 255);
                
                let grad_00 = get_gradient(p0.x, p0.y);
                let grad_01 = get_gradient(p0.x, p1.y);
                let grad_10 = get_gradient(p1.x, p0.y);
                let grad_11 = get_gradient(p1.x, p1.y);
                
                let local = global_pos - floor_pos;

                let a = dot(grad_00, local);
                let b = dot(grad_01, vec2f(local.x, 1 - local.y));
                let c = dot(grad_10, vec2f(1 - local.x, local.y));
                let d = dot(grad_11, vec2f(1 - local.x, 1 - local.y));

                let s = fade(local);
                return lerp(s.y, lerp(s.x, a, b), lerp(s.x, c, d));
            }

            @compute @workgroup_size(1)
            fn main(
                @builtin(global_invocation_id) gid: vec3u
            ) {
                let pos = gid.xy;
                let dims = vec2f(textureDimensions(texture));
                let n_grid_cells = vec2f(n_grid_cells_x, n_grid_cells_x * dims.y / dims.x);
                let noise_pos = n_grid_cells * vec2f(pos) / dims;
                let noise_value = noise(noise_pos);

                textureStore(
                    texture, pos, 
                    vec4f(noise_value, noise_value, noise_value, 1)
                );
            }
        `
    }

    override initBuffers(): GPUBindGroup {
        this.grid_size_buffer = this.device.createBuffer({
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })
        const data = new Float32Array([this.n_grid_cells_x])

        this.device.queue.writeBuffer(this.grid_size_buffer, 0, data, 0, data.length)

        return this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.texture.createView(),
                },
                {
                    binding: 1,
                    resource: { buffer: this.grid_size_buffer },
                },
            ],
        })
    }
}
