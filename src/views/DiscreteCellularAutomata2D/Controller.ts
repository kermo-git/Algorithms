import WebGPUScene, { WG_DIM } from '@/WebGPU/ShaderModuleSystem/WebGPUScene'
import { ShaderIssue } from '@/WebGPU/ShaderModuleSystem/Compiler'

import {
    createCanvasData,
    createShader,
    createStateData,
    type Setup
} from './Shader'
import { lerpColorArray } from '@/utils/Colors'

export class Controller {
    scene = new WebGPUScene()
    ping_pong_flag = true
    n_workgroups_x = 0
    n_workgroups_y = 0
    n_pixels = 0

    n_states = 0
    hex_colors: string[] = []

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        this.scene.canvas = canvas
        const canvas_height = this.scene.setCanvasWidth(setup.canvas_width)

        this.n_workgroups_x = Math.ceil(setup.canvas_width / WG_DIM)
        this.n_workgroups_y = Math.ceil(canvas_height / WG_DIM)
        this.n_pixels = setup.canvas_width * canvas_height

        this.n_states = setup.n_states
        this.hex_colors = setup.hex_colors

        const state_data = createStateData(setup.n_states, setup.hex_colors)
        const canvas_data = createCanvasData(setup.n_states, this.n_pixels)

        await this.scene.compileScene(canvas, [
            createShader(
                setup.update_shader,
                setup.max_n_states,
                state_data,
                canvas_data
            )
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
        this.scene.rebindComputeShader('main')

        this.reset(redraw)
    }

    reset(redraw: boolean) {
        const random_data = createCanvasData(this.n_states, this.n_pixels)
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

    setUpdateRule(shader_code: string): Promise<ShaderIssue[]> {
        const shader = createShader(shader_code)
        return this.scene.updateShaderCode(shader)
    }

    setNStates(n_states: number, redraw: boolean) {
        this.n_states = n_states
        const state_data = createStateData(n_states, this.hex_colors)
        this.scene.write('states', state_data)
        this.reset(redraw)
    }

    updateAllColors(hex_colors: string[], redraw: boolean) {
        this.hex_colors = hex_colors
        const colors = lerpColorArray(hex_colors, this.n_states).buffer
        this.scene.write('states', colors, 16)
        if (redraw) {
            this.redraw()
        }
    }

    updateSingleColor(i: number, hex_color: string, redraw: boolean) {
        this.hex_colors[i] = hex_color
        const colors = lerpColorArray(this.hex_colors, this.n_states).buffer
        this.scene.write('states', colors, 16)
        if (redraw) {
            this.redraw()
        }
    }

    destroy() {
        this.scene.destroy()
    }
}
