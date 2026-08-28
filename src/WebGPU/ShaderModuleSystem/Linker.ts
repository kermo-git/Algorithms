import { Resource, ShaderModule, ShaderStage } from './DataTypes'

interface BindingVisibility {
    compute: Set<string>
    vertex: Set<string>
    fragment: Set<string>
}

export function determineBindingVisibility(
    shaders: ShaderStage[]
): BindingVisibility {
    const compute = new Set<string>()
    const vertex = new Set<string>()
    const fragment = new Set<string>()

    for (const shader of shaders) {
        let bindingSet: Set<string>

        if (shader.type === 'compute') {
            bindingSet = compute
        } else if (shader.type === 'vertex') {
            bindingSet = vertex
        } else {
            bindingSet = fragment
        }

        if (shader.resources) {
            for (const resource of shader.resources) {
                switch (resource.kind) {
                    case 'CanvasTexture':
                    case 'Uniform':
                        bindingSet.add(resource.name)
                        break
                    case 'StorageBufferView':
                        bindingSet.add(resource.buffer.name)
                        break
                    case 'PingPongBuffers':
                        bindingSet.add(resource.readName)
                        bindingSet.add(resource.writeName)
                        break
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

function identifier(resource: Resource): string {
    switch (resource.kind) {
        case 'Uniform':
        case 'CanvasTexture':
            return resource.name
        case 'StorageBufferView':
            return resource.buffer.name
        case 'PingPongBuffers':
            return `${resource.readName}_${resource.writeName}`
    }
}

export function resolveImports(shader: ShaderStage): ShaderStage {
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

    // TODO: iterate resolved_modules backwards and add code
    let code = ''

    return {
        type: shader.type,
        name: shader.name,
        resources: resolved_resources,
        code: shader.code
    }
}
