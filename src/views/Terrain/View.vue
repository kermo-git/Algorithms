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
import { DEG_TO_RAD, rotateX, rotateY, translate } from '@/WebGPU/Geometry'
import RangeInput from '@/components/RangeInput.vue'

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

const light_deg_X = ref(45)
const light_deg_Y = ref(45)
const ambient_intensity = ref(0.1)

const light_dir = computed(() => {
    const rad_x = light_deg_X.value * DEG_TO_RAD
    const rad_y = light_deg_Y.value * DEG_TO_RAD

    return rotateY(rad_y).matmul(rotateX(rad_x)).matmul_vec([0, 0, 1])
})

const camera = computed(() => {
    const rad_x = terrain_deg_x.value * DEG_TO_RAD
    const rad_y = terrain_deg_y.value * DEG_TO_RAD

    const rotate = rotateX(-rad_x).matmul(rotateY(-rad_y))
    const move = translate(0, -terrain_distance.value, 0)
    const move_rotate = rotate.matmul(move)

    return {
        pos: move_rotate.matmul_vec([0, 0, 0]),
        rotation: rotate,
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
                light_dir: light_dir.value,
                ambient_intensity: ambient_intensity.value,
                camera_pos: camera.value.pos,
                camera_rotation: camera.value.rotation,
            },
            canvasRef.value,
        )
    }
}

async function canvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    await initScene(grid_size.value)
}

watch(grid_size, async (new_grid_size) => {
    await initScene(new_grid_size)
})

watch([light_dir, ambient_intensity], (new_values) => {
    scene.value.setLight(new_values[0], new_values[1])
})

watch(camera, (new_camera) => {
    scene.value.setCamera(new_camera.pos, new_camera.rotation)
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
        :tab-captions="['Elevation', 'Color', 'Rendering']"
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
        <template v-else-if="active_tab == 'Rendering'">
            <VBox>
                <p>Ambient light intensity: {{ ambient_intensity }}</p>
                <RangeInput v-model="ambient_intensity" :min="0" :max="1" :step="0.1" />

                <p>Light angle around X-axis: {{ light_deg_X }}</p>
                <RangeInput v-model="light_deg_X" :min="0" :max="180" :step="1" />

                <p>Light angle around Y-axis: {{ light_deg_Y }}</p>
                <RangeInput v-model="light_deg_Y" :min="0" :max="360" :step="1" />
            </VBox>
        </template>
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
