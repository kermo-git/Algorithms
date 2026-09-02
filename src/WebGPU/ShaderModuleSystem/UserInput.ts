export interface Uniform {
    kind: 'Uniform'
    name: string
    dataType: string
    data: ArrayBuffer
}

export interface StorageBuffer {
    kind: 'StorageBuffer'
    name: string
    dataType: string
    byteLength?: number
    data?: ArrayBuffer
}

export interface StorageBufferView<Access extends 'read' | 'read_write'> {
    kind: 'StorageBufferView'
    accessMode: Access
    buffer: StorageBuffer
}

export interface PingPongBuffers {
    kind: 'PingPongBuffers'
    readName: string
    writeName: string
    buffer_A: StorageBuffer
    buffer_B: StorageBuffer
}

export type ReadOnlyResource = Uniform | StorageBufferView<'read'>
export type Resource =
    | ReadOnlyResource
    | StorageBufferView<'read_write'>
    | PingPongBuffers

export interface ReadOnlyShaderModule {
    kind: 'ReadOnlyShaderModule'
    name: string
    resources?: ReadOnlyResource[]
    imports?: ReadOnlyShaderModule[]
    code: string
}

export interface CanvasTexture {
    kind: 'CanvasTexture'
    name: string
    colorFormat: GPUTextureFormat
}

export interface ComputeShaderModule {
    kind: 'ComputeShaderModule'
    name: string
    resources?: Resource[]
    imports?: ShaderModule[]
    canvas?: CanvasTexture
    code: string
}

export type ShaderModule = ReadOnlyShaderModule | ComputeShaderModule

export interface RenderPipeline {
    kind: 'RenderPipeline'
    name: string
    primitiveTopology: GPUPrimitiveTopology
    indexBuffer: StorageBuffer
    vertexShader: ReadOnlyShaderModule
    fragmentShader: ReadOnlyShaderModule
}

export type Shader = ComputeShaderModule | RenderPipeline

export function readView(buffer: StorageBuffer): StorageBufferView<'read'> {
    return {
        kind: 'StorageBufferView',
        accessMode: 'read',
        buffer: buffer
    }
}

export function writeView(
    buffer: StorageBuffer
): StorageBufferView<'read_write'> {
    return {
        kind: 'StorageBufferView',
        accessMode: 'read_write',
        buffer: buffer
    }
}
