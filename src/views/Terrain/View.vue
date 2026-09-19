<script setup lang="ts">
import { ref, shallowRef } from 'vue'

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
import Controller from './Controller'

const active_tab = ref('Elevation')
const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
const scene = shallowRef(new Controller())

const grid_size = ref(examples[0].grid_size)
const noise_shader = ref(examples[0].elevation_shader)
const color_shader = ref(examples[0].color_shader)

const light_deg_x = ref(20)
const light_deg_y = ref(0)
const ambient_intensity = ref(0.3)

const render_3D = ref(false)
let terrain_rad_x = -40 * DEG_TO_RAD
let terrain_rad_y = 70 * DEG_TO_RAD

function createLightVector(deg_x: number, deg_y: number) {
    return rotateY(deg_y * DEG_TO_RAD)
        .matmul(rotateX(deg_x * DEG_TO_RAD))
        .matmul_vec({ x: 0, y: 1, z: 0 })
}

function createCameraViewmatrix(new_grid_size: number) {
    return translate(0, 0, -new_grid_size)
        .matmul(rotateX(-terrain_rad_x))
        .matmul(rotateY(-terrain_rad_y))
        .matmul(translate(-0.5 * new_grid_size, 0, 0.5 * new_grid_size))
}

async function initScene(new_grid_size: number) {
    if (canvasRef.value) {
        scene.value.destroy()
        await scene.value.init(
            {
                noise_shader: noise_shader.value,
                color_shader: color_shader.value,
                terrain_dims: { x: 1024, y: 1024 },
                grid_dims: { x: new_grid_size, y: new_grid_size },
                light_dir: createLightVector(
                    light_deg_x.value,
                    light_deg_y.value
                ),
                ambient_light_intensity: ambient_intensity.value,
                camera_view_matrix: createCameraViewmatrix(new_grid_size),
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
        :tab-captions="['Elevation', 'Color', 'Lighting', 'Examples']"
        v-model="active_tab"
        @canvas-ready="
            async (canvas: HTMLCanvasElement) => {
                canvasRef = canvas
                await initScene(grid_size)
            }
        "
        @drag="
            (move_x: number, move_y: number) => {
                if (render_3D) {
                    terrain_rad_x += -move_y * 0.01
                    terrain_rad_y += -move_x * 0.01
                    scene.setCamera(createCameraViewmatrix(grid_size))
                }
            }
        "
        :issues="shader_issues"
    >
        <template v-slot:tabs>
            <template v-if="active_tab == 'Elevation'">
                <div class="editor-container">
                    <PanelButton
                        class="run-button"
                        text="Run"
                        mdi-icon="play"
                        @click="
                            async () =>
                                (shader_issues =
                                    await scene.setNoiseFunction(noise_shader))
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
                                    await scene.setColorFunction(color_shader))
                        "
                    />
                    <CodeEditor class="terrain-editor" v-model="color_shader" />
                </div>
            </template>
            <template v-else-if="active_tab == 'Lighting'">
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
                                    createLightVector(
                                        new_light_deg_x,
                                        light_deg_y
                                    )
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
                                    createLightVector(
                                        light_deg_x,
                                        new_light_deg_y
                                    )
                                )
                        "
                    />
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
        </template>
        <template v-slot:pinned>
            <VBox>
                <NumberSingleSelect
                    text="Grid size"
                    :options="[4, 8, 16, 32, 64]"
                    v-model="grid_size"
                    @update:model-value="
                        async (new_grid_size) => await initScene(new_grid_size)
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
            </VBox>
        </template>
    </SidePanelCanvas>
</template>

<style>
.editor-container {
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
