export interface ResourceDefinition {
    name: string
    bindingType: GPUBufferBindingType
    usage: GPUFlagsConstant
    dataType: string

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
    const stack = [modules[0]]

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
        modules: resolved_modules
    }
}

function bindingTypeDeclaration(type: GPUBufferBindingType): string {
    switch (type) {
        case 'read-only-storage':
            return 'storage, read'
        default:
            return type
    }
}

export function declareResource(
    resource: ResourceDefinition,
    group: number,
    binding: number
) {
    const binding_type = bindingTypeDeclaration(resource.bindingType)
    return `@group(${group}) @binding(${binding}) var<${binding_type}> ${resource.name}: ${resource.dataType};`
}

export function emitShaderCode(
    resolution: ModuleResolution,
    bind_group: number,
    binding_start: number
) {
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
}

export function createLayoutEntry(
    resource: ResourceDefinition,
    binding: number,
    visibility: GPUFlagsConstant
): GPUBindGroupLayoutEntry {
    return {
        binding: binding,
        visibility: visibility,
        buffer: {
            type: resource.bindingType
        }
    }
}

export function createBuffer(resource: ResourceDefinition, device: GPUDevice) {
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
