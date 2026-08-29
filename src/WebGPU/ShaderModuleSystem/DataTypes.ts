export interface Uniform {
    kind: 'Uniform'
    name: string
    dataType: string
    data: ArrayBuffer
}

export interface StorageBuffer {
    kind: 'StorageBuffer'
    name: string
    usage?: GPUFlagsConstant
    dataType: string
    byteLength?: number
    data?: ArrayBuffer
}

export interface StorageBufferView {
    kind: 'StorageBufferView'
    accessMode: 'read' | 'read_write'
    buffer: StorageBuffer
}

export interface PingPongBuffers {
    kind: 'PingPongBuffers'
    readName: string
    writeName: string
    buffer_A: StorageBuffer
    buffer_B: StorageBuffer
}

export interface StorageTexture {
    kind: 'StorageTexture'
    name: string
    colorFormat: GPUTextureFormat
}

export type Resource =
    | Uniform
    | StorageBufferView
    | PingPongBuffers
    | StorageTexture

export interface ShaderModule {
    name: string
    resources?: Resource[]
    imports?: ShaderModule[]
    code: string
}

export interface ComputeShader extends ShaderModule {
    kind: 'ComputeShader'
    canvas?: StorageTexture
}

export interface VertexShader extends ShaderModule {
    kind: 'VertexShader'
    indexBuffer: StorageBuffer
}

export interface FragmentShader extends ShaderModule {
    kind: 'FragmentShader'
}

export interface RenderPipeline {
    kind: 'RenderPipeline'
    name: string
    primitiveTopology: GPUPrimitiveTopology
    vertex: VertexShader
    fragment: FragmentShader
}

export type ShaderPass = ComputeShader | RenderPipeline
