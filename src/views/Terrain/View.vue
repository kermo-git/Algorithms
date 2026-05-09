<script setup lang="ts">
import { mdiPlay } from '@mdi/js'
import { computed, ref, shallowRef, useTemplateRef, watch } from 'vue'

import type { ShaderIssue } from '@/WebGPU/Engine'
import CodeEditor from '@/components/CodeEditor.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import VBox from '@/components/VBox.vue'
import PanelButton from '@/components/PanelButton.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'

import { examples } from './Examples'
import TerrainScene from './Scene'
import {
    DEG_TO_RAD,
    rotateX,
    rotateY,
    translate,
    to_webGPU_3x3,
    combine,
    transform,
} from '@/WebGPU/Geometry'

const active_tab = ref('Elevation')
const shader_issues = ref<ShaderIssue[]>([])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const scene = shallowRef(new TerrainScene())

const grid_size = ref(4)
const noise_editor = useTemplateRef('elevation_editor')
const noise_shader = ref(examples[0].elevation_shader)

const color_editor = useTemplateRef('color_editor')
const color_shader = ref(examples[0].color_shader)

const terrain_distance = ref(4)
const terrain_deg_x = ref(30)
const terrain_deg_y = ref(0)

const camera_setup = computed(() => {
    const rad_x = terrain_deg_x.value * DEG_TO_RAD
    const rad_y = terrain_deg_y.value * DEG_TO_RAD

    const rotate = combine(rotateY(-rad_y), rotateX(-rad_x))
    const move = translate(0, -terrain_distance.value, 0)
    const move_rotate = combine(move, rotate)

    return {
        pos: transform([0, 0, 0], move_rotate),
        rotation: to_webGPU_3x3(rotate),
    }
})

async function initScene(grid_size: number) {
    if (canvasRef.value) {
        scene.value.cleanup()
        await scene.value.init(
            {
                noise_shader: noise_shader.value,
                color_shader: color_shader.value,
                terrain_dims: [1024, 1024],
                grid_dims: [grid_size, grid_size],
                camera_pos: camera_setup.value.pos,
                camera_rotation: camera_setup.value.rotation,
            },
            canvasRef.value,
        )
    }
}

async function canvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    await initScene(grid_size.value)
}

watch(grid_size, (new_grid_size) => {
    initScene(new_grid_size)
})

async function runNoise() {
    if (noise_editor.value) {
        const code = noise_editor.value.getCode()
        noise_shader.value = code
        shader_issues.value = await scene.value.updateNoiseShader(code)
    }
}

async function runColor() {
    if (color_editor.value) {
        const code = color_editor.value.getCode()
        color_shader.value = code
        shader_issues.value = await scene.value.updateColorShader(code)
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
                :options="[2, 4, 8, 16]"
                v-model="grid_size"
            />
        </VBox>
        <template v-if="active_tab == 'Elevation'">
            <div class="editor-container">
                <PanelButton class="run-button" text="Run" :mdi-path="mdiPlay" @click="runNoise" />
                <CodeEditor class="terrain-editor" ref="elevation_editor" :code="noise_shader" />
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
