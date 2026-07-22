<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import SimulationCodeEditor from '@/components/SimulationCodeEditor.vue'
import MatrixEditor from './MatrixEditor.vue'
import ColorInput from '@/components/ColorInput.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import MenuItem from '@/components/MenuItem.vue'
import HBox from '@/components/HBox.vue'
import VBox from '@/components/VBox.vue'

import type { FloatArray } from '@/WebGPU/Engine'
import { type ShaderIssue } from '@/WebGPU/Engine'

import { NeuralScene } from './Scene'
import { examples, type Example } from './Examples'

const default_example = examples[0]

const active_tab = ref('Configuration')
const grid_size = ref(256)
const color_0 = ref(default_example.color_0)
const color_1 = ref(default_example.color_1)
const kernel_radius = ref(default_example.kernel_radius)
const kernel = ref<number[]>(default_example.get_kernel())

const editor_code = ref(default_example.activation)
const is_running = ref(false)
const skip_frames = ref(false)
const interval_ref = ref<number | null>(null)

const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)

const scene = shallowRef(new NeuralScene())

let activation_shader = default_example.activation
let kernel_changed = false

function setupChanged() {
    return editor_code.value != activation_shader || kernel_changed
}

function onKernelRadiusChange(new_radius: number) {
    const new_size = 2 * new_radius + 1
    kernel.value = new Array(new_size * new_size).fill(0)
    kernel_changed = true
}

function onKernelEdit() {
    kernel_changed = true
}

async function initScene() {
    if (canvasRef.value) {
        activation_shader = editor_code.value
        kernel_changed = false

        scene.value.cleanup()
        shader_issues.value = await scene.value.init(
            {
                activation_shader: activation_shader,
                canvas_width: grid_size.value,
                kernel_radius: kernel_radius.value,
                kernel: new Float32Array(kernel.value),
                color_1: color_0.value,
                color_2: color_1.value,
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
    color_0.value = example.color_0
    color_1.value = example.color_1
    kernel_radius.value = example.kernel_radius
    kernel.value = example.get_kernel()
    activation_shader = example.activation
    editor_code.value = example.activation
    initScene()
}

function reset() {
    if (setupChanged()) {
        initScene()
    } else {
        scene.value.reset()
    }
}

function step() {
    if (setupChanged()) {
        initScene()
    } else {
        scene.value.step(skip_frames.value ? 2 : 1)
    }
}

function run() {
    if (setupChanged()) {
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
        :tab-captions="['Configuration', 'Style & Examples']"
        :issues="shader_issues"
        v-model="active_tab"
        @canvas-ready="onCanvasReady"
    >
        <SimulationCodeEditor
            v-if="active_tab === 'Configuration'"
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
            <template v-if="active_tab === 'Configuration'">
                <NumberSingleSelect
                    text="Kernel size"
                    name="radius"
                    :options="[1, 2, 3, 4, 5]"
                    v-model="kernel_radius"
                    @update:model-value="onKernelRadiusChange"
                />
                <MatrixEditor
                    :matrix-size="2 * kernel_radius + 1"
                    v-model:matrix="kernel"
                    @update:matrix="onKernelEdit"
                />
            </template>
            <template v-else>
                <HBox>
                    <ColorInput
                        v-model="color_0"
                        @animation="(hex_color) => scene.updateColor1(hex_color)"
                    />
                    <p>Select colors</p>
                    <ColorInput
                        v-model="color_1"
                        @animation="(hex_color) => scene.updateColor2(hex_color)"
                    />
                </HBox>

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
