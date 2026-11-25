import { PingPongBuffer, ReadOnlyResource, Buffer } from './Modules'

export type StaticResource =
    | Buffer<'uniform'>
    | Buffer<'storage_read'>
    | Buffer<'storage_write'>

export interface LinkedComputeShader {
    kind: 'LinkedComputeShader'
    name: string
    staticResources: StaticResource[]
    pingPongBuffers: PingPongBuffer[]
    canvas?: string
    code: string
}

export interface LinkedRenderShader {
    kind: 'LinkedRenderShader'
    name: string
    primitiveTopology: GPUPrimitiveTopology
    resource_visibility: Map<string, GPUFlagsConstant>
    resources: ReadOnlyResource[]
    indexBuffer: Buffer<'index'>
    code: string
}

export interface LinkedBuffer {
    name: string
    usage: GPUFlagsConstant
    byteLength: number
    data?: ArrayBuffer
    code?: string
}

export interface LinkedScene {
    buffers: Map<string, LinkedBuffer>
    computeShaders: LinkedComputeShader[]
    renderShaders: LinkedRenderShader[]
}
