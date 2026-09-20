import {
    LinkedBuffer,
    LinkedScene,
    LinkedComputeShader,
    LinkedRenderShader,
    StaticResource
} from './LinkedModules'
import {
    ComputeShader,
    PingPongBuffers,
    ReadOnlyResource,
    RenderShader,
    Resource,
    Shader,
    ShaderModule,
    StorageBuffer,
    getName,
    getDataType,
    getDataTypeCode
} from './Modules'

export function link(shaders: Shader[]): LinkedScene {
    const buffers = new Map<string, LinkedBuffer>()

    function addStorageBuffer(buffer: StorageBuffer) {
        if (!buffers.get(buffer.name)) {
            let usage = GPUBufferUsage.STORAGE

            if (buffer.data) {
                usage |= GPUBufferUsage.COPY_DST
            }
            buffers.set(buffer.name, {
                name: buffer.name,
                usage: usage,
                byteLength: buffer.byteLength || buffer.data?.byteLength || 0,
                data: buffer.data
            })
        }
    }

    function findBuffers(resources: Resource[]) {
        for (const resource of resources) {
            switch (resource.kind) {
                case 'Uniform':
                    if (!buffers.get(resource.name)) {
                        buffers.set(resource.name, {
                            name: resource.name,
                            usage:
                                GPUBufferUsage.UNIFORM |
                                GPUBufferUsage.COPY_DST,
                            byteLength: resource.data.byteLength,
                            data: resource.data
                        })
                    }
                    break
                case 'StorageBufferView':
                    addStorageBuffer(resource.buffer)
                    break
                case 'PingPongBuffers':
                    addStorageBuffer(resource.buffer_A)
                    addStorageBuffer(resource.buffer_B)
                    break
            }
        }
    }

    let compute_shaders: LinkedComputeShader[] = []
    let render_shaders: LinkedRenderShader[] = []

    for (const shader of shaders) {
        switch (shader.kind) {
            case 'ComputeShader': {
                const resolved = linkComputeShader(shader)
                findBuffers(resolved.staticResources)
                findBuffers(resolved.pingPongResources)
                compute_shaders.push(resolved)
                break
            }
            case 'RenderShader': {
                const resolved = linkRenderShader(shader)
                findBuffers(resolved.resources)
                addStorageBuffer(resolved.indexBuffer)

                const buffer = buffers.get(resolved.indexBuffer.name)!
                buffer.usage |= GPUBufferUsage.INDEX
                buffers.set(resolved.indexBuffer.name, buffer)

                render_shaders.push(resolved)
                break
            }
        }
    }

    return {
        buffers: buffers,
        computeShaders: compute_shaders,
        renderShaders: render_shaders
    }
}

function resolveImports<T extends ShaderModule>(shader: T): T {
    const resolved_resource_names = new Set<string>()
    const resolved_resources: Resource[] = []

    const resolved_module_names = new Set<string>()
    const resolved_modules: ShaderModule[] = []

    const stack: ShaderModule[] = [shader]

    while (stack.length > 0) {
        const current = stack.pop()!

        if (!resolved_module_names.has(current.name)) {
            resolved_module_names.add(current.name)
            resolved_modules.push({
                name: current.name,
                code: current.code
            })

            for (const resource of current.resources || []) {
                const name = getName(resource)

                if (!resolved_resource_names.has(name)) {
                    resolved_resource_names.add(name)
                    resolved_resources.push(resource)

                    const datatype = getDataType(resource)
                    const datatype_code = getDataTypeCode(resource)

                    if (datatype_code && !resolved_module_names.has(datatype)) {
                        resolved_module_names.add(datatype)
                        resolved_modules.unshift({
                            name: datatype,
                            code: datatype_code
                        })
                    }
                }
            }

            for (const dependency of current.imports || []) {
                stack.push(dependency)
            }
        }
    }

    return {
        ...shader,
        resources: resolved_resources,
        imports: resolved_modules,
        code: ''
    }
}

export function linkComputeShader(shader: ComputeShader): LinkedComputeShader {
    const resolved = resolveImports(shader)
    let code = ''

    for (const module of resolved.imports || []) {
        code += module.code + '\n'
    }

    const static_resources: StaticResource[] = []
    const ping_pong_groups: PingPongBuffers[] = []

    for (const resource of resolved.resources || []) {
        switch (resource.kind) {
            case 'Uniform':
            case 'StorageBufferView':
                static_resources.push(resource)
                break
            case 'PingPongBuffers':
                ping_pong_groups.push(resource)
                break
        }
    }
    return {
        kind: 'LinkedComputeShader',
        name: shader.name,
        staticResources: static_resources,
        pingPongResources: ping_pong_groups,
        canvas: shader.canvas,
        code: code
    }
}

export function linkRenderShader(shader: RenderShader): LinkedRenderShader {
    const resolved_vertex = resolveImports(shader.vertexShader)
    const resolved_fragment = resolveImports(shader.fragmentShader)

    const visibility = new Map<string, GPUFlagsConstant>()
    let resolved_resources: ReadOnlyResource[] = []

    for (const r of resolved_vertex.resources || []) {
        resolved_resources.push(r)
        visibility.set(getName(r), GPUShaderStage.VERTEX)
    }

    for (const r of resolved_fragment.resources || []) {
        const name = getName(r)
        const flags = visibility.get(name)

        if (flags) {
            visibility.set(name, flags | GPUShaderStage.FRAGMENT)
        } else {
            visibility.set(name, GPUShaderStage.FRAGMENT)
            resolved_resources.push(r)
        }
    }

    let resolved_module_names = new Set<string>()
    let resolved_code = ''

    for (const i of resolved_vertex.imports || []) {
        resolved_module_names.add(i.name)
        resolved_code += i.code + '\n'
    }

    for (const i of resolved_fragment.imports || []) {
        if (!resolved_module_names.has(i.name)) {
            resolved_code += i.code + '\n'
        }
    }

    return {
        kind: 'LinkedRenderShader',
        name: shader.name,
        primitiveTopology: shader.primitiveTopology,
        visibility: visibility,
        resources: resolved_resources,
        indexBuffer: shader.indexBuffer,
        code: resolved_code
    }
}
