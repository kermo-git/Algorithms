export interface ColorPoint {
    color: string
    point: number
}

async function compileShader(device: GPUDevice, shader_code: string): Promise<GPUShaderModule> {
    const trimmed_code = shader_code.trim()
    const module = device.createShaderModule({
        code: trimmed_code,
    })
    const info = await module.getCompilationInfo()

    if (info.messages.length > 0) {
        const lines = trimmed_code.split('\n')

        for (const message of info.messages) {
            const error_line = lines[message.lineNum - 1].trim()

            console.error(`${message.type} in shader code: ${message.message}\n\n${error_line}`)
        }
    }
    return module
}

export class ComputeRenderer {
    device!: GPUDevice
    pipeline!: GPUComputePipeline
    bindGroup!: GPUBindGroup
    context!: GPUCanvasContext
    texture!: GPUTexture

    async init(context: GPUCanvasContext) {
        this.context = context

        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) {
            throw Error('WebGPU not supported!')
        }
        const has_bgra8unorm_storage = adapter.features.has('bgra8unorm-storage')
        this.device = await adapter.requestDevice({
            requiredFeatures: has_bgra8unorm_storage ? ['bgra8unorm-storage'] : [],
        })
        const color_format = has_bgra8unorm_storage
            ? navigator.gpu.getPreferredCanvasFormat()
            : 'rgba8unorm'

        context.configure({
            device: this.device,
            format: color_format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
        })
        this.texture = context.getCurrentTexture()

        const shader_code = this.createShader(color_format).trim()
        const shader_module = await compileShader(this.device, shader_code)

        this.pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shader_module,
                entryPoint: 'main',
            },
        })

        this.bindGroup = this.initBuffers()
    }

    createShader(color_format: string): string {
        return /* wgsl */ `
            @group(0) @binding(0)
            var out_texture: texture_storage_2d<${color_format}, write>;

            @compute @workgroup_size(1)
            fn main(
                @builtin(global_invocation_id)
                id: vec3u
            ) {
                let pos = id.xy;
                let dims = textureDimensions(out_texture);
                let uv = vec2f(pos) / vec2f(dims);
                let color = vec4f(uv, 0, 1);
                textureStore(out_texture, pos, color);
            }
        `
    }

    initBuffers(): GPUBindGroup {
        return this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: this.texture.createView(),
                },
            ],
        })
    }

    render() {
        const cmd_encoder = this.device.createCommandEncoder()
        const pass_encoder = cmd_encoder.beginComputePass()

        pass_encoder.setPipeline(this.pipeline)
        pass_encoder.setBindGroup(0, this.bindGroup)
        pass_encoder.dispatchWorkgroups(this.texture.width, this.texture.height)
        pass_encoder.end()

        this.device.queue.submit([cmd_encoder.finish()])
    }

    cleanup() {
        this.texture.destroy()
        this.context.unconfigure()
    }
}

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
