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

export default class ComputeRenderer {
    device!: GPUDevice
    pipeline!: GPUComputePipeline
    bind_group: GPUBindGroup | null = null
    context!: GPUCanvasContext
    observer!: ResizeObserver
    wg_x: number
    wg_y: number

    constructor(wg_x: number, wg_y: number) {
        this.wg_x = wg_x
        this.wg_y = wg_y
    }

    async init(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('webgpu')
        if (!context) {
            throw Error('HTML Canvas not found!')
        }
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

        const shader_code = this.createShader(color_format)
        const shader_module = await compileShader(this.device, shader_code)

        this.pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shader_module,
                entryPoint: 'main',
            },
        })

        this.bind_group = this.createBuffers()

        this.observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const width = entry.contentBoxSize[0].inlineSize
                const height = entry.contentBoxSize[0].blockSize
                const canvas = entry.target as HTMLCanvasElement

                const max_size = this.device.limits.maxTextureDimension2D
                canvas.width = Math.min(width, max_size)
                canvas.height = Math.min(height, max_size)

                this.render()
            })
        })
        this.observer.observe(canvas)
    }

    createShader(color_format: string): string {
        return /* wgsl */ `
            @group(0) @binding(0)
            var out_texture: texture_storage_2d<${color_format}, write>;

            @compute @workgroup_size(${this.wg_x}, ${this.wg_y})
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

    createBuffers(): GPUBindGroup | null {
        return null
    }

    bindBuffers(pass_encoder: GPUComputePassEncoder) {}

    frame_id = 0
    render() {
        const render_callback = () => {
            const texture = this.context.getCurrentTexture()

            const canvas_bind_group = this.device.createBindGroup({
                layout: this.pipeline.getBindGroupLayout(0),
                entries: [
                    {
                        binding: 0,
                        resource: texture.createView(),
                    },
                ],
            })
            const cmd_encoder = this.device.createCommandEncoder()
            const pass_encoder = cmd_encoder.beginComputePass()

            pass_encoder.setPipeline(this.pipeline)
            pass_encoder.setBindGroup(0, canvas_bind_group)
            pass_encoder.setBindGroup(1, this.bind_group)
            pass_encoder.dispatchWorkgroups(
                Math.ceil(texture.width / this.wg_x),
                Math.ceil(texture.height / this.wg_y),
            )
            pass_encoder.end()

            this.device.queue.submit([cmd_encoder.finish()])
        }
        this.frame_id = requestAnimationFrame(render_callback)
    }

    cleanup() {
        cancelAnimationFrame(this.frame_id)
        this.context.unconfigure()
        this.observer.disconnect()
    }
}
