import { WG_DIM } from './ShaderUtils'

export async function compileShader(
    device: GPUDevice,
    shader_code: string,
): Promise<GPUShaderModule> {
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

export async function createComputePipeline(shader_code: string, device: GPUDevice) {
    const shader_module = await compileShader(device, shader_code)

    return device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: shader_module,
        },
    })
}

export interface Scene {
    init(data: unknown, info: InitInfo): Promise<void>
    getPipeline(): GPUComputePipeline
    render(encoder: GPUComputePassEncoder): void
    cleanup(): void
}

export interface InitInfo {
    device: GPUDevice
    color_format: GPUTextureFormat
}

export default class ComputeRenderer {
    device!: GPUDevice
    context!: GPUCanvasContext
    observer!: ResizeObserver

    async init(canvas: HTMLCanvasElement): Promise<InitInfo> {
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

        return {
            device: this.device,
            color_format: color_format,
        }
    }

    initObserver(canvas: HTMLCanvasElement, scene: Scene) {
        this.observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const width = entry.contentBoxSize[0].inlineSize
                const height = entry.contentBoxSize[0].blockSize
                const canvas = entry.target as HTMLCanvasElement

                const max_size = this.device.limits.maxTextureDimension2D
                canvas.width = Math.min(width, max_size)
                canvas.height = Math.min(height, max_size)

                this.render(scene)
            })
        })
        this.observer.observe(canvas)
    }

    render(scene: Scene) {
        const texture = this.context.getCurrentTexture()
        const cmd_encoder = this.device.createCommandEncoder()
        const pass_encoder = cmd_encoder.beginComputePass()

        const pipeline = scene.getPipeline()
        const canvas_bind_group = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: texture.createView(),
                },
            ],
        })
        pass_encoder.setPipeline(pipeline)
        pass_encoder.setBindGroup(0, canvas_bind_group)

        scene.render(pass_encoder)

        pass_encoder.dispatchWorkgroups(
            Math.ceil(texture.width / WG_DIM),
            Math.ceil(texture.height / WG_DIM),
        )
        pass_encoder.end()

        this.device.queue.submit([cmd_encoder.finish()])
    }

    cleanup() {
        this.context.unconfigure()
        this.observer.disconnect()
    }
}
