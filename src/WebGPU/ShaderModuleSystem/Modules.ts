export interface Uniform {
    kind: 'Uniform'
    name: string
    dataType: string
    dataTypeCode?: string
    data: ArrayBuffer
}

export interface StorageBuffer {
    kind: 'StorageBuffer'
    name: string
    dataType: string
    dataTypeCode?: string
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
    name: string
    resources?: ReadOnlyResource[]
    imports?: ReadOnlyShaderModule[]
    code: string
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

export interface RenderShader {
    kind: 'RenderShader'
    name: string
    primitiveTopology: GPUPrimitiveTopology
    indexBuffer: StorageBuffer
    vertexShader: ReadOnlyShaderModule
    fragmentShader: ReadOnlyShaderModule
}

export type Shader = ComputeShader | RenderShader

export function getName(resource: Resource): string {
    switch (resource.kind) {
        case 'Uniform':
            return resource.name
        case 'StorageBufferView':
            return resource.buffer.name
        case 'PingPongBuffers':
            return `${resource.readName}_${resource.writeName}`
    }
}

export function getDataType(resource: Resource) {
    switch (resource.kind) {
        case 'Uniform':
            return resource.dataType
        case 'StorageBufferView':
            return resource.buffer.dataType
        case 'PingPongBuffers':
            return resource.buffer_A.dataType
    }
}

export function getDataTypeCode(resource: Resource) {
    switch (resource.kind) {
        case 'Uniform':
            return resource.dataTypeCode
        case 'StorageBufferView':
            return resource.buffer.dataTypeCode
        case 'PingPongBuffers':
            return (
                resource.buffer_A.dataTypeCode || resource.buffer_B.dataTypeCode
            )
    }
}

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
