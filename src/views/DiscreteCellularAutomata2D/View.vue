<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import { type ShaderIssue } from '@/WebGPU/Engine'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import CACodeEditor from '@/components/CACodeEditor.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import ColorPalette from '@/components/ColorPalette.vue'
import MenuItem from '@/components/MenuItem.vue'
import VBox from '@/components/VBox.vue'

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

async function initScene() {
    if (canvasRef.value) {
        scene.value.cleanup()
        shader_issues.value = await scene.value.init(
            {
                n_states: n_states.value,
                hex_colors: colors.value,
                update_shader: update_shader.value,
                canvas_width: grid_size.value,
            },
            canvasRef.value,
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
    interval_ref.value = setInterval(() => scene.value.step(skip_frames.value ? 2 : 1), 1000 / fps)
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
        <CACodeEditor
            v-if="activeTab === 'Configuration'"
            v-model:code="editor_code"
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
            <template v-if="activeTab === 'Configuration'">
                <p>Number of states: {{ n_states }}</p>
                <RangeInput
                    :min="2"
                    :max="32"
                    :step="1"
                    v-model="n_states"
                    @update:model-value="
                        (new_n_states) => {
                            scene.setNStates(new_n_states)
                            scene.reset()
                        }
                    "
                />
                <NumberSingleSelect
                    text="Grid size"
                    name="grid-size"
                    :options="[256, 512, 1024]"
                    v-model="grid_size"
                    @update:model-value="
                        (new_grid_size) => {
                            scene.resizeCanvas(new_grid_size)
                            scene.reset()
                        }
                    "
                />
            </template>
            <template v-else-if="activeTab === 'Colors'">
                <ColorPalette
                    v-model="colors"
                    @update:model-value="(new_colors) => scene.updateColors(new_colors)"
                />
            </template>
            <template v-else>
                <MenuItem
                    v-for="example in examples"
                    :key="example.name"
                    :text="example.name"
                    @click="setExample(example)"
                />
            </template>
        </VBox>
    </SidePanelCanvas>
</template>

<style scoped>
.matrix {
    display: grid;
    border-right: var(--border);
    border-top: var(--border);
    width: 100%;
    aspect-ratio: 1 / 1;
}

.cell {
    border-left: var(--border);
    border-bottom: var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
}

.cell:hover {
    background-color: var(--accent-color) !important;
    color: var(--bg-color) !important;
}
</style>
