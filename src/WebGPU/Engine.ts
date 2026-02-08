export const WG_DIM = 8

export type FloatArray = Float32Array<ArrayBuffer>
export type IntArray = Int32Array<ArrayBuffer>
export type UIntArray = Uint32Array<ArrayBuffer>
type BufferData = IntArray | UIntArray | FloatArray

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
    color_format!: GPUTextureFormat

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
        this.color_format = has_bgra8unorm_storage
            ? navigator.gpu.getPreferredCanvasFormat()
            : 'rgba8unorm'

        context.configure({
            device: this.device,
            format: this.color_format,
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
        })
    }

    cleanup() {
        this.context?.unconfigure()
        this.observer?.disconnect()
    }

    initObserver(canvas: HTMLCanvasElement, render_callback: () => void) {
        this.observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const width = entry.contentBoxSize[0].inlineSize
                const height = entry.contentBoxSize[0].blockSize
                const canvas = entry.target as HTMLCanvasElement

                const max_size = this.device.limits.maxTextureDimension2D
                canvas.width = Math.min(width, max_size)
                canvas.height = Math.min(height, max_size)

                render_callback()
            })
        })
        this.observer.observe(canvas)
    }

    getTexture(): GPUTexture {
        return this.context.getCurrentTexture()
    }

    cmd_encoder!: GPUCommandEncoder

    beginPass(): GPUComputePassEncoder {
        this.cmd_encoder = this.device.createCommandEncoder()
        return this.cmd_encoder.beginComputePass()
    }

    endPass(encoder: GPUComputePassEncoder) {
        encoder.end()
        this.device.queue.submit([this.cmd_encoder.finish()])
    }

    encodeDraw(encoder: GPUComputePassEncoder, texture: GPUTexture) {
        encoder.dispatchWorkgroups(
            Math.ceil(texture.width / WG_DIM),
            Math.ceil(texture.height / WG_DIM),
        )
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
                const error_line = lines[message.lineNum - 1].trim()
                issues.push({
                    message: `${message.type}: ${message.message}`,
                    codeLine: error_line,
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

    createStorageBuffer(data: BufferData, size: number = 0): GPUBuffer {
        return this.createBuffer(data, size, GPUBufferUsage.STORAGE)
    }

    createBuffer(data: BufferData, size: number = 0, usage: GPUFlagsConstant): GPUBuffer {
        const buffer = this.device.createBuffer({
            size: size || data.byteLength,
            usage: usage | GPUBufferUsage.COPY_DST,
        })
        this.device.queue.writeBuffer(buffer, 0, data, 0, data.length)
        return buffer
    }

    updateBuffer(buffer: GPUBuffer, data: BufferData) {
        this.device.queue.writeBuffer(buffer, 0, data, 0, data.length)
    }
}
