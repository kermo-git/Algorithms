import { createComputePipeline, type InitInfo, type Scene } from '@/WebGPU/ComputeRenderer'
import type { Activation, NeuralUniforms } from './NeuralShader'
import neuralShader from './NeuralShader'
import { createIntUniform, createStorageBuffer, type FloatArray } from '@/WebGPU/ShaderDataUtils'

export class NeuralScene implements Scene {
    generation_1!: GPUBuffer
    generation_2!: GPUBuffer
    generation_bind_group!: GPUBindGroup

    kernel_size!: GPUBuffer
    kernel!: GPUBuffer
    color_1!: GPUBuffer
    color_2!: GPUBuffer

    pipeline!: GPUComputePipeline

    activation: Activation

    constructor(activation: Activation) {
        this.activation = activation
    }

    getPipeline(): GPUComputePipeline {
        return this.pipeline
    }

    async init(data: NeuralUniforms, info: InitInfo) {
        const { device, color_format } = info

        const shader_code = neuralShader(this.activation, color_format)
        this.pipeline = await createComputePipeline(shader_code, device)

        const random_data = generateRandomFloatBits(512 * 512 * 4)
        this.generation_1 = createStorageBuffer(random_data, device)
        this.generation_2 = createStorageBuffer(random_data, device)

        this.kernel_size = createIntUniform(data.kernel_size, device)
        this.kernel = createStorageBuffer(data.kernel, device, 11 * 11 * 4)
        this.color_1 = createStorageBuffer(data.color_1, device, 0, GPUBufferUsage.UNIFORM)
        this.color_2 = createStorageBuffer(data.color_2, device, 0, GPUBufferUsage.UNIFORM)
    }

    render(encoder: GPUComputePassEncoder): void {
        throw new Error('Method not implemented.')
    }

    cleanup(): void {
        throw new Error('Method not implemented.')
    }
}

function generateRandomFloatBits(n: number): FloatArray {
    return new Float32Array(n).map(() => Math.round(Math.random()))
}
