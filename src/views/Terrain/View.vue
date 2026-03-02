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

const active_tab = ref('Elevation')
const shader_issues = ref<ShaderIssue[]>([])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const scene = shallowRef(new TerrainScene())

const n_grid_columns = ref(4)
const elevation_editor = useTemplateRef('elevation_editor')
const elevation_shader = ref(examples[0].elevation_shader)

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
                elevation_shader: elevation_shader.value,
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
    if (elevation_editor.value) {
        const code = elevation_editor.value.getCode()
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
        :tab-captions="['Elevation', 'Color', 'Erosion']"
        v-model="active_tab"
        @canvas-ready="canvasReady"
        :issues="shader_issues"
    >
        <VBox>
            <NumberSingleSelect
                text="Grid columns"
                name="n_grid_columns"
                :options="[4, 8, 16]"
                v-model="n_grid_columns"
                @update:model-value="changeNColumns"
            />
        </VBox>
        <template v-if="active_tab == 'Elevation'">
            <div class="editor-container">
                <PanelButton
                    class="run-button"
                    text="Run"
                    :mdi-path="mdiPlay"
                    @click="runTerrainElevation"
                />
                <CodeEditor
                    class="terrain-editor"
                    ref="elevation_editor"
                    :code="elevation_shader"
                />
            </div>
        </template>
        <template v-else-if="active_tab == 'Color'">
            <div class="editor-container">
                <PanelButton class="run-button" text="Run" :mdi-path="mdiPlay" @click="runColor" />
                <CodeEditor class="terrain-editor" ref="color_editor" :code="color_shader" />
            </div>
        </template>
        <template v-else></template>
    </SidePanelCanvas>
</template>

<style>
.editor-container {
    border-top: var(--border);
    overflow-y: scroll;
    position: relative;
}

.run-button {
    position: absolute;
    top: var(--small-gap);
    right: var(--small-gap);
}

.terrain-editor {
    height: 100%;
}
</style>
