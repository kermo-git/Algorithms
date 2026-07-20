export const WG_DIM = 8

export type FloatArray = Float32Array<ArrayBuffer>
export type IntArray = Int32Array<ArrayBuffer>
export type UIntArray = Uint32Array<ArrayBuffer>
type BufferData = IntArray | UIntArray | FloatArray | Uint8Array<ArrayBuffer>

export interface ShaderIssue {
    message: string
    codeLine: string
}

export interface ShaderCompilationResult {
    module: GPUShaderModule
    issues: ShaderIssue[]
}

export default class Engine {
    device!: GPUDevice
    context!: GPUCanvasContext
    observer!: ResizeObserver
    canvas_color_format!: GPUTextureFormat

    async init(canvas: HTMLCanvasElement) {
        const context = canvas.getContext('webgpu')
        if (!context) {
            throw Error('WebGPU not supported!')
        }
        this.context = context

        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) {
            throw Error('WebGPU adapter not found!')
        }
        const has_bgra8unorm_storage = adapter.features.has('bgra8unorm-storage')
        this.device = await adapter.requestDevice({
            requiredFeatures: has_bgra8unorm_storage ? ['bgra8unorm-storage'] : [],
        })
        this.canvas_color_format = has_bgra8unorm_storage
            ? navigator.gpu.getPreferredCanvasFormat()
            : 'rgba8unorm'

        context.configure({
            device: this.device,
            format: this.canvas_color_format,
            usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        })
    }

    cleanup() {
        this.context?.unconfigure()
        this.observer?.disconnect()
    }

    pending_resize = {
        width: 0,
        height: 0,
    }
    frame_id: number = 0

    initObserver(canvas: HTMLCanvasElement, render_callback: () => void) {
        this.observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const box_width = entry.contentBoxSize[0].inlineSize
                const box_height = entry.contentBoxSize[0].blockSize
                const max_size = this.device.limits.maxTextureDimension2D

                this.pending_resize = {
                    width: Math.min(box_width * devicePixelRatio, max_size),
                    height: Math.min(box_height * devicePixelRatio, max_size),
                }
                if (!this.frame_id) {
                    this.frame_id = requestAnimationFrame(() => {
                        this.frame_id = 0
                        canvas.width = this.pending_resize.width
                        canvas.height = this.pending_resize.height
                        render_callback()
                    })
                }
            })
        })
        this.observer.observe(canvas.parentElement!)
    }

    getTexture(): GPUTexture {
        return this.context.getCurrentTexture()
    }

    cmd_encoder!: GPUCommandEncoder

    beginComputePass(): GPUComputePassEncoder {
        this.cmd_encoder = this.device.createCommandEncoder()
        return this.cmd_encoder.beginComputePass()
    }

    endComputePass(encoder: GPUComputePassEncoder) {
        encoder.end()
        this.device.queue.submit([this.cmd_encoder.finish()])
    }

    encodeCompute(encoder: GPUComputePassEncoder, width: number, height: number) {
        encoder.dispatchWorkgroups(Math.ceil(width / WG_DIM), Math.ceil(height / WG_DIM))
    }

    async compileShader(shader_code: string): Promise<ShaderCompilationResult> {
        const trimmed_code = shader_code.trim()

        const module = this.device.createShaderModule({
            code: trimmed_code,
        })
        const info = await module.getCompilationInfo()
        const issues: ShaderIssue[] = []

        if (info.messages.length > 0) {
            const lines = trimmed_code.split('\n')

            for (const message of info.messages) {
                const issue_line = lines[message.lineNum - 1].trim()
                const issue_text = `${message.type}: ${message.message}`

                console.error(issue_text)
                console.error(issue_line)

                issues.push({
                    message: issue_text,
                    codeLine: issue_line,
                })
            }
        }

        return { module, issues }
    }

    createFloatUniform(value: number): GPUBuffer {
        return this.createUniformBuffer(new Float32Array([value]))
    }

    updateFloatUniform(buffer: GPUBuffer, value: number) {
        this.updateBuffer(buffer, new Float32Array([value]))
    }

    createIntUniform(value: number): GPUBuffer {
        return this.createUniformBuffer(new Uint32Array([value]))
    }

    updateIntUniform(buffer: GPUBuffer, value: number) {
        this.updateBuffer(buffer, new Uint32Array([value]))
    }

    createUniformBuffer(data: BufferData, size: number = 0): GPUBuffer {
        return this.createBuffer(data, size, GPUBufferUsage.UNIFORM)
    }

    createStorageBuffer(data: BufferData | null, size: number = 0): GPUBuffer {
        return this.createBuffer(data, size, GPUBufferUsage.STORAGE)
    }

    createBuffer(data: BufferData | null, size: number = 0, usage: GPUFlagsConstant): GPUBuffer {
        const buffer = this.device.createBuffer({
            size: size || data?.byteLength || 0,
            usage: usage | GPUBufferUsage.COPY_DST,
        })
        if (data) {
            this.device.queue.writeBuffer(buffer, 0, data, 0, data.length)
        }
        return buffer
    }

    updateBuffer(buffer: GPUBuffer, data: BufferData, offset = 0) {
        this.device.queue.writeBuffer(buffer, offset, data, 0, data.length)
    }

    createDepthStencilState(): GPUDepthStencilState {
        return {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8',
        }
    }

    createDepthTexture(width: number, height: number): GPUTexture {
        return this.device.createTexture({
            size: { width, height },
            dimension: '2d',
            format: 'depth24plus-stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
    }

    createDepthStencilAttachment(depth_texture: GPUTexture): GPURenderPassDepthStencilAttachment {
        return {
            view: depth_texture.createView(),
            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
            stencilClearValue: 0,
            stencilLoadOp: 'load',
            stencilStoreOp: 'store',
        }
    }
}
