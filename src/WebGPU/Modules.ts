export type BufferKind = 'uniform' | 'storage_read' | 'storage_write' | 'index'

export interface Buffer<K extends BufferKind> {
    kind: K
    name: string
    dataType: string
    code?: string
    byteLength?: number
    data?: ArrayBuffer
}

export interface PingPongBuffer {
    kind: 'ping_pong'
    buffer_A_name: string
    buffer_B_name: string
    readName: string
    writeName: string
    dataType: string
    code?: string
    byteLength?: number
    data?: ArrayBuffer
}

export type ReadOnlyResource = Buffer<'uniform'> | Buffer<'storage_read'>

export type Resource =
    | ReadOnlyResource
    | Buffer<'storage_write'>
    | PingPongBuffer

export function getName(resource: Resource | Buffer<'index'>): string {
    switch (resource.kind) {
        case 'ping_pong':
            return `${resource.readName}_${resource.writeName}`
        default:
            return resource.name
    }
}

export interface ShaderModule {
    name: string
    resources?: Resource[]
    imports?: ShaderModule[]
    code: string
}

export interface ComputeShader extends ShaderModule {
    kind: 'ComputeShader'
    canvas?: string
}

export interface ReadOnlyShaderModule {
    name: string
    resources?: ReadOnlyResource[]
    imports?: ReadOnlyShaderModule[]
    code: string
}

export interface RenderShader {
    kind: 'RenderShader'
    name: string
    primitiveTopology: GPUPrimitiveTopology
    indexBuffer: Buffer<'index'>
    vertexShader: ReadOnlyShaderModule
    fragmentShader: ReadOnlyShaderModule
}

export type Shader = ComputeShader | RenderShader
