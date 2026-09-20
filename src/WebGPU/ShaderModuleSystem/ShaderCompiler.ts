import {
    createCanvasLayout,
    compileShaderCode,
    createLayoutEntry,
    createPingPongLayoutEntries,
    createComputeShaderCode,
    createRenderShaderCode
} from './Compiler'
import {
    LinkedComputeShader,
    LinkedRenderShader,
    StaticResource
} from './LinkedModules'
import { PingPongBuffers, getName } from './Modules'

export interface CompiledComputeShader {
    name: string
    pipelineLayout: GPUPipelineLayout
    pipeline: GPUComputePipeline

    staticResources?: StaticResource[]
    staticLayout?: GPUBindGroupLayout
    staticGroup?: GPUBindGroup

    pingPongResources?: PingPongBuffers[]
    pingPongLayout?: GPUBindGroupLayout
    pingPongGroupAB?: GPUBindGroup
    pingPongGroupBA?: GPUBindGroup

    canvasLayout?: GPUBindGroupLayout
}

export interface CompiledRenderShader {
    name: string
    pipelineLayout: GPUPipelineLayout
    pipeline: GPURenderPipeline

    indexBufferName: string
    indexBuffer?: GPUBuffer

    resources?: StaticResource[]
    bindLayout?: GPUBindGroupLayout
    bindGroup?: GPUBindGroup
}

export async function compileComputeShader(
    device: GPUDevice,
    canvas_color_format: GPUTextureFormat,
    shader: LinkedComputeShader
): Promise<CompiledComputeShader> {
    const { staticResources, pingPongResources } = shader

    const bindGroupLayouts: GPUBindGroupLayout[] = []
    let staticLayout, pingPongLayout, canvasLayout

    if (staticResources.length > 0) {
        const layout_entries = shader.staticResources.map((r, i) =>
            createLayoutEntry(r, i, GPUShaderStage.COMPUTE)
        )

        staticLayout = device.createBindGroupLayout({
            label: `${shader.name}_static_layout`,
            entries: layout_entries
        })
        bindGroupLayouts.push(staticLayout)
    }

    if (pingPongResources.length > 0) {
        pingPongLayout = device.createBindGroupLayout({
            label: `${shader.name}_ping_pong_layout`,
            entries: pingPongResources.flatMap((_, i) => {
                const { entry1, entry2 } = createPingPongLayoutEntries(2 * i)
                return [entry1, entry2]
            })
        })
        bindGroupLayouts.push(pingPongLayout)
    }

    if (shader.canvas) {
        canvasLayout = createCanvasLayout(device, canvas_color_format)
        bindGroupLayouts.push(canvasLayout)
    }

    const pipelineLayout = device.createPipelineLayout({
        label: shader.name,
        bindGroupLayouts
    })
    const code = createComputeShaderCode(shader, canvas_color_format)
    const { module } = await compileShaderCode(device, code)

    return {
        name: shader.name,
        pipelineLayout,
        pipeline: device.createComputePipeline({
            label: shader.name,
            layout: pipelineLayout,
            compute: {
                module
            }
        }),
        staticResources: shader.staticResources,
        staticLayout,
        pingPongResources: shader.pingPongResources,
        pingPongLayout,
        canvasLayout
    }
}

export function bindComputeShader(
    device: GPUDevice,
    buffers: Map<string, GPUBuffer>,
    compiled_shader: CompiledComputeShader
) {
    const {
        name,
        staticResources,
        staticLayout,
        pingPongResources,
        pingPongLayout
    } = compiled_shader

    if (staticResources && staticLayout) {
        const bind_group_entries = staticResources.map((r, i) => ({
            binding: i,
            resource: {
                buffer: buffers.get(getName(r))!
            }
        }))

        compiled_shader.staticGroup = device.createBindGroup({
            label: `${name}_static_group`,
            layout: staticLayout,
            entries: bind_group_entries
        })
    }

    if (pingPongResources && pingPongLayout) {
        compiled_shader.pingPongGroupAB = device.createBindGroup({
            label: `${name}_ping_pong_AB`,
            layout: pingPongLayout,
            entries: pingPongResources.flatMap((r, i) => {
                return [
                    {
                        binding: 2 * i,
                        resource: buffers.get(r.buffer_A.name)!
                    },
                    {
                        binding: 2 * i + 1,
                        resource: buffers.get(r.buffer_B.name)!
                    }
                ]
            })
        })

        compiled_shader.pingPongGroupBA = device.createBindGroup({
            label: `${name}_ping_pong_BA`,
            layout: pingPongLayout,
            entries: pingPongResources.flatMap((r, i) => {
                return [
                    {
                        binding: 2 * i,
                        resource: buffers.get(r.buffer_B.name)!
                    },
                    {
                        binding: 2 * i + 1,
                        resource: buffers.get(r.buffer_A.name)!
                    }
                ]
            })
        })
    }
}

export async function compileRenderShader(
    device: GPUDevice,
    canvas_color_format: GPUTextureFormat,
    shader: LinkedRenderShader
): Promise<CompiledRenderShader> {
    const { resources } = shader

    const bindGroupLayouts: GPUBindGroupLayout[] = []
    let bindLayout

    if (resources.length > 0) {
        bindLayout = device.createBindGroupLayout({
            label: 'resources',
            entries: shader.resources.map((r, i) =>
                createLayoutEntry(r, i, GPUShaderStage.COMPUTE)
            )
        })
        bindGroupLayouts.push(bindLayout)
    }

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts
    })
    const code = createRenderShaderCode(shader)
    const { module } = await compileShaderCode(device, code)

    return {
        name: shader.name,
        pipelineLayout,
        pipeline: device.createRenderPipeline({
            label: shader.name,
            layout: pipelineLayout,
            vertex: {
                module
            },
            fragment: {
                module,
                targets: [
                    {
                        format: canvas_color_format
                    }
                ]
            },
            primitive: {
                topology: shader.primitiveTopology
            }
        }),
        indexBufferName: shader.indexBuffer.name,
        resources: shader.resources,
        bindLayout
    }
}

export function bindRenderShader(
    device: GPUDevice,
    buffers: Map<string, GPUBuffer>,
    compiled_shader: CompiledRenderShader
) {
    const { indexBufferName, resources, bindLayout } = compiled_shader

    if (resources && bindLayout) {
        compiled_shader.bindGroup = device.createBindGroup({
            layout: bindLayout,
            entries: resources.map((r, i) => ({
                binding: i,
                resource: {
                    buffer: buffers.get(getName(r))!
                }
            }))
        })
    }
    compiled_shader.indexBuffer = buffers.get(indexBufferName)!
}
