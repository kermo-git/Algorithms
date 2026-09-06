import {
    Buffer,
    ResolvedComputePipeline,
    ResolvedRenderPipeline,
    StaticResource
} from './Resolved'
import { Resource } from './UserInput'

export function computeCode(
    pipeline: ResolvedComputePipeline,
    canvas_color_format: GPUTextureFormat
) {
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
            canvasDeclaration(
                group_index,
                pipeline.canvas,
                canvas_color_format
            ) + '\n'
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

export function canvasDeclaration(
    group_index: number,
    name: string,
    color_format: GPUTextureFormat
) {
    return `@group(${group_index}) @binding(0) var ${name}: texture_storage_2d<${color_format}, write>`
}

export async function requestDevice(features: GPUFeatureName[] = []) {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
        throw Error('WebGPU adapter not found!')
    }
    const supportedFeatures = features.filter(adapter.features.has)
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

export async function compileShader(
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

export function createPingPongLayoutEntries(
    bind_index: number,
    visibility: GPUFlagsConstant
) {
    const entry1: GPUBindGroupLayoutEntry = {
        binding: bind_index,
        visibility: visibility,
        buffer: {
            type: 'read-only-storage'
        }
    }
    const entry2: GPUBindGroupLayoutEntry = {
        binding: bind_index + 1,
        visibility: visibility,
        buffer: {
            type: 'storage'
        }
    }
    return { entry1, entry2 }
}

export function canvasLayout(
    device: GPUDevice,
    color_format: GPUTextureFormat
): GPUBindGroupLayout {
    return device.createBindGroupLayout({
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
