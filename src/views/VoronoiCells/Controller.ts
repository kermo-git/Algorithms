import WebGPUScene from '@/WebGPU/Scene'

import { createColorData, MainModule, type Setup } from './Shader'
import { parseHexColor } from '@/utils/Colors'

const wg_dim = 8

export default class Controller {
    scene = new WebGPUScene()
    async init(setup: Setup, canvas: HTMLCanvasElement) {
        await this.scene.build(canvas, [MainModule(setup, wg_dim, wg_dim)])
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

    setVoronoiNColumns(value: number) {
        this.scene.writeFloat('parameters', value, 20)
        this.render()
    }

    setColor(index: number, hex_color: string) {
        const { red, green, blue } = parseHexColor(hex_color)
        const data = new Float32Array([red / 255, green / 255, blue / 255, 1])
            .buffer
        this.scene.write('colors', data, 16 + index * 16)
        this.render()
    }

    setAllColors(hex_colors: string[]) {
        this.scene.write('colors', createColorData(hex_colors))
        this.render()
    }

    setNoiseScale(value: number) {
        this.scene.writeFloat('parameters', value, 16)
        this.render()
    }

    setNoiseStrength(value: number) {
        this.scene.writeFloat('parameters', value, 8)
        this.render()
    }

    setNoiseZCoord(value: number) {
        this.scene.writeFloat('parameters', value, 12)
        this.render()
    }

    setNoiseNOctaves(value: number) {
        this.scene.writeUint('parameters', value, 0)
        this.render()
    }

    setNoisePersistence(value: number) {
        this.scene.writeFloat('parameters', value, 4)
        this.render()
    }

    cleanup() {}
}
