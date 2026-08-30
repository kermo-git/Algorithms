import { ShaderPass } from './DataTypes'

interface ComputePassData {
    pipeline_layout: GPUPipelineLayout
    pipeline: GPUComputePipeline
    static_group?: GPUBindGroup
    ping_pong_group_AB?: GPUBindGroup
    ping_pong_group_BA?: GPUBindGroup
    canvas_pipeline?: GPUBindGroupLayout
}

interface RenderPassData {
    pipeline_layout: GPUPipelineLayout
    pipeline: GPURenderPipeline
    indexBuffer: GPUBuffer
    bind_group: GPUBindGroup
}

export default class WebGPUScene {
    device: GPUDevice
    canvas: HTMLCanvasElement
    shader_passes: ShaderPass[] = []

    buffers = new Map<string, GPUBuffer>()
    compute_pipelines = new Map<string, ComputePassData>()
    render_pipelines = new Map<string, RenderPassData>()

    constructor(
        device: GPUDevice,
        canvas: HTMLCanvasElement,
        shader_passes: ShaderPass[]
    ) {
        this.device = device
        this.canvas = canvas
        this.shader_passes = shader_passes
    }

    writeInt(name: string, data: number, offset = 0) {
        this.write(name, new Int32Array([data]).buffer, offset)
    }

    writeUint(name: string, data: number, offset = 0) {
        this.write(name, new Uint32Array([data]).buffer, offset)
    }

    writeFloat(name: string, data: number, offset = 0) {
        this.write(name, new Float32Array([data]).buffer, offset)
    }

    write(name: string, data: ArrayBuffer, offset = 0) {
        const buffer = this.buffers.get(name)!
        this.device.queue.writeBuffer(buffer, offset, data, 0, data.byteLength)
    }

    destroy() {
        for (const resource of this.buffers) {
            resource[1].destroy()
        }
    }
}
