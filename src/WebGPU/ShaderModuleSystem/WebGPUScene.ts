import { createBuffer, requestDevice } from './Compiler'
import {
    ComputePassData,
    RenderPassData,
    buildComputeShader,
    buildRenderPipeline
} from './ShaderCompiler'
import { link } from './Linker'
import { Shader } from './UserInput'

export interface ComputeExecution {
    kind: 'Compute'
    name: string
    n_workgroups: {
        x: number
        y?: number
        z?: number
    }
    n_ping_pongs?: number
    ping_pong_flag?: boolean
}

export interface RenderExecution {
    kind: 'Render'
    name: string
    n_indexes: number
    n_instances?: number
}

export type ShaderExecution = ComputeExecution | RenderExecution

export default class WebGPUScene {
    device!: GPUDevice
    canvas!: HTMLCanvasElement
    context!: GPUCanvasContext
    canvas_color_format!: GPUTextureFormat

    buffers = new Map<string, GPUBuffer>()
    compute_pipelines = new Map<string, ComputePassData>()
    render_pipelines = new Map<string, RenderPassData>()

    /* Initialization */

    async initScene(canvas: HTMLCanvasElement, shader_passes: Shader[]) {
        const resolved = link(shader_passes)
        let canvas_usage = 0

        if (resolved.computePipelines.length > 0) {
            canvas_usage |= GPUTextureUsage.STORAGE_BINDING
        }
        if (resolved.renderPipelines.length > 0) {
            canvas_usage |= GPUTextureUsage.RENDER_ATTACHMENT
        }

        await this.initDevice(canvas, canvas_usage)

        for (const [name, buffer] of resolved.buffers) {
            this.buffers.set(name, createBuffer(this.device, buffer))
        }

        resolved.computePipelines.forEach(async (shader_info) => {
            this.compute_pipelines.set(
                shader_info.name,
                await buildComputeShader(
                    this.device,
                    this.buffers,
                    this.canvas_color_format,
                    shader_info
                )
            )
        })
        resolved.renderPipelines.forEach(async (shader_info) => {
            this.render_pipelines.set(
                shader_info.name,
                await buildRenderPipeline(
                    this.device,
                    this.buffers,
                    this.canvas_color_format,
                    shader_info
                )
            )
        })
    }

    async initDevice(
        canvas: HTMLCanvasElement,
        canvas_usage: GPUFlagsConstant
    ) {
        const { device, supportedFeatures } = await requestDevice([
            'bgra8unorm-storage'
        ])
        this.device = device

        const context = canvas.getContext('webgpu')
        if (!context) {
            throw Error('WebGPU not supported!')
        }
        this.canvas = canvas
        this.context = context
        this.canvas_color_format = supportedFeatures.includes(
            'bgra8unorm-storage'
        )
            ? navigator.gpu.getPreferredCanvasFormat()
            : 'rgba8unorm'

        context.configure({
            device: this.device,
            format: this.canvas_color_format,
            usage: canvas_usage
        })
    }

    /* Run shader stages */

