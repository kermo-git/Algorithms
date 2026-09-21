import WebGPUScene, { ShaderExecution, WG_DIM } from '@/WebGPU/Scene'
import { Mat4x4, Vec2, Vec3 } from '@/WebGPU/Geometry'

import {
    type Setup,
    NoiseShader,
    Display2DShader,
    ColorShader,
    Display3DShader,
    VertexIndexShader,
    createProjection
} from './Shader'

export default class Controller {
    scene = new WebGPUScene()

    terrain_dims: Vec2 = { x: 0, y: 0 }
    grid_dims: Vec2 = { x: 0, y: 0 }
    render_3D = false
    n_workgroups_x!: number
    n_workgroups_y!: number
    view_matrix!: Mat4x4

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.terrain_dims = setup.terrain_dims
        this.grid_dims = setup.grid_dims
        this.render_3D = setup.render_3D
        this.view_matrix = setup.camera_view_matrix

        this.scene.canvas = canvas
        this.scene.setCanvasWidth(this.terrain_dims.x)
        const aspect_ratio = canvas.width / canvas.height

        await this.scene.compileScene(canvas, [
            VertexIndexShader(setup.terrain_dims),
            NoiseShader(
                setup.terrain_dims,
                setup.grid_dims,
                setup.noise_shader
            ),
            ColorShader(
                setup.terrain_dims,
                setup.grid_dims,
                setup.color_shader
            ),
            Display2DShader(setup, aspect_ratio),
            Display3DShader(setup, aspect_ratio)
        ])

        this.n_workgroups_x = Math.ceil(this.terrain_dims.x / WG_DIM)
        this.n_workgroups_y = Math.ceil(this.terrain_dims.y / WG_DIM)

        this.scene.execute([
            {
                kind: 'Compute',
                name: 'vertex_index',
                n_workgroups: {
                    x: this.n_workgroups_x,
                    y: this.n_workgroups_y
                }
            }
        ])
        this.renderNoise()
        this.scene.watchResize(() => this.renderDisplay())
    }

    private noiseCommand(): ShaderExecution {
        return {
            kind: 'Compute',
            name: 'noise',
            ping_pong_flag: true,
            n_workgroups: {
                x: this.n_workgroups_x,
                y: this.n_workgroups_y
            }
        }
    }

    private colorCommand(): ShaderExecution {
        return {
            kind: 'Compute',
            name: 'color',
            ping_pong_flag: false,
            n_workgroups: {
                x: this.n_workgroups_x,
                y: this.n_workgroups_y
            }
        }
    }

    private display2DCommand(): ShaderExecution {
        const texture = this.scene.context.getCurrentTexture()

        return {
            kind: 'Compute',
            name: 'display_2D',
            ping_pong_flag: true,
            n_workgroups: {
                x: Math.ceil(texture.width / WG_DIM),
                y: Math.ceil(texture.height / WG_DIM)
            }
        }
    }

    private display3DCommand(): ShaderExecution {
        const n_vertices =
            6 * (this.terrain_dims.x - 1) * (this.terrain_dims.y - 1)
        return {
            kind: 'Render',
            name: 'display_3D',
            n_indexes: n_vertices
        }
    }

    private renderNoise() {
        const commands: ShaderExecution[] = [
            this.noiseCommand(),
            this.colorCommand()
        ]

        if (this.render_3D) {
            commands.push(this.display3DCommand())
        } else {
            commands.push(this.display2DCommand())
        }

        this.scene.execute(commands)
    }

    private renderColor() {
        const commands: ShaderExecution[] = [this.colorCommand()]

        if (this.render_3D) {
            commands.push(this.display3DCommand())
        } else {
            commands.push(this.display2DCommand())
        }

        this.scene.execute(commands)
    }

    renderDisplay() {
        if (this.render_3D) {
            const texture = this.scene.context.getCurrentTexture()
            const aspect_ratio = texture.width / texture.height

            const projection = createProjection(aspect_ratio)
            const projection_view = projection
                .matmul(this.view_matrix)
                .toWebGPU().buffer

            this.scene.write('render_setup', projection_view, 16)
            this.scene.execute([this.display3DCommand()])
        } else {
            this.scene.execute([this.display2DCommand()])
        }
    }

    setLightDir(dir: Vec3) {
        this.scene.write(
            'render_setup',
            new Float32Array([dir.x, dir.y, dir.z]).buffer
        )
        this.renderDisplay()
    }

    setAmbientIntensity(ambient_intensity: number) {
        this.scene.writeFloat('render_setup', ambient_intensity, 12)
        this.renderDisplay()
    }

    setCamera(view_matrix: Mat4x4) {
        this.view_matrix = view_matrix
        this.renderDisplay()
    }

    setRender3D(render_3D: boolean) {
        this.render_3D = render_3D
        this.renderDisplay()
    }

    async setNoiseFunction(code: string) {
        const issues = await this.scene.updateShaderCode(
            NoiseShader(this.terrain_dims, this.grid_dims, code)
        )
        if (issues.length === 0) {
            this.renderNoise()
        }
        return issues
    }

    async setColorFunction(code: string) {
        const issues = await this.scene.updateShaderCode(
            ColorShader(this.terrain_dims, this.grid_dims, code)
        )
        if (issues.length === 0) {
            this.renderColor()
        }
        return issues
    }

    destroy() {
        this.scene.destroy()
    }
}
