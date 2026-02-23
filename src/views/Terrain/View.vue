<script setup lang="ts">
import { ref, shallowRef, useTemplateRef } from 'vue'

import CodeEditor from '@/components/CodeEditor.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import VBox from '@/components/VBox.vue'
import { examples } from './Examples'
import TerrainScene from './Scene'
import PanelButton from '@/components/PanelButton.vue'
import { mdiPlay } from '@mdi/js'
import HBox from '@/components/HBox.vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const scene = shallowRef(new TerrainScene())

const start_elevation_editor = useTemplateRef('start_elevation_editor')
const start_elevation_shader = ref(examples[0].start_elevation_shader)

const color_editor = useTemplateRef('color_editor')
const color_shader = ref(examples[0].color_shader)

async function canvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    await initScene()
}

async function initScene() {
    if (canvasRef.value) {
        scene.value.cleanup()
        await scene.value.init(
            {
                start_elevation_shader: start_elevation_shader.value,
                color_shader: color_shader.value,
                n_pixels_x: 1024,
                n_pixels_y: 1024,
                n_grid_cells_x: 16,
                n_grid_cells_y: 16,
            },
            canvasRef.value,
        )
        scene.value.renderNoise()
    }
}

function runTerrainElevation() {
    if (start_elevation_editor.value) {
        const code = start_elevation_editor.value.getCode()
        scene.value.updateStartElevationShader(code)
        scene.value.renderNoise()
    }
}

function runColor() {
    if (color_editor.value) {
        const code = color_editor.value.getCode()
        scene.value.updateColorShader(code)
        scene.value.renderColor()
    }
}
</script>

<template>
    <SidePanelCanvas :tab-captions="['Base elevation', 'Erosion']" @canvas-ready="canvasReady">
        <VBox>
            <HBox>
                <p>Terrain elevation before erosion</p>
                <PanelButton text="Run" :mdi-path="mdiPlay" @click="runTerrainElevation" />
            </HBox>
        </VBox>
        <CodeEditor ref="start_elevation_editor" :code="start_elevation_shader" />

        <VBox>
            <HBox>
                <p>Terrain color</p>
                <PanelButton text="Run" :mdi-path="mdiPlay" @click="runColor" />
            </HBox>
        </VBox>
        <CodeEditor ref="color_editor" :code="start_elevation_shader" />
    </SidePanelCanvas>
</template>
