import WebGPUScene from '@/WebGPU/ShaderModuleSystem/WebGPUScene'
import { createColorData, MainModule, type Setup } from './Shader'
import { parseHexColor } from '@/utils/Colors'

const wg_dim = 8

export default class Controller {
    setup!: Setup
    scene = new WebGPUScene()
    n_workgroups!: number

    async init(setup: Setup, canvas: HTMLCanvasElement) {
        await this.scene.compileScene(canvas, [
            MainModule(setup, wg_dim, wg_dim)
        ])
        this.scene.watchResize(() => this.render())
    }

    render(): void {
        const texture = this.scene.context.getCurrentTexture()

        this.scene.execute([
            {
                kind: 'Compute',
                name: 'main',
                n_workgroups: {
                    x: Math.ceil(texture.width / wg_dim),
                    y: Math.ceil(texture.height / wg_dim)
                }
            }
        ])
    }

    setNMainOctaves(value: number) {
        this.scene.writeInt('parameters', value, 0)
        this.render()
    }

    setNWarpOctaves(value: number) {
        this.scene.writeInt('parameters', value, 4)
        this.render()
    }

    setWarpStrength(value: number) {
        this.scene.writeFloat('parameters', value, 8)
        this.render()
    }

    setPersistence(value: number) {
        this.scene.writeFloat('parameters', value, 12)
        this.render()
    }

    setLacunarity(value: number) {
        this.scene.writeFloat('parameters', value, 16)
        this.render()
    }

    setNGridColumns(value: number) {
        this.scene.writeFloat('parameters', value, 20)
        this.render()
    }

    setZCoord(value: number) {
        this.scene.writeFloat('parameters', value, 24)
        this.render()
    }

    setWCoord(value: number) {
        this.scene.writeFloat('parameters', value, 28)
        this.render()
    }

    setColor(index: number, hex_color: string) {
        const { red, green, blue } = parseHexColor(hex_color)
        const data = new Float32Array([red / 255, green / 255, blue / 255])
        this.scene.write('color_points', data.buffer, 16 + index * 16)
        this.render()
    }

    setColorPoint(index: number, value: number) {
        this.scene.writeFloat('color_points', value, 28 + index * 16)
        this.render()
    }

    setAllColors(colors: string[], points: number[]) {
        this.scene.write('color_points', createColorData(colors, points))
        this.render()
    }

    cleanup() {
        this.scene.destroy()
    }
}
