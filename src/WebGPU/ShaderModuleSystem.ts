export interface ShaderResource {
    name: string
    usage: GPUFlagsConstant
    dataType: string

    byteLength?: number
    generateData?: () => ArrayBuffer

    // texture specific fields
    color_format?: GPUTextureFormat
}

export interface ShaderModule {
    name: string
    resources?: ShaderResource[]
    imports?: ShaderModule[]

    emitShaderCode(): string
}

export interface ResourceBinding {
    name: string
    resource: ShaderResource
    readOnlyStorage?: boolean
}

export interface BindGroup {
    kind: 'BindGroup'
    name: string
    bindings: ResourceBinding[]
    reCreateEveryFrame?: boolean
}

export interface SharedLayoutBindGroups {
    kind: 'SharedLayoutBindGroups'
    name: string
    bindGroups: BindGroup[]
}

export interface ShaderStage {
    name: string
    type: GPUFlagsConstant // GPUShaderStage.COMPUTE/VERTEX/FRAGMENT
    resources?: (BindGroup | SharedLayoutBindGroups)[]
    imports?: ShaderModule[]
    emitShaderCode(): string
}

export interface ModuleResolution {
    resources: ShaderResource[]
    modules: ShaderModule[]
}

export function resolve(modules: ShaderModule[]): ModuleResolution {
    const resolved_resource_names = new Set<string>()
    const resolved_module_names = new Set<string>()
    const stack = modules.slice()

    const resolved_resources: ShaderResource[] = []
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

// TODO: take GPUDevice, ShaderStage[]
// - Determine shader stage visibility for all ResourceBinding objects.
// - Create all the layout, bind group and pipeline objects.
// - Return a class that can retrieve any buffer, bind group and pipeline by name.
export class ShaderResources {
    shaders: ShaderStage[] = []

    buffers = new Map<string, GPUBuffer>()
    bind_group_layouts = new Map<string, GPUBindGroupLayout>()
    bind_groups = new Map<string, GPUBindGroup>()
    pipeline_layouts = new Map<string, GPUPipelineLayout>()
    compute_pipelines = new Map<string, GPUComputePipeline>()
    render_pipelines = new Map<string, GPURenderPipeline>()

    constructor(device: GPUDevice, shaders: ShaderStage[]) {
        this.shaders = shaders
        const visibility = determineBindingVisibility(shaders)
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

interface BindingVisibility {
    compute: Set<string>
    vertex: Set<string>
    fragment: Set<string>
}

function determineBindingVisibility(shaders: ShaderStage[]): BindingVisibility {
    const compute = new Set<string>()
    const vertex = new Set<string>()
    const fragment = new Set<string>()

    for (const shader of shaders) {
        let bindingSet: Set<string>

        if ((shader.type & GPUShaderStage.COMPUTE) !== 0) {
            bindingSet = compute
        } else if ((shader.type & GPUShaderStage.VERTEX) !== 0) {
            bindingSet = vertex
        } else {
            bindingSet = fragment
        }

        if (shader.resources) {
            for (const resource of shader.resources) {
                let bindings: ResourceBinding[]

                if (resource.kind === 'BindGroup') {
                    bindings = resource.bindings
                } else {
                    bindings = resource.bindGroups[0].bindings
                }

                for (const binding of bindings) {
                    bindingSet.add(binding.name)
                }
            }
        }
    }

    return {
        compute,
        vertex,
        fragment
    }
}

function declareBinding(
    binding: ResourceBinding,
    group_index: number,
    binding_index: number
) {
    const { dataType } = binding.resource
    const declaration = bindingTypeDeclaration(binding)
    return `@group(${group_index}) @binding(${binding_index}) ${declaration} ${binding.name}: ${dataType};`
}

function bindingTypeDeclaration(binding: ResourceBinding): string {
    const { usage } = binding.resource

    if ((usage & GPUBufferUsage.UNIFORM) !== 0) {
        return 'var<uniform>'
    } else if ((usage & GPUBufferUsage.STORAGE) !== 0) {
        if (binding.readOnlyStorage) {
            return 'var<storage, read>'
        } else {
            return 'var<storage, read_write>'
        }
    }
    return 'var'
}

function createLayoutEntry(
    binding: ResourceBinding,
    bind_index: number,
    visibility: GPUFlagsConstant // GPUShaderStage.COMPUTE/VERTEX/FRAGMENT
): GPUBindGroupLayoutEntry {
    const { usage, color_format } = binding.resource
    const common = {
        binding: bind_index,
        visibility: visibility
    }

    if ((usage & GPUBufferUsage.UNIFORM) !== 0) {
        return {
            ...common,
            buffer: {
                type: 'uniform'
            }
        }
    }
    if ((usage & GPUBufferUsage.STORAGE) !== 0) {
        return {
            ...common,
            buffer: {
                type: binding.readOnlyStorage ? 'read-only-storage' : 'storage'
            }
        }
    }
    return {
        ...common,
        storageTexture: {
            format: color_format!
        }
    }
}

function createBuffer(resource: ShaderResource, device: GPUDevice): GPUBuffer {
    device.createSampler({})
    const buffer = device.createBuffer({
        label: resource.name,
        size: resource.byteLength!,
        usage: resource.usage
    })

    if (resource.generateData) {
        const data = resource.generateData()
        device.queue.writeBuffer(buffer, 0, data, 0, data.byteLength)
    }

    return buffer
}
