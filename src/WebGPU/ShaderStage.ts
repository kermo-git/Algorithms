import { createDepthStencilState } from './Resources'
import {
    createCanvasLayout,
    createLayoutEntry,
    createPingPongLayoutEntries
} from './Layout'
import {
    LinkedComputeShader,
    LinkedRenderShader,
    StaticResource
} from './LinkedModules'
import { PingPongBuffers, getName } from './Modules'
import {
    createComputeShaderCode,
    createRenderShaderCode,
    compileShaderCode
} from './ShaderCode'

export interface ComputeStage {
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

export interface RenderStage {
    name: string
    pipelineLayout: GPUPipelineLayout
    pipeline: GPURenderPipeline

    indexBufferName: string
    indexBuffer?: GPUBuffer

    resources?: StaticResource[]
    bindLayout?: GPUBindGroupLayout
    bindGroup?: GPUBindGroup
}

export async function buildComputeStage(
    device: GPUDevice,
    canvas_color_format: GPUTextureFormat,
    shader: LinkedComputeShader
): Promise<ComputeStage> {
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

export function bindComputeStage(
    device: GPUDevice,
    buffers: Map<string, GPUBuffer>,
    compute_stage: ComputeStage
) {
    const {
        name,
        staticResources,
        staticLayout,
        pingPongResources,
        pingPongLayout
    } = compute_stage

    if (staticResources && staticLayout) {
        const bind_group_entries = staticResources.map((r, i) => ({
            binding: i,
            resource: {
                buffer: buffers.get(getName(r))!
            }
        }))

        compute_stage.staticGroup = device.createBindGroup({
            label: `${name}_static_group`,
            layout: staticLayout,
            entries: bind_group_entries
        })
    }

    if (pingPongResources && pingPongLayout) {
        compute_stage.pingPongGroupAB = device.createBindGroup({
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

        compute_stage.pingPongGroupBA = device.createBindGroup({
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

export async function buildRenderStage(
    device: GPUDevice,
    canvas_color_format: GPUTextureFormat,
    shader: LinkedRenderShader
): Promise<RenderStage> {
    const bindGroupLayouts: GPUBindGroupLayout[] = []
    let bindLayout

    if (shader.resources.length > 0) {
        bindLayout = device.createBindGroupLayout({
            label: 'resources',
            entries: shader.resources.map((r, i) => {
                const name = getName(r)
                const visibility = shader.visibility.get(name)!
                return createLayoutEntry(r, i, visibility)
            })
        })
        bindGroupLayouts.push(bindLayout)
    }

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts
    })
    const code = createRenderShaderCode(shader)
    const { module } = await compileShaderCode(device, code)

    const pipeline = device.createRenderPipeline({
        label: shader.name,
        layout: pipelineLayout,
        depthStencil: createDepthStencilState(),
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
    })

    return {
        name: shader.name,
        pipelineLayout,
        pipeline,
        indexBufferName: shader.indexBuffer.name,
        resources: shader.resources,
        bindLayout
    }
}

export function bindRenderStage(
    device: GPUDevice,
    buffers: Map<string, GPUBuffer>,
    render_stage: RenderStage
) {
    const { indexBufferName, resources, bindLayout } = render_stage
    if (resources && bindLayout) {
        render_stage.bindGroup = device.createBindGroup({
            layout: bindLayout,
            entries: resources.map((r, i) => ({
                binding: i,
                resource: {
                    buffer: buffers.get(getName(r))!
                }
            }))
        })
    }
    render_stage.indexBuffer = buffers.get(indexBufferName)!
}
