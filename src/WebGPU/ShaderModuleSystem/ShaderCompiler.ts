import {
    canvasLayout,
    compileShader,
    createLayoutEntry,
    createPingPongLayoutEntries
} from './Compiler'
import { getName } from './Linker'
import { ResolvedComputePipeline, ResolvedRenderPipeline } from './Resolved'

export interface ComputePassData {
    pipeline_layout: GPUPipelineLayout
    pipeline: GPUComputePipeline
    static_group?: GPUBindGroup
    ping_pong_group_AB?: GPUBindGroup
    ping_pong_group_BA?: GPUBindGroup
    canvas_layout?: GPUBindGroupLayout
}

export interface RenderPassData {
    pipeline_layout: GPUPipelineLayout
    pipeline: GPURenderPipeline
    indexBuffer: GPUBuffer
    bind_group?: GPUBindGroup
}

export async function buildComputeShader(
    device: GPUDevice,
    buffers: Map<string, GPUBuffer>,
    canvas_color_format: GPUTextureFormat,
    shader_info: ResolvedComputePipeline
): Promise<ComputePassData> {
    const { staticResources, pingPongResources } = shader_info

    const bindGroupLayouts: GPUBindGroupLayout[] = []
    let static_group, ping_pong_group_AB, ping_pong_group_BA, canvas_layout

    if (staticResources.length > 0) {
        const static_layout = device.createBindGroupLayout({
            entries: shader_info.staticResources.map((r, i) =>
                createLayoutEntry(r, i, GPUShaderStage.COMPUTE)
            )
        })
        bindGroupLayouts.push(static_layout)

        static_group = device.createBindGroup({
            layout: static_layout,
            entries: shader_info.staticResources.map((r, i) => ({
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
                const { entry1, entry2 } = createPingPongLayoutEntries(
                    2 * i,
                    GPUShaderStage.COMPUTE
                )
                return [entry1, entry2]
            })
        })
        bindGroupLayouts.push(ping_pong_layout)

        ping_pong_group_AB = device.createBindGroup({
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

        ping_pong_group_BA = device.createBindGroup({
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

    if (shader_info.canvas) {
        canvas_layout = canvasLayout(device, canvas_color_format)
        bindGroupLayouts.push(canvas_layout)
    }

    const pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts
    })
    const { module } = await compileShader(device, shader_info.code)

    return {
        pipeline_layout: pipeline_layout,
        pipeline: device.createComputePipeline({
            label: shader_info.name,
            layout: pipeline_layout,
            compute: {
                module
            }
        }),
        static_group,
        ping_pong_group_AB,
        ping_pong_group_BA,
        canvas_layout
    }
}

export async function buildRenderPipeline(
    device: GPUDevice,
    buffers: Map<string, GPUBuffer>,
    canvas_color_format: GPUTextureFormat,
    shader_info: ResolvedRenderPipeline
): Promise<RenderPassData> {
    const { resources } = shader_info

    const bindGroupLayouts: GPUBindGroupLayout[] = []
    let bind_group

    if (resources.length > 0) {
        const static_layout = device.createBindGroupLayout({
            entries: shader_info.resources.map((r, i) =>
                createLayoutEntry(r, i, GPUShaderStage.COMPUTE)
            )
        })
        bindGroupLayouts.push(static_layout)

        bind_group = device.createBindGroup({
            layout: static_layout,
            entries: shader_info.resources.map((r, i) => ({
                binding: i,
                resource: {
                    buffer: buffers.get(getName(r))!
                }
            }))
        })
    }

    const pipeline_layout = device.createPipelineLayout({
        bindGroupLayouts
    })
    const { module } = await compileShader(device, shader_info.code)

    return {
        pipeline_layout: pipeline_layout,
        pipeline: device.createRenderPipeline({
            label: shader_info.name,
            layout: pipeline_layout,
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
                topology: shader_info.primitiveTopology
            }
        }),
        indexBuffer: buffers.get(shader_info.indexBuffer.name)!,
        bind_group: bind_group
    }
}
