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
import { DEG_TO_RAD, rotateX, rotateY, rotateZ, translate } from '@/WebGPU/Geometry'
import RangeInput from '@/components/RangeInput.vue'
import Checkbox from '@/components/Checkbox.vue'
import HBox from '@/components/HBox.vue'

const active_tab = ref('Elevation')
const shader_issues = ref<ShaderIssue[]>([])

const canvasRef = ref<HTMLCanvasElement | null>(null)
const scene = shallowRef(new TerrainScene())

const grid_size = ref(4)
const noise_editor = useTemplateRef('elevation_editor')
const noise_shader = ref(examples[0].elevation_shader)

const color_editor = useTemplateRef('color_editor')
const color_shader = ref(examples[0].color_shader)

const light_deg_x = ref(20)
const light_deg_z = ref(0)
const ambient_intensity = ref(0.3)

const light_dir = computed(() => {
    const rad_x = light_deg_x.value * DEG_TO_RAD
    const rad_z = light_deg_z.value * DEG_TO_RAD

    return rotateZ(rad_z).matmul(rotateX(rad_x)).matmul_vec([0, 0, 1])
})

const render_3D = ref(false)
const terrain_deg_x = ref(45)
const terrain_deg_z = ref(0)

const camera = computed(() => {
    const size = grid_size.value
    const rad_x = terrain_deg_x.value * DEG_TO_RAD
    const rad_z = terrain_deg_z.value * DEG_TO_RAD

    const move1 = translate(0, -size, 0)
    const rotate = rotateZ(-rad_z).matmul(rotateX(-rad_x))
    const move2 = translate(0.5 * size, 0.5 * size, 0)

    return {
        pos: move2.matmul(rotate).matmul(move1).matmul_vec([0, 0, 0]),
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
                render_3D: render_3D.value,
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

watch(render_3D, (new_render_3D) => {
    if (new_render_3D) {
        scene.value.setDisplay3D()
    } else {
        scene.value.setDisplay2D()
    }
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

                <p>Light angle: {{ light_deg_x }}</p>
                <RangeInput v-model="light_deg_x" :min="0" :max="90" :step="1" />

                <p>Light direction: {{ light_deg_z }}</p>
                <RangeInput v-model="light_deg_z" :min="-180" :max="180" :step="1" />

                <HBox justify="left">
                    <Checkbox text="3D view" name="render_3D" v-model="render_3D" />
                </HBox>

                <template v-if="render_3D">
                    <p>View angle: {{ terrain_deg_x }}</p>
                    <RangeInput v-model="terrain_deg_x" :min="0" :max="90" :step="1" />

                    <p>View direction: {{ terrain_deg_z }}</p>
                    <RangeInput v-model="terrain_deg_z" :min="-180" :max="180" :step="1" />
                </template>
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
