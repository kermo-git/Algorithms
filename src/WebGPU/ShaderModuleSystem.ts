export interface ResourceDefinition {
    name: string
    dataType: string
    bindingType: GPUBufferBindingType
    usage: GPUFlagsConstant
    visibility?: GPUFlagsConstant

    byteLength: number
    generateData?: () => ArrayBuffer
}

export interface ShaderModule {
    name: string
    resources?: ResourceDefinition[]
    imports?: ShaderModule[]

    emitShaderCode(): string
}

export interface ModuleResolution {
    resources: ResourceDefinition[]
    modules: ShaderModule[]
}

export function resolve(modules: ShaderModule[]): ModuleResolution {
    const resolved_resource_names = new Set<string>()
    const resolved_module_names = new Set<string>()
    const stack = modules.slice()

    const resolved_resources: ResourceDefinition[] = []
    const resolved_modules: ShaderModule[] = []

    while (stack.length > 0) {
        const current = stack.pop()!

        if (!resolved_module_names.has(current.name)) {
            resolved_module_names.add(current.name)
            resolved_modules.push(current)

            if (current.resources) {
                for (const resource of current.resources) {
                    if (!resolved_resource_names.has(resource.name)) {
                        resolved_resource_names.add(resource.name)
                        resolved_resources.push(resource)
                    }
                }
            }
            if (current.imports) {
                for (const dependency of current.imports) {
                    stack.push(dependency)
                }
            }
        }
    }

    return {
        resources: resolved_resources,
        modules: resolved_modules.reverse()
    }
}

export class ShaderResources {
    buffers = new Map<string, GPUBuffer>()
    bind_entries: GPUBindGroupEntry[] = []
    layout_entries: GPUBindGroupLayoutEntry[] = []

    constructor(
        resources: ResourceDefinition[],
        binding_start: number,
        device: GPUDevice
    ) {
        let binding = binding_start

        for (const resource of resources) {
            const buffer = createBuffer(resource, device)
            this.buffers.set(resource.name, buffer)
            this.bind_entries.push({
                binding: binding,
                resource: {
                    buffer: buffer
                }
            })
            this.layout_entries.push(createLayoutEntry(resource, binding))
            binding += 1
        }
    }

    writeInt(device: GPUDevice, name: string, data: number, offset = 0) {
        this.write(device, name, new Int32Array([data]).buffer, offset)
    }

    writeUint(device: GPUDevice, name: string, data: number, offset = 0) {
        this.write(device, name, new Uint32Array([data]).buffer, offset)
    }

    writeFloat(device: GPUDevice, name: string, data: number, offset = 0) {
        this.write(device, name, new Float32Array([data]).buffer, offset)
    }

    write(device: GPUDevice, name: string, data: ArrayBuffer, offset = 0) {
        const buffer = this.buffers.get(name)!
        device.queue.writeBuffer(buffer, offset, data, 0, data.byteLength)
    }

    destroy() {
        for (const resource of this.buffers) {
            resource[1].destroy()
        }
    }
}

export function emitShaderCode(
    resolution: ModuleResolution,
    bind_group: number,
    binding_start: number
): string {
    let code = ''
    let binding = binding_start

    for (const resource of resolution.resources) {
        code += `${declareResource(resource, bind_group, binding)}\n`
        binding += 1
    }

    code += '\n'

    for (const module of resolution.modules) {
        code += module.emitShaderCode()
    }

    return code
}

function declareResource(
    resource: ResourceDefinition,
    group: number,
    binding: number
) {
    const binding_type = bindingTypeDeclaration(resource.bindingType)
    return `@group(${group}) @binding(${binding}) var<${binding_type}> ${resource.name}: ${resource.dataType};`
}

function bindingTypeDeclaration(type: GPUBufferBindingType): string {
    switch (type) {
        case 'read-only-storage':
            return 'storage, read'
        default:
            return type
    }
}

function createLayoutEntry(
    resource: ResourceDefinition,
    binding: number
): GPUBindGroupLayoutEntry {
    return {
        binding: binding,
        visibility: resource.visibility!,
        buffer: {
            type: resource.bindingType
        }
    }
}

function createBuffer(
    resource: ResourceDefinition,
    device: GPUDevice
): GPUBuffer {
    const buffer = device.createBuffer({
        size: resource.byteLength,
        usage: resource.usage
    })

    if (resource.generateData) {
        const data = resource.generateData()
        device.queue.writeBuffer(buffer, 0, data, 0, data.byteLength)
    }

    return buffer
}
