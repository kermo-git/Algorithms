<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'

import { type ShaderIssue } from '@/WebGPU/Engine'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import Checkbox from '@/components/Checkbox.vue'
import SimulationButtons from '@/components/SimulationButtons.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import ColorPalette from '@/components/ColorPalette.vue'
import Menu from '@/components/Menu.vue'
import MenuItem from '@/components/MenuItem.vue'
import VBox from '@/components/VBox.vue'
import HBox from '@/components/HBox.vue'
import IntegerField from '@/components/IntegerField.vue'

import { AutomatonScene } from './Scene'
import { examples, type Example } from './Examples'

const default_example = examples[0]

const activeTab = ref('Configuration')
const grid_size = ref(256)
const colors = ref(default_example.colors)
const n_states = ref(default_example.nStates)

const update_shader = ref(default_example.updateShader)
const editor_code = ref(default_example.updateShader)
const is_running = ref(false)
const skip_frames = ref(false)
const interval_ref = ref<number | null>(null)

const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)

const scene = shallowRef(new AutomatonScene())
const max_n_states = 32

async function initScene() {
    if (canvasRef.value) {
        scene.value.cleanup()
        shader_issues.value = await scene.value.init(
            {
                n_states: n_states.value,
                max_n_states: max_n_states,
                hex_colors: colors.value,
                update_shader: update_shader.value,
                canvas_width: grid_size.value
            },
            canvasRef.value
        )
    }
}

async function onCanvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    initScene()
}

function setExample(example: Example) {
    colors.value = example.colors
    n_states.value = example.nStates
    update_shader.value = example.updateShader
    editor_code.value = example.updateShader
    skip_frames.value = example.skipFrames
    initScene()
}

function reset() {
    if (editor_code.value != update_shader.value) {
        update_shader.value = editor_code.value
        initScene()
    } else {
        scene.value.reset()
    }
}

function step() {
    if (editor_code.value != update_shader.value) {
        update_shader.value = editor_code.value
        initScene()
    } else {
        scene.value.step(skip_frames.value ? 2 : 1)
    }
}

function run() {
    if (editor_code.value != update_shader.value) {
        update_shader.value = editor_code.value
        initScene()
    }
    const fps = 60
    interval_ref.value = setInterval(
        () => scene.value.step(skip_frames.value ? 2 : 1),
        1000 / fps
    )
}

function pause() {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
    }
    interval_ref.value = null
}

onBeforeUnmount(() => {
    pause()
    scene.value.cleanup()
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors', 'Examples']"
        :issues="shader_issues"
        v-model="activeTab"
        @canvas-ready="onCanvasReady"
    >
        <template v-slot:tabs>
            <template v-if="activeTab === 'Configuration'">
                <CodeEditor class="code-editor" v-model="editor_code" />
                <VBox>
                    <Checkbox name="skip_frames" v-model="skip_frames">
                        Skip every second frame
                    </Checkbox>
                    <HBox>
                        <p style="flex-grow: 1">
                            Number of states (2 - {{ max_n_states }})
                        </p>
                        <IntegerField
                            :min="2"
                            :max="max_n_states"
                            width="7rem"
                            v-model="n_states"
                            @update:model-value="
                                (new_n_states: number) => {
                                    scene.setNStates(new_n_states)
                                    scene.reset()
                                }
                            "
                        />
                    </HBox>
                </VBox>
            </template>
            <VBox>
                <ColorPalette
                    v-if="activeTab === 'Colors'"
                    v-model="colors"
                    @change-all-colors="
                        (new_colors) => scene.updateAllColors(new_colors)
                    "
                    @change-single-color="
                        (index, value: string) =>
                            scene.updateSingleColor(index, value)
                    "
                />
                <Menu v-if="activeTab === 'Examples'">
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
            <SimulationButtons
                v-model:is_running="is_running"
                v-model:skip-frames="skip_frames"
                @reset="reset"
                @step="step"
                @update:is_running="
                    (value) => {
                        if (value) {
                            run()
                        } else {
                            pause()
                        }
                    }
                "
            />
            <VBox>
                <NumberSingleSelect
                    text="Grid size"
                    :options="[256, 512, 1024]"
                    v-model="grid_size"
                    @update:model-value="
                        (new_grid_size) => {
                            scene.resizeCanvas(new_grid_size)
                            scene.reset()
                        }
                    "
                />
            </VBox>
        </template>
    </SidePanelCanvas>
</template>

<style scoped>
.code-editor {
    border-bottom: var(--border);
    width: 100%;
}
</style>