    execute(commands: ShaderExecution[]) {
        const cmd_encoder = this.device.createCommandEncoder()

        for (const command of commands) {
            switch (command.kind) {
                case 'Compute': {
                    const shader_data = this.compute_pipelines.get(
                        command.name
                    )!
                    const { x, y, z } = command.n_workgroups

                    const pass_encoder = cmd_encoder.beginComputePass()
                    pass_encoder.setPipeline(shader_data.pipeline)

                    let ping_pong_index = 0
                    let canvas_index = 0

                    if (shader_data.static_group) {
                        pass_encoder.setBindGroup(0, shader_data.static_group)
                        ping_pong_index++
                        canvas_index++
                    }
                    if (shader_data.ping_pong_group_BA) {
                        canvas_index++
                    }
                    if (shader_data.canvas_layout) {
                        const texture = this.context.getCurrentTexture()
                        const canvas_bind_group = this.device.createBindGroup({
                            layout: shader_data.canvas_layout,
                            entries: [
                                {
                                    binding: 0,
                                    resource: texture.createView()
                                }
                            ]
                        })
                        pass_encoder.setBindGroup(
                            canvas_index,
                            canvas_bind_group
                        )
                    }
                    if (shader_data.ping_pong_group_BA) {
                        let current_flag = command.ping_pong_flag || false
                        for (let i = 0; i < (command.n_ping_pongs || 1); i++) {
                            current_flag = !current_flag
                            if (current_flag) {
                                pass_encoder.setBindGroup(
                                    ping_pong_index,
                                    shader_data.ping_pong_group_AB
                                )
                            } else {
                                pass_encoder.setBindGroup(
                                    ping_pong_index,
                                    shader_data.ping_pong_group_BA
                                )
                            }
                            pass_encoder.dispatchWorkgroups(x, y, z)
                        }
                    } else {
                        pass_encoder.dispatchWorkgroups(x, y, z)
                    }
                    break
                }
                case 'Render':
                    const shader_data = this.render_pipelines.get(command.name)!

                    const main_texture = this.context.getCurrentTexture()
                    const depth_texture = this.createDepthTexture(
                        main_texture.width,
                        main_texture.height
                    )
                    const depth_attachment =
                        this.createDepthStencilAttachment(depth_texture)

                    const pass_encoder = cmd_encoder.beginRenderPass({
                        colorAttachments: [
                            {
                                view: main_texture.createView(),
                                clearValue: [0, 0, 0, 1],
                                loadOp: 'clear',
                                storeOp: 'store'
                            }
                        ],
                        depthStencilAttachment: depth_attachment
                    })
                    pass_encoder.setPipeline(shader_data.pipeline)

                    if (shader_data.bind_group) {
                        pass_encoder.setBindGroup(0, shader_data.bind_group)
                    }
                    pass_encoder.setIndexBuffer(
                        shader_data.indexBuffer,
                        'uint32'
                    )
                    pass_encoder.drawIndexed(
                        command.n_indexes,
                        command.n_instances
                    )
                    pass_encoder.end()

                    break
            }
        }

        this.device.queue.submit([cmd_encoder.finish()])
    }

    /* Basic actions with device */

    writeInt(name: string, data: number, offset = 0) {
        this.write(name, new Int32Array([data]).buffer, offset)
    }

    writeUint(name: string, data: number, offset = 0) {
        this.write(name, new Uint32Array([data]).buffer, offset)
    }

    writeFloat(name: string, data: number, offset = 0) {
        this.write(name, new Float32Array([data]).buffer, offset)
    }

    write(name: string, data: ArrayBuffer, offset = 0) {
        const buffer = this.buffers.get(name)!
        this.device.queue.writeBuffer(buffer, offset, data, 0, data.byteLength)
    }

    createDepthStencilState(): GPUDepthStencilState {
        return {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8'
        }
    }

    createDepthTexture(width: number, height: number): GPUTexture {
        return this.device.createTexture({
            size: { width, height },
            dimension: '2d',
            format: 'depth24plus-stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        })
    }

    createDepthStencilAttachment(
        depth_texture: GPUTexture
    ): GPURenderPassDepthStencilAttachment {
        return {
            view: depth_texture.createView(),
            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
            stencilClearValue: 0,
            stencilLoadOp: 'load',
            stencilStoreOp: 'store'
        }
    }

    /* Canvas resizing */

    observer!: ResizeObserver
    pending_resize = {
        width: 0,
        height: 0
    }
    frame_id: number = 0

    watchResize(render_callback: () => void) {
        this.observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const box_width = entry.contentBoxSize[0].inlineSize
                const box_height = entry.contentBoxSize[0].blockSize
                const max_size = this.device.limits.maxTextureDimension2D

                this.pending_resize = {
                    width: Math.min(box_width * devicePixelRatio, max_size),
                    height: Math.min(box_height * devicePixelRatio, max_size)
                }
                if (!this.frame_id) {
                    this.frame_id = requestAnimationFrame(() => {
                        this.frame_id = 0
                        this.canvas.width = this.pending_resize.width
                        this.canvas.height = this.pending_resize.height
                        render_callback()
                    })
                }
            })
        })
        this.observer.observe(this.canvas.parentElement!)
    }

    stopResizeWatch() {
        this.observer?.disconnect()
    }

    setCanvasWidth(n_pixels: number) {
        const aspect_ratio = this.canvas.clientHeight / this.canvas.clientWidth
        const canvas_height = Math.ceil(n_pixels * aspect_ratio)

        this.canvas.width = n_pixels
        this.canvas.height = canvas_height

        return canvas_height
    }

    /* Cleanup */

    destroy() {
        this.context?.unconfigure()
        this.observer?.disconnect()
        for (const [_, buffer] of this.buffers) {
            buffer.destroy()
        }
    }
}
