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

export interface RenderLogic<UniformData> {
    createShader(wg_x: number, wg_y: number, color_format: string): string
    createBuffers(data: UniformData, device: GPUDevice): GPUBindGroupEntry[]
    update(data: UniformData, device: GPUDevice): void
    cleanup(): void
}

export default class ComputeRenderer<UniformData> {
    logic: RenderLogic<UniformData>
    buffer_bind_group!: GPUBindGroup

    device!: GPUDevice
    pipeline!: GPUComputePipeline
    context!: GPUCanvasContext
    observer!: ResizeObserver

    wg_x: number
    wg_y: number

    constructor(logic: RenderLogic<UniformData>, wg_x: number = 8, wg_y: number = 8) {
        this.logic = logic
        this.wg_x = wg_x
        this.wg_y = wg_y
    }

    async init(canvas: HTMLCanvasElement, data: UniformData) {
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

        const shader_code = this.logic.createShader(this.wg_x, this.wg_y, color_format)
        const shader_module = await compileShader(this.device, shader_code)

        this.pipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: shader_module,
            },
        })

        const buffers = this.logic.createBuffers(data, this.device)
        this.buffer_bind_group = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(1),
            entries: buffers,
        })

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

    update(data: UniformData) {
        this.logic.update(data, this.device)
        this.render()
    }

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
            pass_encoder.setBindGroup(1, this.buffer_bind_group)
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
        this.logic.cleanup()
    }
}
