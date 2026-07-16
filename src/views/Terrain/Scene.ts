import Engine, { WG_DIM } from '@/WebGPU/Engine'

import {
    type Setup,
    noiseShader,
    display2DShader,
    colorShader,
    display3DShader,
    vertexIndexShader,
} from './Shader'
import {
    createNoiseLayout,
    createTerrainLayout,
    createUniformsLayout,
    createCanvasLayout,
    createIndexBufferLayout,
} from './Layout'
import { generateUnitVectors2D, generateUnitVectors3D } from '@/Noise/UnitVectors'
import type { Mat4x4 } from '@/WebGPU/Geometry'

export default class TerrainScene {
    setup!: Setup
    engine!: Engine

    n_workgroups_x!: number
    n_workgroups_y!: number

    vertex_index_pipeline!: GPUComputePipeline
    noise_pipeline!: GPUComputePipeline
    erosion_pipeline!: GPUComputePipeline
    color_pipeline!: GPUComputePipeline
    display_2D_pipeline!: GPUComputePipeline
    display_3D_pipeline!: GPURenderPipeline

    noise_layout!: GPUBindGroupLayout
    noise_group!: GPUBindGroup
    unit_vectors_2D!: GPUBuffer
    unit_vectors_3D!: GPUBuffer

    vertex_index!: GPUBuffer

    terrain_A!: GPUBuffer
    terrain_B!: GPUBuffer
    terrain_layout!: GPUBindGroupLayout
    terrain_group_AB!: GPUBindGroup
    terrain_group_BA!: GPUBindGroup

    uniforms_layout!: GPUBindGroupLayout
    uniforms_group!: GPUBindGroup
    light!: GPUBuffer
    camera!: GPUBuffer

    canvas_layout!: GPUBindGroupLayout

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.setup = setup
        canvas.width = setup.terrain_dims[0]
        canvas.height = setup.terrain_dims[1]

        this.n_workgroups_x = Math.ceil(this.setup.terrain_dims[0] / WG_DIM)
        this.n_workgroups_y = Math.ceil(this.setup.terrain_dims[1] / WG_DIM)

        const engine = new Engine()
        this.engine = engine
        await engine.init(canvas)

        this.noise_layout = createNoiseLayout(engine.device)
        this.terrain_layout = createTerrainLayout(engine.device)
        this.uniforms_layout = createUniformsLayout(engine.device)
        this.canvas_layout = createCanvasLayout(engine.device, engine.canvas_color_format)

        await this.createNoiseShader()
        await this.createColorShader()
        await this.createDisplay2DShader()
        await this.createDisplay3DShader()

        this.unit_vectors_2D = engine.createStorageBuffer(generateUnitVectors2D(16))
        this.unit_vectors_3D = engine.createStorageBuffer(generateUnitVectors3D(64))

