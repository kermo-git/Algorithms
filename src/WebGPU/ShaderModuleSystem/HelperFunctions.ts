import {
    Resource,
    StorageBuffer,
    StorageBufferView,
    Uniform
} from './DataTypes'

export function readView(buffer: StorageBuffer): StorageBufferView {
    return {
        kind: 'StorageBufferView',
        accessMode: 'read',
        buffer: buffer
    }
}

export function writeView(buffer: StorageBuffer): StorageBufferView {
    return {
        kind: 'StorageBufferView',
        accessMode: 'read_write',
        buffer: buffer
    }
}

export function createStorageBuffer(
    descriptor: StorageBuffer,
    device: GPUDevice
): GPUBuffer {
    let usage = (descriptor.usage || 0) | GPUBufferUsage.STORAGE

    if (descriptor.data) {
        usage |= GPUBufferUsage.COPY_DST
    }
    const size = descriptor.byteLength || descriptor.data?.byteLength || 0

    const buffer = device.createBuffer({
        label: descriptor.name,
        size: size,
        usage: usage
    })

    if (descriptor.data) {
        device.queue.writeBuffer(buffer, 0, descriptor.data, 0, size)
    }

    return buffer
}

export function createUniform(descriptor: Uniform, device: GPUDevice) {
    const buffer = device.createBuffer({
        label: descriptor.name,
        size: descriptor.data.byteLength!,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    })

    device.queue.writeBuffer(
        buffer,
        0,
        descriptor.data,
        0,
        descriptor.data.byteLength
    )

    return buffer
}

export function createLayoutEntry(
    resource: Resource,
    bind_index: number,
    visibility: GPUFlagsConstant
): GPUBindGroupLayoutEntry[] {
    const common = {
        binding: bind_index,
        visibility: visibility
    }

    switch (resource.kind) {
        case 'Uniform':
            return [
                {
                    ...common,
                    buffer: {
                        type: 'uniform'
                    }
                }
            ]
        case 'StorageBufferView':
            switch (resource.accessMode) {
                case 'read':
                    return [
                        {
                            ...common,
                            buffer: {
                                type: 'read-only-storage'
                            }
                        }
                    ]
                case 'read_write':
                    return [
                        {
                            ...common,
                            buffer: {
                                type: 'storage'
                            }
                        }
                    ]
            }
        case 'PingPongBuffers':
            return [
                {
                    binding: bind_index,
                    visibility: visibility,
                    buffer: {
                        type: 'read-only-storage'
                    }
                },
                {
                    binding: bind_index + 1,
                    visibility: visibility,
                    buffer: {
                        type: 'storage'
                    }
                }
            ]
        case 'StorageTexture':
            return [
                {
                    ...common,
                    storageTexture: {
                        format: resource.colorFormat
                    }
                }
            ]
    }
}

export function declareWGSLResource(
    resource: Resource,
    group_index: number,
    binding_index: number
) {
    const binding_declaration = `@group(${group_index}) @binding(${binding_index})`

    switch (resource.kind) {
        case 'Uniform':
            return `${binding_declaration} var<uniform> ${resource.name}: ${resource.dataType}`

        case 'StorageBufferView':
            const buffer_name = resource.buffer.name
            const buffer_datatype = resource.buffer.dataType
            return `${binding_declaration} var<storage, ${resource.accessMode}> ${buffer_name}: ${buffer_datatype};`
        case 'PingPongBuffers':
            const data_type_A = resource.buffer_A.dataType
            return `${binding_declaration} var<storage, read> ${resource.readName}: ${data_type_A};
@group(${group_index}) @binding(${binding_index + 1} var<storage, read_write> ${resource.writeName}: ${data_type_A};`
        case 'StorageTexture':
            return `${binding_declaration} var ${resource.name}: texture_storage_2d<${resource.colorFormat}, write>`
    }
}
