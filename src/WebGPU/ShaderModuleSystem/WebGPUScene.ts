import { ShaderStage } from './DataTypes'
import { determineBindingVisibility } from './Linker'

export default class WebGPUScene {
    shaders: ShaderStage[] = []

    buffers = new Map<string, GPUBuffer>()
    bind_group_layouts = new Map<string, GPUBindGroupLayout>()
    bind_groups = new Map<string, GPUBindGroup>()
    pipeline_layouts = new Map<string, GPUPipelineLayout>()
    compute_pipelines = new Map<string, GPUComputePipeline>()
    render_pipelines = new Map<string, GPURenderPipeline>()

    constructor(device: GPUDevice, shaders: ShaderStage[]) {
        this.shaders = shaders
        const visibility = determineBindingVisibility(shaders)
    }

    writeInt(device: GPUDevice, name: string, data: number, offset = 0) {
        this.write(device, name, new Int32Array([data]).buffer, offset)
    }

    writeUint(device: GPUDevice, name: string, data: number, offset = 0) {
        this.write(device, name, new Uint32Array([data]).buffer, offset)
    }

    writeFloat(device: GPUDevice, name: string, data: number, offset = 0) {
        this.write(device, name, new Float32Array([data]).buffer, offset)
    }

    write(device: GPUDevice, name: string, data: ArrayBuffer, offset = 0) {
        const buffer = this.buffers.get(name)!
        device.queue.writeBuffer(buffer, offset, data, 0, data.byteLength)
    }

    destroy() {
        for (const resource of this.buffers) {
            resource[1].destroy()
        }
    }
}
