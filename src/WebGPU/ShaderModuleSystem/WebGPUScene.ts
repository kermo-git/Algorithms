import { ShaderPass } from './DataTypes'

interface ShaderData {
    pipeline_layout: GPUPipelineLayout
    static_group?: GPUBindGroup
    ping_pong_group_AB?: GPUBindGroup
    ping_pong_group_BA?: GPUBindGroup
}

interface ComputePipelineData extends ShaderData {
    pipeline: GPUComputePipeline
    canvas_pipeline?: GPUBindGroupLayout
}

interface RenderPipelineData extends ShaderData {
    pipeline: GPURenderPipeline
    indexBuffer: GPUBuffer
}

export default class WebGPUScene {
    device: GPUDevice
    canvas: HTMLCanvasElement
    shader_passes: ShaderPass[] = []

    buffers = new Map<string, GPUBuffer>()
    compute_pipelines = new Map<string, ComputePipelineData>()
    render_pipelines = new Map<string, RenderPipelineData>()

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
