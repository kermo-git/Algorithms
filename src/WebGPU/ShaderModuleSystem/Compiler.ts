import {
    LinkedBuffer,
    LinkedComputeShader,
    LinkedRenderShader,
    StaticResource
} from './LinkedModules'
import { Resource } from './Modules'

export function createComputeShaderCode(
    shader: LinkedComputeShader,
    canvas_color_format: GPUTextureFormat
) {
    let declared_data_types = new Set<string>()
    let data_type_declarations = ''

    let bind_declarations = ''
    let group_index = 0
    let bind_index = 0

    for (const resource of shader.staticResources) {
        const data_type = getDataType(resource)
        const data_type_code = getDataTypeCode(resource)

        if (data_type_code && !declared_data_types.has(data_type)) {
            declared_data_types.add(data_type)
            data_type_declarations += `\n${data_type_code}`
        }
        bind_declarations +=
            createResourceDeclaration(resource, group_index, bind_index) + '\n'
        bind_index += 1
    }

    if (bind_index > 0) {
        group_index += 1
        bind_index = 0
    }

    for (const resource of shader.pingPongResources) {
        const data_type = getDataType(resource)
        const data_type_code = getDataTypeCode(resource)

        if (data_type_code && !declared_data_types.has(data_type)) {
            declared_data_types.add(data_type)
            data_type_declarations += `\n${data_type_code}`
        }
        bind_declarations +=
            createResourceDeclaration(resource, group_index, bind_index) + '\n'
        bind_index += 2
    }

    if (bind_index > 0) {
        group_index += 1
    }

    if (shader.canvas) {
        bind_declarations +=
            createCanvasDeclaration(
                group_index,
                shader.canvas,
                canvas_color_format
            ) + '\n'
    }
    return `${data_type_declarations}\n${bind_declarations}\n${shader.code}`
}

export function createRenderShaderCode(shader: LinkedRenderShader) {
    let declared_data_types = new Set<string>()
    let data_type_declarations = ''

    let bind_declarations = ''
    let group_index = 0
    let bind_index = 0

    for (const resource of shader.resources) {
        const data_type = getDataType(resource)
        const data_type_code = getDataTypeCode(resource)

        if (data_type_code && !declared_data_types.has(data_type)) {
            declared_data_types.add(data_type)
            data_type_declarations += `\n${data_type_code}`
        }
        bind_declarations +=
            createResourceDeclaration(resource, group_index, bind_index) + '\n'
        bind_index += 2
    }

    return `${data_type_declarations}\n${bind_declarations}\n${shader.code}`
}

function getDataType(resource: Resource) {
    switch (resource.kind) {
        case 'Uniform':
            return resource.dataType
        case 'StorageBufferView':
            return resource.buffer.dataType
        case 'PingPongBuffers':
            return resource.buffer_A.dataType
    }
}

function getDataTypeCode(resource: Resource) {
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

function createResourceDeclaration(
    resource: Resource,
    group_index: number,
    binding_index: number
) {
    const data_type = getDataType(resource)
    const binding_declaration = `@group(${group_index}) @binding(${binding_index})`

    switch (resource.kind) {
        case 'Uniform':
            return `${binding_declaration} var<uniform> ${resource.name}: ${data_type};`

        case 'StorageBufferView':
            const buffer_name = resource.buffer.name
            return `${binding_declaration} var<storage, ${resource.accessMode}> ${buffer_name}: ${data_type};`
        case 'PingPongBuffers':
            return `${binding_declaration} var<storage, read> ${resource.readName}: ${data_type};
@group(${group_index}) @binding(${binding_index + 1}) var<storage, read_write> ${resource.writeName}: ${data_type};`
    }
}

export function createCanvasDeclaration(
    group_index: number,
    name: string,
    color_format: GPUTextureFormat
) {
    return `@group(${group_index}) @binding(0) var ${name}: texture_storage_2d<${color_format}, write>;`
}

export async function requestDevice(features: GPUFeatureName[] = []) {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
        throw Error('WebGPU adapter not found!')
    }
    const supportedFeatures = features.filter((f) => adapter.features.has(f))
    const device = await adapter.requestDevice({
        requiredFeatures: supportedFeatures
    })
    return { device, supportedFeatures }
}

export interface ShaderIssue {
    message: string
    codeLine: string
}

export interface ShaderCompilationResult {
    module: GPUShaderModule
    issues: ShaderIssue[]
}

export async function compileShaderCode(
    device: GPUDevice,
    shader_code: string
): Promise<ShaderCompilationResult> {
    const trimmed_code = shader_code.trim()

    const module = device.createShaderModule({
        code: trimmed_code
    })
    const info = await module.getCompilationInfo()
    const issues: ShaderIssue[] = []

    if (info.messages.length > 0) {
        const lines = trimmed_code.split('\n')

        for (const message of info.messages) {
            const issue_line = lines[message.lineNum - 1].trim()
            const issue_text = `${message.type}: ${message.message}`

            console.error(issue_text)
            console.error(issue_line)

            issues.push({
                message: issue_text,
                codeLine: issue_line
            })
        }
    }

    return { module, issues }
}

export function createBuffer(device: GPUDevice, descriptor: LinkedBuffer) {
    const buffer = device.createBuffer({
        label: descriptor.name,
        size: descriptor.byteLength,
        usage: descriptor.usage
    })
    if (descriptor.data) {
        device.queue.writeBuffer(
            buffer,
            0,
            descriptor.data,
            0,
            descriptor.data.byteLength
        )
    }
    return buffer
}

export function createLayoutEntry(
    resource: StaticResource,
    bind_index: number,
    visibility: GPUFlagsConstant
): GPUBindGroupLayoutEntry {
    const common = {
        binding: bind_index,
        visibility: visibility
    }

    switch (resource.kind) {
        case 'Uniform':
            return {
                ...common,
                buffer: {
                    type: 'uniform'
                }
            }
        case 'StorageBufferView':
            switch (resource.accessMode) {
                case 'read':
                    return {
                        ...common,
                        buffer: {
                            type: 'read-only-storage'
                        }
                    }
                case 'read_write':
                    return {
                        ...common,
                        buffer: {
                            type: 'storage'
                        }
                    }
            }
    }
}

export function createPingPongLayoutEntries(bind_index: number) {
    const entry1: GPUBindGroupLayoutEntry = {
        binding: bind_index,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: 'read-only-storage'
        }
    }
    const entry2: GPUBindGroupLayoutEntry = {
        binding: bind_index + 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: 'storage'
        }
    }
    return { entry1, entry2 }
}

export function createCanvasLayout(
    device: GPUDevice,
    color_format: GPUTextureFormat
): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        label: 'canvas',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    format: color_format
                }
            }
        ]
    })
}
