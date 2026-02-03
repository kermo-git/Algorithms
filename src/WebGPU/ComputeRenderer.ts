export const WG_DIM = 8

export interface ShaderIssue {
    message: string
    codeLine: string
}

export interface ShaderCompilationResult {
    module: GPUShaderModule
    issues: ShaderIssue[]
}

export async function compileShader(
    device: GPUDevice,
    shader_code: string,
): Promise<ShaderCompilationResult> {
    const trimmed_code = shader_code.trim()

    const module = device.createShaderModule({
        code: trimmed_code,
    })
    const info = await module.getCompilationInfo()
    const issues: ShaderIssue[] = []

    if (info.messages.length > 0) {
        const lines = trimmed_code.split('\n')

        for (const message of info.messages) {
            const error_line = lines[message.lineNum - 1].trim()
            issues.push({
                message: `${message.type}: ${message.message}`,
                codeLine: error_line,
            })
        }
    }
    return { module, issues }
}

export interface Scene {
    init(data: unknown, info: InitInfo): Promise<ShaderIssue[]>
    getPipeline(): GPUComputePipeline
    render(encoder: GPUComputePassEncoder, device: GPUDevice): void
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

    render(scene: Scene, two_frames?: boolean) {
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

        scene.render(pass_encoder, this.device)

        pass_encoder.dispatchWorkgroups(
            Math.ceil(texture.width / WG_DIM),
            Math.ceil(texture.height / WG_DIM),
        )
        if (two_frames) {
            scene.render(pass_encoder, this.device)

            pass_encoder.dispatchWorkgroups(
                Math.ceil(texture.width / WG_DIM),
                Math.ceil(texture.height / WG_DIM),
            )
        }
        pass_encoder.end()

        this.device.queue.submit([cmd_encoder.finish()])
    }

    cleanup() {
        this.context?.unconfigure()
        this.observer?.disconnect()
    }
}
