import { parseHexColor } from '@/utils/Colors'
import {
    type Setup,
    createShader,
    kernelBufferSize,
    createColorKernelData
} from './Shader'
import WebGPUScene, { WG_DIM } from '@/WebGPU/Scene'
import { ShaderIssue } from '@/WebGPU/ShaderCode'

export class Controller {
    scene = new WebGPUScene()
    ping_pong_flag = true
    n_pixels = 0
    n_workgroups_x = 0
    n_workgroups_y = 0

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.scene.canvas = canvas
        const canvas_height = this.scene.setCanvasWidth(setup.canvas_width)
        const color_kernel_data = createColorKernelData(setup)

        this.n_pixels = setup.canvas_width * canvas_height
        this.n_workgroups_x = Math.ceil(setup.canvas_width / WG_DIM)
        this.n_workgroups_y = Math.ceil(canvas_height / WG_DIM)

        await this.scene.build(canvas, [
            createShader(setup.activation_shader, color_kernel_data, {
                x: setup.canvas_width,
                y: canvas_height
            })
        ])
        this.ping_pong_flag = true
        this.step(1)
    }

    private redraw() {
        this.scene.execute([
            {
                kind: 'Compute',
                name: 'main',
                n_workgroups: {
                    x: this.n_workgroups_x,
                    y: this.n_workgroups_y
                },
                n_ping_pongs: 1,
                ping_pong_flag: this.ping_pong_flag
            }
        ])
    }

    resizeCanvas(canvas_width: number, redraw: boolean) {
        const canvas_height = this.scene.setCanvasWidth(canvas_width)

        this.n_pixels = canvas_width * canvas_height
        this.n_workgroups_x = Math.ceil(canvas_width / WG_DIM)
        this.n_workgroups_y = Math.ceil(canvas_height / WG_DIM)

        this.scene.resizeBuffer('generation_A', 4 * this.n_pixels)
        this.scene.resizeBuffer('generation_B', 4 * this.n_pixels)
        this.scene.rebindComputeResources('main')

        this.reset(redraw)
    }

    reset(redraw: boolean) {
        const random_data = new Float32Array(this.n_pixels).map(
            Math.random
        ).buffer
        this.scene.write('generation_A', random_data)
        this.ping_pong_flag = true

        if (redraw) {
            this.step()
        }
    }

    step(n_generations = 1): void {
        this.scene.execute([
            {
                kind: 'Compute',
                name: 'main',
                n_workgroups: {
                    x: this.n_workgroups_x,
                    y: this.n_workgroups_y
                },
                n_ping_pongs: n_generations,
                ping_pong_flag: this.ping_pong_flag
            }
        ])
        if (n_generations % 2 != 0) {
            this.ping_pong_flag = !this.ping_pong_flag
        }
    }

    async setActivation(activation_shader: string): Promise<ShaderIssue[]> {
        const shader = createShader(activation_shader)
        return this.scene.updateShaderCode(shader)
    }

    setKernel(radius: number, data: number[]) {
        const buffer_data = new ArrayBuffer(kernelBufferSize(radius))

        const radius_view = new Uint32Array(buffer_data, 0, 1)
        radius_view[0] = radius

        const float_view = new Float32Array(buffer_data)
        float_view.set(data, 1)

        this.scene.write('ck', buffer_data, 32)
    }

    setColor1(hex_color: string, redraw: boolean) {
        const { red, green, blue } = parseHexColor(hex_color)
        const shader_data = new Float32Array([
            red / 255,
            green / 255,
            blue / 255
        ]).buffer
        this.scene.write('ck', shader_data)

        if (redraw) {
            this.redraw()
        }
    }

    setColor2(hex_color: string, redraw: boolean) {
        const { red, green, blue } = parseHexColor(hex_color)
        const shader_data = new Float32Array([
            red / 255,
            green / 255,
            blue / 255
        ]).buffer
        this.scene.write('ck', shader_data, 16)

        if (redraw) {
            this.redraw()
        }
    }

    destroy(): void {
        this.scene.destroy()
    }
}
