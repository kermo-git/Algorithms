import { Resource, ShaderModule, ShaderPass } from './DataTypes'

interface BindingVisibility {
    compute: Set<string>
    vertex: Set<string>
    fragment: Set<string>
}

export function determineBindingVisibility(
    shader_passes: ShaderPass[]
): BindingVisibility {
    const compute = new Set<string>()
    const vertex = new Set<string>()
    const fragment = new Set<string>()

    function countResources(names: Set<string>, resources: Resource[]) {
        for (const resource of resources) {
            switch (resource.kind) {
                case 'StorageTexture':
                case 'Uniform':
                    names.add(resource.name)
                    break
                case 'StorageBufferView':
                    names.add(resource.buffer.name)
                    break
                case 'PingPongBuffers':
                    names.add(resource.readName)
                    names.add(resource.writeName)
                    break
            }
        }
    }

    for (const pass of shader_passes) {
        if (pass.kind === 'ComputeShader') {
            if (pass.resources) {
                countResources(compute, pass.resources)
            }
        } else {
            if (pass.vertex.resources) {
                countResources(vertex, pass.vertex.resources)
            }
            if (pass.fragment.resources) {
                countResources(vertex, pass.fragment.resources)
            }
        }
    }

    return {
        compute,
        vertex,
        fragment
    }
}

function identifier(resource: Resource): string {
    switch (resource.kind) {
        case 'Uniform':
        case 'StorageTexture':
            return resource.name
        case 'StorageBufferView':
            return resource.buffer.name
        case 'PingPongBuffers':
            return `${resource.readName}_${resource.writeName}`
    }
}

export function resolveImports(shader: ShaderModule): ShaderModule {
    const resolved_resource_names = new Set<string>(
        (shader.resources || []).map(identifier)
    )
    const resolved_resources: Resource[] = shader.resources || []

    const resolved_module_names = new Set<string>()
    const resolved_modules: ShaderModule[] = []

    const stack = shader.imports!.slice()

    while (stack.length > 0) {
        const current = stack.pop()!

        if (!resolved_module_names.has(current.name)) {
            resolved_module_names.add(current.name)
            resolved_modules.push(current)

            if (current.resources) {
                for (const resource of current.resources) {
                    const resource_id = identifier(resource)
                    if (!resolved_resource_names.has(resource_id)) {
                        resolved_resource_names.add(resource_id)
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

    let code = ''
    for (const module of resolved_modules) {
        code += `${module.code}\n\n`
    }

    return {
        ...shader,
        resources: resolved_resources,
        imports: [],
        code: code
    }
}
