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

export interface CanvasTexture {
    kind: 'CanvasTexture'
    name: string
    colorFormat: GPUTextureFormat
}

export type Resource =
    | Uniform
    | StorageBufferView
    | PingPongBuffers
    | CanvasTexture

export interface ShaderModule {
    name: string
    resources?: Resource[]
    imports?: ShaderModule[]
    code: string
}

export interface ShaderStage {
    name: string
    type: 'compute' | 'vertex' | 'fragment'
    resources?: Resource[]
    imports?: ShaderModule[]
    code: string
}
