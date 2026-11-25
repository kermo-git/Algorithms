import {
    LinkedBuffer,
    LinkedScene,
    LinkedComputeShader,
    LinkedRenderShader,
    StaticResource
} from './LinkedModules'
import {
    Buffer,
    BufferKind,
    ComputeShader,
    PingPongBuffer,
    ReadOnlyResource,
    RenderShader,
    Resource,
    Shader,
    ShaderModule,
    getName
} from './Modules'

export function link(shaders: Shader[]): LinkedScene {
    const buffers = new Map<string, LinkedBuffer>()

    function addBuffer<T extends BufferKind>(buffer: Buffer<T>) {
        let linked_buffer = buffers.get(buffer.name)

        if (!linked_buffer) {
            linked_buffer = {
                name: buffer.name,
                usage: 0,
                byteLength: 0
            }
        }

        linked_buffer.byteLength = Math.max(
            linked_buffer.byteLength,
            buffer.byteLength || buffer.data?.byteLength || 0
        )

        if (buffer.data) {
            linked_buffer.usage |= GPUBufferUsage.COPY_DST
        }
        switch (buffer.kind) {
            case 'uniform':
                linked_buffer.usage |=
                    GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                break
            case 'storage_read':
            case 'storage_write':
                linked_buffer.usage |= GPUBufferUsage.STORAGE
                break
            case 'index':
                linked_buffer.usage |= GPUBufferUsage.INDEX
                break
        }
        linked_buffer.data ||= buffer.data
        linked_buffer.code ||= buffer.code

        buffers.set(buffer.name, linked_buffer)
    }

    function addPingPongBuffer(ping_pong: PingPongBuffer) {
        const buffer: Buffer<'storage_read'> = {
            kind: 'storage_read',
            name: ping_pong.buffer_A_name,
            dataType: ping_pong.dataType,
            code: ping_pong.code,
            byteLength: ping_pong.byteLength,
            data: ping_pong.data
        }
        addBuffer(buffer)
        buffer.name = ping_pong.buffer_B_name
        addBuffer(buffer)
    }

    let compute_shaders: LinkedComputeShader[] = []
    let render_shaders: LinkedRenderShader[] = []

    for (const shader of shaders) {
        switch (shader.kind) {
            case 'ComputeShader': {
                const resolved = linkComputeShader(shader)
                resolved.staticResources.forEach(addBuffer)
                resolved.pingPongBuffers.forEach(addPingPongBuffer)
                compute_shaders.push(resolved)
                break
            }
            case 'RenderShader': {
                const resolved = linkRenderShader(shader)
                resolved.resources.forEach(addBuffer)
                addBuffer(resolved.indexBuffer)
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

                    if (
                        resource.code &&
                        !resolved_module_names.has(resource.dataType)
                    ) {
                        resolved_module_names.add(resource.dataType)
                        resolved_modules.unshift({
                            name: resource.dataType,
                            code: resource.code
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
    const ping_pong_resources: PingPongBuffer[] = []

    for (const resource of resolved.resources || []) {
        switch (resource.kind) {
            case 'uniform':
            case 'storage_read':
            case 'storage_write':
                static_resources.push(resource)
                break
            case 'ping_pong':
                ping_pong_resources.push(resource)
                break
        }
    }
    return {
        kind: 'LinkedComputeShader',
        name: shader.name,
        staticResources: static_resources,
        pingPongBuffers: ping_pong_resources,
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
        visibility.set(r.name, GPUShaderStage.VERTEX)
    }

    for (const r of resolved_fragment.resources || []) {
        const flags = visibility.get(r.name)

        if (flags) {
            visibility.set(r.name, flags | GPUShaderStage.FRAGMENT)
        } else {
            visibility.set(r.name, GPUShaderStage.FRAGMENT)
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
        resource_visibility: visibility,
        resources: resolved_resources,
        indexBuffer: shader.indexBuffer,
        code: resolved_code
    }
}
