import {
    PingPongBuffers,
    ReadOnlyResource,
    StorageBuffer,
    StorageBufferView,
    Uniform
} from './Modules'

export type StaticResource =
    | Uniform
    | StorageBufferView<'read'>
    | StorageBufferView<'read_write'>

export interface LinkedComputeShader {
    kind: 'LinkedComputeShader'
    name: string
    staticResources: StaticResource[]
    pingPongResources: PingPongBuffers[]
    canvas?: string
    code: string
}

export interface LinkedRenderShader {
    kind: 'LinkedRenderShader'
    name: string
    primitiveTopology: GPUPrimitiveTopology
    visibility: Map<string, GPUFlagsConstant>
    resources: ReadOnlyResource[]
    indexBuffer: StorageBuffer
    code: string
}

export interface LinkedBuffer {
    name: string
    usage: GPUFlagsConstant
    byteLength: number
    data?: ArrayBuffer
}

export interface LinkedScene {
    buffers: Map<string, LinkedBuffer>
    computeShaders: LinkedComputeShader[]
    renderShaders: LinkedRenderShader[]
}
