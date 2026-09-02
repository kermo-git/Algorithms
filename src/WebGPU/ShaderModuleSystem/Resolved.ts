import {
    CanvasTexture,
    PingPongBuffers,
    ReadOnlyResource,
    StorageBuffer,
    StorageBufferView,
    Uniform
} from './UserInput'

export type StaticResource =
    | Uniform
    | StorageBufferView<'read'>
    | StorageBufferView<'read_write'>

export interface ResolvedComputePipeline {
    kind: 'ResolvedComputePipeline'
    name: string
    staticResources: StaticResource[]
    pingPongResources: PingPongBuffers[]
    canvas?: CanvasTexture
    code: string
}

export interface ResolvedRenderPipeline {
    kind: 'ResolvedRenderPipeline'
    name: string
    visibility: Map<string, GPUFlagsConstant>
    resources: ReadOnlyResource[]
    indexBuffer: StorageBuffer
    code: string
}

export interface Buffer {
    name: string
    usage: GPUFlagsConstant
    size: number
    data?: ArrayBuffer
}

export interface Resolved {
    buffers: Map<string, Buffer>
    computePipelines: ResolvedComputePipeline[]
    renderPipelines: ResolvedRenderPipeline[]
}
