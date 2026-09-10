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

    updateGridDimensions(n_columns: number) {}

    updateNMainOctaves(value: number) {}

    updatePersistence(value: number) {}

    updateZCoord(value: number) {}

    updateWCoord(value: number) {}

    updateNWarpOctaves(value: number) {}

    updateWarpStrength(value: number) {}

    updateColor(index: number, hex_color: string) {}

    updateColorPoint(index: number, value: number) {}

    updateColorData(colors: string[], points: number[]) {}

    cleanup() {}
}
