<script setup lang="ts">
import { mdiPlay } from '@mdi/js'
import { ref, shallowRef, useTemplateRef } from 'vue'

import type { ShaderIssue } from '@/WebGPU/Engine'
import CodeEditor from '@/components/CodeEditor.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import VBox from '@/components/VBox.vue'
import PanelButton from '@/components/PanelButton.vue'
import HBox from '@/components/HBox.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'

import { examples } from './Examples'
import TerrainScene from './Scene'

const active_tab = ref('Start elevation')
const shader_issues = ref<ShaderIssue[]>([])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const scene = shallowRef(new TerrainScene())

const n_grid_columns = ref(4)
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
                n_grid_cells_x: n_grid_columns.value,
                n_grid_cells_y: n_grid_columns.value,
            },
            canvasRef.value,
        )
        scene.value.renderNoise()
    }
}

async function runTerrainElevation() {
    if (start_elevation_editor.value) {
        const code = start_elevation_editor.value.getCode()
        shader_issues.value = await scene.value.updateStartElevationShader(code)
        scene.value.renderNoise()
    }
}

function changeNColumns(n: number) {
    scene.value.updateNGridColumns(n)
}

async function runColor() {
    if (color_editor.value) {
        const code = color_editor.value.getCode()
        shader_issues.value = await scene.value.updateColorShader(code)
        scene.value.renderColor()
    }
}
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Start elevation', 'Erosion']"
        v-model="active_tab"
        @canvas-ready="canvasReady"
        :issues="shader_issues"
    >
        <template v-if="active_tab = 'Start elevation'">
            <VBox>
                <NumberSingleSelect
                    text="Grid columns"
                    name="n_grid_columns"
                    :options="[4, 8, 16]"
                    v-model="n_grid_columns"
                    @update:model-value="changeNColumns"
                />
                <HBox>
                    <p>Terrain elevation before erosion</p>
                    <PanelButton text="Run" :mdi-path="mdiPlay" @click="runTerrainElevation" />
                </HBox>
            </VBox>
            <CodeEditor
                class="terrain-editor"
                ref="start_elevation_editor"
                :code="start_elevation_shader"
            />

            <VBox>
                <HBox>
                    <p>Terrain color</p>
                    <PanelButton text="Run" :mdi-path="mdiPlay" @click="runColor" />
                </HBox>
            </VBox>
            <CodeEditor class="terrain-editor" ref="color_editor" :code="color_shader" />
        </template>
        <template v-else></template>
    </SidePanelCanvas>
</template>

<style>
.terrain-editor {
    border-top: var(--border);
    border-bottom: var(--border);
    height: 15rem;
}

.terrain-editor:focus {
    border-top: var(--accent-border);
    border-bottom: var(--accent-border);
}
</style>
