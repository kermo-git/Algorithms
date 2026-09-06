import {
    createCanvasLayout,
    compileShaderCode,
    createLayoutEntry,
    createPingPongLayoutEntries
} from './Compiler'
import { getName } from './Linker'
import { LinkedComputeShader, LinkedRenderShader } from './LinkedModules'

export interface CompiledComputeShader {
    pipelineLayout: GPUPipelineLayout
    pipeline: GPUComputePipeline
    staticGroup?: GPUBindGroup
    pingPongGroupAB?: GPUBindGroup
    pingPongGroupBA?: GPUBindGroup
    canvasLayout?: GPUBindGroupLayout
}

export interface CompiledRenderShader {
    pipelineLayout: GPUPipelineLayout
    pipeline: GPURenderPipeline
    indexBuffer: GPUBuffer
    bindGroup?: GPUBindGroup
}

export async function compileComputeShader(
    device: GPUDevice,
    buffers: Map<string, GPUBuffer>,
    canvas_color_format: GPUTextureFormat,
    shader: LinkedComputeShader
): Promise<CompiledComputeShader> {
    const { staticResources, pingPongResources } = shader

    const bindGroupLayouts: GPUBindGroupLayout[] = []
    let staticGroup, pingPongGroupAB, pingPongGroupBA, canvasLayout

    if (staticResources.length > 0) {
        const static_layout = device.createBindGroupLayout({
            entries: shader.staticResources.map((r, i) =>
                createLayoutEntry(r, i, GPUShaderStage.COMPUTE)
            )
        })
        bindGroupLayouts.push(static_layout)

        staticGroup = device.createBindGroup({
            layout: static_layout,
            entries: shader.staticResources.map((r, i) => ({
                binding: i,
                resource: {
                    buffer: buffers.get(getName(r))!
                }
            }))
        })
    }

    if (pingPongResources.length > 0) {
        const ping_pong_layout = device.createBindGroupLayout({
            entries: pingPongResources.flatMap((_, i) => {
                const { entry1, entry2 } = createPingPongLayoutEntries(2 * i)
                return [entry1, entry2]
            })
        })
        bindGroupLayouts.push(ping_pong_layout)

        pingPongGroupAB = device.createBindGroup({
            layout: ping_pong_layout,
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

        pingPongGroupBA = device.createBindGroup({
            layout: ping_pong_layout,
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

    if (shader.canvas) {
        canvasLayout = createCanvasLayout(device, canvas_color_format)
        bindGroupLayouts.push(canvasLayout)
    }

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts
    })
    const { module } = await compileShaderCode(device, shader.code)

    return {
        pipelineLayout,
        pipeline: device.createComputePipeline({
            label: shader.name,
            layout: pipelineLayout,
            compute: {
                module
            }
        }),
        staticGroup,
        pingPongGroupAB,
        pingPongGroupBA,
        canvasLayout
    }
}

export async function compileRenderShader(
    device: GPUDevice,
    buffers: Map<string, GPUBuffer>,
    canvas_color_format: GPUTextureFormat,
    shader: LinkedRenderShader
): Promise<CompiledRenderShader> {
    const { resources } = shader

    const bindGroupLayouts: GPUBindGroupLayout[] = []
    let bind_group

    if (resources.length > 0) {
        const static_layout = device.createBindGroupLayout({
            entries: shader.resources.map((r, i) =>
                createLayoutEntry(r, i, GPUShaderStage.COMPUTE)
            )
        })
        bindGroupLayouts.push(static_layout)

        bind_group = device.createBindGroup({
            layout: static_layout,
            entries: shader.resources.map((r, i) => ({
                binding: i,
                resource: {
                    buffer: buffers.get(getName(r))!
                }
            }))
        })
    }

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts
    })
    const { module } = await compileShaderCode(device, shader.code)

    return {
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
        indexBuffer: buffers.get(shader.indexBuffer.name)!,
        bindGroup: bind_group
    }
}
