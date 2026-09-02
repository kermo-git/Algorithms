import {
    Buffer,
    ResolvedComputePipeline,
    ResolvedRenderPipeline
} from './Resolved'
import { CanvasTexture, Resource, StorageBuffer, Uniform } from './UserInput'

export function computeCode(pipeline: ResolvedComputePipeline) {
    let bind_declarations = ''
    let group_index = 0
    let bind_index = 0

    for (const resource of pipeline.staticResources) {
        bind_declarations +=
            declareWGSLResource(resource, group_index, bind_index) + '\n'
        bind_index += 1
    }

    if (bind_index > 0) {
        group_index += 1
        bind_index = 0
    }

    for (const resource of pipeline.pingPongResources) {
        bind_declarations +=
            declareWGSLResource(resource, group_index, bind_index) + '\n'
        bind_index += 2
    }

    if (bind_index > 0) {
        group_index += 1
    }

    if (pipeline.canvas) {
        bind_declarations +=
            canvasDeclaration(pipeline.canvas, group_index) + '\n'
    }
    return `${bind_declarations}\n${pipeline.code}`
}

export function renderCode(pipeline: ResolvedRenderPipeline) {
    let bind_declarations = ''
    let group_index = 0
    let bind_index = 0

    for (const resource of pipeline.resources) {
        bind_declarations +=
            declareWGSLResource(resource, group_index, bind_index) + '\n'
        bind_index += 2
    }

    return `${bind_declarations}\n${pipeline.code}`
}

export function createBuffer(device: GPUDevice, descriptor: Buffer) {
    const buffer = device.createBuffer({
        label: descriptor.name,
        size: descriptor.size,
        usage: descriptor.usage
    })
    if (descriptor.data) {
        device.queue.writeBuffer(buffer, 0, descriptor.data, 0, descriptor.size)
    }
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
    }
}

export function canvasLayout(
    canvas: CanvasTexture,
    device: GPUDevice
): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    format: canvas.colorFormat
                }
            }
        ]
    })
}

export function canvasDeclaration(canvas: CanvasTexture, group_index: number) {
    return `@group(${group_index}) @binding(0) var ${canvas.name}: texture_storage_2d<${canvas.colorFormat}, write>`
}