        this.noise_group = engine.device.createBindGroup({
            layout: this.noise_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.unit_vectors_2D },
                },
                {
                    binding: 1,
                    resource: { buffer: this.unit_vectors_3D },
                },
            ],
        })

        const terrain_w = setup.terrain_dims[0]
        const terrain_h = setup.terrain_dims[1]
        const n_bytes = terrain_w * terrain_h * 64

        this.terrain_A = this.engine.createStorageBuffer(null, n_bytes)
        this.terrain_B = this.engine.createStorageBuffer(null, n_bytes)

        this.terrain_group_AB = engine.device.createBindGroup({
            layout: this.terrain_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.terrain_A },
                },
                {
                    binding: 1,
                    resource: { buffer: this.terrain_B },
                },
            ],
        })

        this.terrain_group_BA = engine.device.createBindGroup({
            layout: this.terrain_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.terrain_B },
                },
                {
                    binding: 1,
                    resource: { buffer: this.terrain_A },
                },
            ],
        })

        this.light = engine.createUniformBuffer(
            new Float32Array([...setup.light_dir, setup.ambient_intensity]),
        )
        this.camera = engine.createUniformBuffer(
            new Float32Array([...setup.camera_pos, 0, ...setup.camera_projection_view.toWebGPU()]),
        )
        this.uniforms_group = engine.device.createBindGroup({
            layout: this.uniforms_layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.light },
                },
                {
                    binding: 1,
                    resource: { buffer: this.camera },
                },
            ],
        })
        await this.createIndexBuffer()
        this.renderNoise(setup.render_3D)
    }

    private async createIndexBuffer() {
        const terrain_w = this.setup.terrain_dims[0]
        const terrain_h = this.setup.terrain_dims[1]
        const n_vertices = (terrain_w - 1) * (terrain_h - 1) * 6

        const device = this.engine.device

        this.vertex_index = this.engine.createBuffer(
            null,
            n_vertices * 4,
            GPUBufferUsage.STORAGE | GPUBufferUsage.INDEX,
        )
        const layout = createIndexBufferLayout(device)

        const group = device.createBindGroup({
            layout: layout,
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.vertex_index },
                },
            ],
        })

        const { module } = await this.engine.compileShader(vertexIndexShader(this.setup))

        const pipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts: [layout],
            }),
            compute: {
                module: module,
            },
        })

        const cmd_encoder = device.createCommandEncoder()

        const pass_encoder = cmd_encoder.beginComputePass()
        pass_encoder.setPipeline(pipeline)
        pass_encoder.setBindGroup(0, group)
        this.encodeCompute(pass_encoder)
        pass_encoder.end()

        device.queue.submit([cmd_encoder.finish()])
    }

    private async createNoiseShader() {
        const { module, issues } = await this.engine.compileShader(noiseShader(this.setup))

        this.noise_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.noise_layout, this.terrain_layout],
            }),
            compute: {
                module: module,
            },
        })
        return issues
    }

    private async createColorShader() {
        const { module, issues } = await this.engine.compileShader(colorShader(this.setup))

        this.color_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.noise_layout, this.terrain_layout],
            }),
            compute: {
                module: module,
            },
        })
        return issues
    }

    private async createDisplay2DShader() {
        const { module } = await this.engine.compileShader(
            display2DShader(this.setup, this.engine.canvas_color_format),
        )
        this.display_2D_pipeline = this.engine.device.createComputePipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.canvas_layout, this.terrain_layout, this.uniforms_layout],
            }),
            compute: {
                module: module,
            },
        })
    }

    private async createDisplay3DShader() {
        const { module } = await this.engine.compileShader(
            display3DShader(this.setup, this.engine.canvas_color_format),
        )
        this.display_3D_pipeline = this.engine.device.createRenderPipeline({
            layout: this.engine.device.createPipelineLayout({
                bindGroupLayouts: [this.terrain_layout, this.uniforms_layout],
            }),
            vertex: {
                module: module,
                entryPoint: 'vertex_main',
            },
            fragment: {
                module: module,
                entryPoint: 'vertex_main',
                targets: [
                    {
                        format: this.engine.canvas_color_format,
                    },
                ],
            },
            primitive: {
                topology: 'triangle-list',
            },
        })
    }

    private encodeCompute(encoder: GPUComputePassEncoder) {
        encoder.dispatchWorkgroups(this.n_workgroups_x, this.n_workgroups_y)
    }

    private computePass(
        encoder: GPUCommandEncoder,
        pipeline: GPUComputePipeline,
        terrain_group: GPUBindGroup,
    ) {
        const pass_encoder = encoder.beginComputePass()
        pass_encoder.setPipeline(pipeline)
        pass_encoder.setBindGroup(0, this.noise_group)
        pass_encoder.setBindGroup(1, terrain_group)
        this.encodeCompute(pass_encoder)
        pass_encoder.end()
    }

    private display2DPass(encoder: GPUCommandEncoder, terrain_group: GPUBindGroup) {
        const texture = this.engine.getTexture()
        const canvas_group = this.engine.device.createBindGroup({
            layout: this.canvas_layout,
            entries: [
                {
                    binding: 0,
                    resource: texture.createView(),
                },
            ],
        })

        const pass_encoder = encoder.beginComputePass()
        pass_encoder.setPipeline(this.display_2D_pipeline)
        pass_encoder.setBindGroup(0, canvas_group)
        pass_encoder.setBindGroup(1, terrain_group)
        pass_encoder.setBindGroup(2, this.uniforms_group)

        this.encodeCompute(pass_encoder)
        pass_encoder.end()
    }

    private display3DPass(encoder: GPUCommandEncoder, terrain_group: GPUBindGroup) {
        const pass_encoder = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.engine.getTexture().createView(),
                    clearValue: [0, 0, 0, 1],
                    loadOp: 'clear',
                    storeOp: 'store',
                },
            ],
        })
        pass_encoder.setPipeline(this.display_3D_pipeline)
        pass_encoder.setBindGroup(0, terrain_group)
        pass_encoder.setBindGroup(1, this.uniforms_group)

        const terrain_w = this.setup.terrain_dims[0]
        const terrain_h = this.setup.terrain_dims[1]
        const n_vertices = (terrain_w - 1) * (terrain_h - 1) * 6

        pass_encoder.setIndexBuffer(this.vertex_index, 'uint32')
        pass_encoder.drawIndexed(n_vertices)

        pass_encoder.end()
    }

    private renderNoise(render_3D: boolean) {
        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()
        this.computePass(cmd_encoder, this.noise_pipeline, this.terrain_group_AB)
        this.computePass(cmd_encoder, this.color_pipeline, this.terrain_group_BA)

        if (render_3D) {
            this.display3DPass(cmd_encoder, this.terrain_group_AB)
        } else {
            this.display2DPass(cmd_encoder, this.terrain_group_AB)
        }
        device.queue.submit([cmd_encoder.finish()])
    }

    private renderColor(render_3D: boolean) {
        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()
        this.computePass(cmd_encoder, this.color_pipeline, this.terrain_group_BA)

        if (render_3D) {
            this.display3DPass(cmd_encoder, this.terrain_group_AB)
        } else {
            this.display2DPass(cmd_encoder, this.terrain_group_AB)
        }
        device.queue.submit([cmd_encoder.finish()])
    }

    renderDisplay(render_3D: boolean) {
        const device = this.engine.device
        const cmd_encoder = device.createCommandEncoder()

        if (render_3D) {
            this.display3DPass(cmd_encoder, this.terrain_group_AB)
        } else {
            this.display2DPass(cmd_encoder, this.terrain_group_AB)
        }
        device.queue.submit([cmd_encoder.finish()])
    }

    setLight(dir: number[], ambient_intensity: number, render_3D: boolean) {
        this.setup.light_dir = dir
        this.setup.ambient_intensity = ambient_intensity

        this.engine.updateBuffer(
            this.light,
            new Float32Array([...this.setup.light_dir, this.setup.ambient_intensity]),
        )
        this.renderDisplay(render_3D)
    }

    setCamera(pos: number[], projection_view: Mat4x4) {
        this.setup.camera_pos = pos
        this.setup.camera_projection_view = projection_view

        this.engine.updateBuffer(
            this.camera,
            new Float32Array([
                ...this.setup.camera_pos,
                0,
                ...this.setup.camera_projection_view.toWebGPU(),
            ]),
        )
        this.renderDisplay(true)
    }

    async updateNoiseShader(code: string, render_3D: boolean) {
        this.setup.noise_shader = code

        const issues = await this.createNoiseShader()
        if (issues.length === 0) {
            this.renderNoise(render_3D)
        }
        return issues
    }

    async updateColorShader(code: string, render_3D: boolean) {
        this.setup.color_shader = code

        const issues = await this.createColorShader()
        if (issues.length === 0) {
            this.renderColor(render_3D)
        }
        return issues
    }

    cleanup() {
        this.engine?.cleanup()
        this.light?.destroy()
        this.unit_vectors_2D?.destroy()
        this.unit_vectors_3D?.destroy()
        this.terrain_A?.destroy()
        this.terrain_B?.destroy()
        this.vertex_index?.destroy()
    }
}
