import {
    Buffer,
    Resolved,
    ResolvedComputePipeline,
    ResolvedRenderPipeline,
    StaticResource
} from './Resolved'
import {
    ComputeShaderModule,
    PingPongBuffers,
    ReadOnlyResource,
    RenderPipeline,
    Resource,
    Shader,
    ShaderModule,
    StorageBuffer
} from './UserInput'

export function link(shaders: Shader[]): Resolved {
    const buffers = new Map<string, Buffer>()

    function addStorageBuffer(buffer: StorageBuffer) {
        if (!buffers.get(buffer.name)) {
            let usage = GPUBufferUsage.STORAGE

            if (buffer.data) {
                usage |= GPUBufferUsage.COPY_DST
            }
            buffers.set(buffer.name, {
                name: buffer.name,
                usage: usage,
                size: buffer.byteLength || buffer.data?.byteLength || 0,
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
                            size: resource.data.byteLength,
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

    let compute_pipelines: ResolvedComputePipeline[] = []
    let render_pipelines: ResolvedRenderPipeline[] = []

    for (const shader of shaders) {
        switch (shader.kind) {
            case 'ComputeShaderModule': {
                const resolved = resolveComputePipeline(shader)
                findBuffers(resolved.staticResources)
                findBuffers(resolved.pingPongResources)
                compute_pipelines.push(resolved)
                break
            }
            case 'RenderPipeline': {
                const resolved = resolveRenderPipeline(shader)
                findBuffers(resolved.resources)
                addStorageBuffer(resolved.indexBuffer)
                buffers.get(resolved.indexBuffer.name)!.usage |=
                    GPUBufferUsage.INDEX
                render_pipelines.push(resolved)
                break
            }
        }
    }

    return {
        buffers: buffers,
        computePipelines: compute_pipelines,
        renderPipelines: render_pipelines
    }
}

export function getName(resource: Resource): string {
    switch (resource.kind) {
        case 'Uniform':
            return resource.name
        case 'StorageBufferView':
            return resource.buffer.name
        case 'PingPongBuffers':
            return `${resource.readName}_${resource.writeName}`
    }
}

function resolveModule<T extends ShaderModule>(shader: T): T {
    const resolved_resource_names = new Set<string>(
        (shader.resources || []).map(getName)
    )
    const resolved_resources: Resource[] = shader.resources || []

    const resolved_module_names = new Set<string>()
    const resolved_modules: ShaderModule[] = []

    const stack = (shader.imports || []).slice()

    while (stack.length > 0) {
        const current = stack.pop()!

        if (!resolved_module_names.has(current.name)) {
            resolved_module_names.add(current.name)
            resolved_modules.push(current)

            if (current.resources) {
                for (const resource of current.resources) {
                    const name = getName(resource)
                    if (!resolved_resource_names.has(name)) {
                        resolved_resource_names.add(name)
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
        ...shader,
        resources: resolved_resources,
        imports: resolved_modules
    }
}

function resolveComputePipeline(
    pipeline: ComputeShaderModule
): ResolvedComputePipeline {
    const resolved = resolveModule(pipeline)
    let code = ''

    for (const module of resolved.imports || []) {
        code += module.code
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
        kind: 'ResolvedComputePipeline',
        name: pipeline.name,
        staticResources: static_resources,
        pingPongResources: ping_pong_groups,
        canvas: pipeline.canvas,
        code: code
    }
}

function resolveRenderPipeline(
    pipeline: RenderPipeline
): ResolvedRenderPipeline {
    const visibility = new Map<string, GPUFlagsConstant>()
    let resolved_resources: ReadOnlyResource[] = []

    const resolved_vertex = resolveModule(pipeline.vertexShader)
    const resolved_fragment = resolveModule(pipeline.fragmentShader)

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
        kind: 'ResolvedRenderPipeline',
        name: pipeline.name,
        primitiveTopology: pipeline.primitiveTopology,
        visibility: visibility,
        resources: resolved_resources,
        indexBuffer: pipeline.indexBuffer,
        code: `${resolved_code}${resolved_vertex.code}\n${resolved_fragment.code}`
    }
}
