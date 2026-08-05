<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'

import type { ShaderIssue } from '@/WebGPU/Engine'
import { DEG_TO_RAD, rotateX, rotateY, translate } from '@/WebGPU/Geometry'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import PanelButton from '@/components/PanelButton.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import Checkbox from '@/components/Checkbox.vue'
import VBox from '@/components/VBox.vue'
import MenuItem from '@/components/MenuItem.vue'
import Menu from '@/components/Menu.vue'

import { examples, type Example } from './Examples'
import TerrainScene from './Scene'

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

function createLightVector(deg_x: number, deg_y: number) {
    const rad_x = deg_x * DEG_TO_RAD
    const rad_y = deg_y * DEG_TO_RAD

    return rotateY(rad_y).matmul(rotateX(rad_x)).matmul_vec([0, 1, 0])
}

function createCameraViewmatrix(
    new_grid_size: number,
    new_terrain_deg_x: number,
    new_terrain_deg_y: number
) {
    const rad_x = new_terrain_deg_x * DEG_TO_RAD
    const rad_y = new_terrain_deg_y * DEG_TO_RAD

    return translate(0, 0, -new_grid_size)
        .matmul(rotateX(-rad_x))
        .matmul(rotateY(-rad_y))
        .matmul(translate(-0.5 * new_grid_size, 0, 0.5 * new_grid_size))
}

async function initScene(new_grid_size: number) {
    if (canvasRef.value) {
        scene.value.cleanup()
        await scene.value.init(
            {
                noise_shader: noise_shader.value,
                color_shader: color_shader.value,
                terrain_dims: [1024, 1024],
                grid_dims: [new_grid_size, new_grid_size],
                light_dir: createLightVector(
                    light_deg_x.value,
                    light_deg_y.value
                ),
                ambient_light_intensity: ambient_intensity.value,
                camera_view_matrix: createCameraViewmatrix(
                    new_grid_size,
                    terrain_deg_x.value,
                    terrain_deg_y.value
                ),
                render_3D: render_3D.value
            },
            canvasRef.value
        )
    }
}

function setExample(example: Example) {
    noise_shader.value = example.elevation_shader
    color_shader.value = example.color_shader
    grid_size.value = example.grid_size
    initScene(example.grid_size)
}
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Elevation', 'Color', 'Rendering', 'Examples']"
        v-model="active_tab"
        @canvas-ready="
            async (canvas: HTMLCanvasElement) => {
                canvasRef = canvas
                await initScene(grid_size)
            }
        "
        :issues="shader_issues"
    >
        <VBox>
            <NumberSingleSelect
                text="Grid columns"
                :options="[4, 8, 16, 32, 64]"
                v-model="grid_size"
                @update:model-value="
                    async (new_grid_size) => await initScene(new_grid_size)
                "
            />
        </VBox>
        <template v-if="active_tab == 'Elevation'">
            <div class="editor-container">
                <PanelButton
                    class="run-button"
                    text="Run"
                    mdi-icon="play"
                    @click="
                        async () =>
                            (shader_issues =
                                await scene.updateNoiseShader(noise_shader))
                    "
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
                    @click="
                        async () =>
                            (shader_issues =
                                await scene.updateColorShader(color_shader))
                    "
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
                    :step="0.01"
                    @animation="
                        (new_ambient_intensity) =>
                            scene.setAmbientIntensity(new_ambient_intensity)
                    "
                />

                <p>Light angle: {{ light_deg_x }}</p>
                <RangeInput
                    v-model="light_deg_x"
                    :min="0"
                    :max="90"
                    :step="1"
                    @animation="
                        (new_light_deg_x) =>
                            scene.setLightDir(
                                createLightVector(new_light_deg_x, light_deg_y)
                            )
                    "
                />

                <p>Light direction: {{ light_deg_y }}</p>
                <RangeInput
                    v-model="light_deg_y"
                    :min="-180"
                    :max="180"
                    :step="1"
                    @animation="
                        (new_light_deg_y) =>
                            scene.setLightDir(
                                createLightVector(light_deg_x, new_light_deg_y)
                            )
                    "
                />

                <Checkbox
                    name="render_3D"
                    v-model="render_3D"
                    @update:model-value="
                        (new_render_3D) => scene.setRender3D(new_render_3D!)
                    "
                >
                    3D view
                </Checkbox>

                <template v-if="render_3D">
                    <p>View angle: {{ terrain_deg_x }}</p>
                    <RangeInput
                        v-model="terrain_deg_x"
                        :max="0"
                        :min="-90"
                        :step="1"
                        @animation="
                            (new_terrain_deg_x) =>
                                scene.setCamera(
                                    createCameraViewmatrix(
                                        grid_size,
                                        new_terrain_deg_x,
                                        terrain_deg_y
                                    )
                                )
                        "
                    />

                    <p>View direction: {{ terrain_deg_y }}</p>
                    <RangeInput
                        v-model="terrain_deg_y"
                        :min="-180"
                        :max="180"
                        :step="1"
                        @animation="
                            (new_terrain_deg_y) =>
                                scene.setCamera(
                                    createCameraViewmatrix(
                                        grid_size,
                                        terrain_deg_x,
                                        new_terrain_deg_y
                                    )
                                )
                        "
                    />
                </template>
            </VBox>
        </template>
        <VBox v-else>
            <Menu>
                <MenuItem
                    v-for="example in examples"
                    :key="example.name"
                    :text="example.name"
                    @click="setExample(example)"
                />
            </Menu>
        </VBox>
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
