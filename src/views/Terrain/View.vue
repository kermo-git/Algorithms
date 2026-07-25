<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import PanelButton from '@/components/PanelButton.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import Checkbox from '@/components/Checkbox.vue'
import VBox from '@/components/VBox.vue'
import HBox from '@/components/HBox.vue'

import type { ShaderIssue } from '@/WebGPU/Engine'
import { DEG_TO_RAD, rotateX, rotateY, translate } from '@/WebGPU/Geometry'

import { examples, type Example } from './Examples'
import TerrainScene from './Scene'
import MenuItem from '@/components/MenuItem.vue'

const active_tab = ref('Elevation')
const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
const scene = shallowRef(new TerrainScene())

const grid_size = ref(4)
const noise_shader = ref(examples[0].elevation_shader)
const color_shader = ref(examples[0].color_shader)

const light_deg_x = ref(20)
const light_deg_y = ref(0)
const ambient_intensity = ref(0.3)

const render_3D = ref(false)
const terrain_deg_x = ref(-40)
const terrain_deg_y = ref(70)

const light_dir = computed(() => {
    const rad_x = light_deg_x.value * DEG_TO_RAD
    const rad_y = light_deg_y.value * DEG_TO_RAD

    return rotateY(rad_y).matmul(rotateX(rad_x)).matmul_vec([0, 1, 0])
})

const camera_view_matrix = computed(() => {
    const size = grid_size.value
    const rad_x = terrain_deg_x.value * DEG_TO_RAD
    const rad_y = terrain_deg_y.value * DEG_TO_RAD

    return translate(0, 0, -size)
        .matmul(rotateX(-rad_x))
        .matmul(rotateY(-rad_y))
        .matmul(translate(-0.5 * size, 0, 0.5 * size))
})

async function initScene(grid_size: number) {
    if (canvasRef.value) {
        console.log(camera_view_matrix.value)

        scene.value.cleanup()
        await scene.value.init(
            {
                noise_shader: noise_shader.value,
                color_shader: color_shader.value,
                terrain_dims: [1024, 1024],
                grid_dims: [grid_size, grid_size],
                light_dir: light_dir.value,
                ambient_light_intensity: ambient_intensity.value,
                camera_view_matrix: camera_view_matrix.value,
                render_3D: render_3D.value
            },
            canvasRef.value
        )
    }
}

function setExample(example: Example) {
    noise_shader.value = example.elevation_shader
    color_shader.value = example.color_shader
    initScene(grid_size.value)
}

async function canvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    await initScene(grid_size.value)
}

async function runNoise() {
    shader_issues.value = await scene.value.updateNoiseShader(
        noise_shader.value,
        render_3D.value
    )
}

async function runColor() {
    shader_issues.value = await scene.value.updateColorShader(
        color_shader.value,
        render_3D.value
    )
}

watch(grid_size, async (new_grid_size) => {
    await initScene(new_grid_size)
})

watch([light_dir, ambient_intensity], (new_values) => {
    scene.value.setLight(new_values[0], new_values[1], render_3D.value)
})

watch(render_3D, (new_render_3D) => {
    scene.value.renderDisplay(new_render_3D)
})

watch(camera_view_matrix, (new_camera) => {
    scene.value.setCamera(new_camera)
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Elevation', 'Color', 'Rendering', 'Examples']"
        v-model="active_tab"
        @canvas-ready="canvasReady"
        :issues="shader_issues"
    >
        <VBox>
            <NumberSingleSelect
                text="Grid columns"
                name="n_grid_columns"
                :options="[4, 8, 16, 32, 64]"
                v-model="grid_size"
            />
        </VBox>
        <template v-if="active_tab == 'Elevation'">
            <div class="editor-container">
                <PanelButton
                    class="run-button"
                    text="Run"
                    mdi-icon="play"
                    @click="runNoise"
                />
                <CodeEditor class="terrain-editor" v-model="noise_shader" />
            </div>
        </template>
        <template v-else-if="active_tab == 'Color'">
            <div class="editor-container">
                <PanelButton
                    class="run-button"
                    text="Run"
                    mdi-icon="play"
                    @click="runColor"
                />
                <CodeEditor class="terrain-editor" v-model="color_shader" />
            </div>
        </template>
        <template v-else-if="active_tab == 'Rendering'">
            <VBox>
                <p>Ambient light intensity: {{ ambient_intensity }}</p>
                <RangeInput
                    v-model="ambient_intensity"
                    :min="0"
                    :max="1"
                    :step="0.1"
                />

                <p>Light angle: {{ light_deg_x }}</p>
                <RangeInput
                    v-model="light_deg_x"
                    :min="0"
                    :max="90"
                    :step="1"
                />

                <p>Light direction: {{ light_deg_y }}</p>
                <RangeInput
                    v-model="light_deg_y"
                    :min="-180"
                    :max="180"
                    :step="1"
                />

                <HBox justify="left">
                    <Checkbox
                        text="3D view"
                        name="render_3D"
                        v-model="render_3D"
                    />
                </HBox>

                <template v-if="render_3D">
                    <p>View angle: {{ terrain_deg_x }}</p>
                    <RangeInput
                        v-model="terrain_deg_x"
                        :max="0"
                        :min="-90"
                        :step="1"
                    />

                    <p>View direction: {{ terrain_deg_y }}</p>
                    <RangeInput
                        v-model="terrain_deg_y"
                        :min="-180"
                        :max="180"
                        :step="1"
                    />
                </template>
            </VBox>
        </template>
        <template v-else>
            <VBox>
                <MenuItem
                    v-for="example in examples"
                    :key="example.name"
                    :text="example.name"
                    @click="setExample(example)"
                />
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
