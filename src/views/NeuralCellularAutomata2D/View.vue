<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'

import { type ShaderIssue } from '@/WebGPU/Engine'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import Checkbox from '@/components/Checkbox.vue'
import SimulationButtons from '@/components/SimulationButtons.vue'
import ColorInput from '@/components/ColorInput.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import Menu from '@/components/Menu.vue'
import MenuItem from '@/components/MenuItem.vue'
import HBox from '@/components/HBox.vue'
import VBox from '@/components/VBox.vue'

import { KernelSymmetry } from './Types'
import MatrixEditor from './MatrixEditor.vue'
import { examples, type Example } from './Examples'
import { NeuralScene } from './Scene'

const default_example = examples[0]

const active_tab = ref('Activation')
const grid_size = ref(256)
const color_0 = ref(default_example.color_0)
const color_1 = ref(default_example.color_1)
const kernel_radius = ref(default_example.kernel_radius)
const kernel_symmetry = ref<KernelSymmetry>(default_example.kernel_symmetry)
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

async function applyChanges() {
    if (kernel_changed) {
        kernel_changed = false
        scene.value.setKernel(kernel_radius.value, kernel.value)
    }
    if (editor_code.value != activation_shader) {
        activation_shader = editor_code.value
        shader_issues.value = await scene.value.setActivation(editor_code.value)
    }
    const no_issues = shader_issues.value.length === 0
    if (!no_issues) {
        pause()
    }
    return no_issues
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
                kernel: kernel.value,
                color_1: color_0.value,
                color_2: color_1.value
            },
            canvasRef.value
        )
    }
}

async function onCanvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    initScene()
}

async function setExample(example: Example) {
    color_0.value = example.color_0
    color_1.value = example.color_1
    kernel_radius.value = example.kernel_radius
    kernel_symmetry.value = example.kernel_symmetry
    kernel.value = example.get_kernel()
    editor_code.value = example.activation
    skip_frames.value = example.skipFrames
    await initScene()
}

async function resetCanvas(new_grid_size: number) {
    const no_issues = await applyChanges()
    scene.value.resetCanvas(new_grid_size, no_issues && !is_running.value)
}

async function reset() {
    if (await applyChanges()) {
        scene.value.reset(!is_running.value)
    }
}

async function step() {
    if (await applyChanges()) {
        scene.value.step(skip_frames.value ? 2 : 1)
    }
}

async function run() {
    if (await applyChanges()) {
        const fps = 60
        interval_ref.value = setInterval(
            () => scene.value.step(skip_frames.value ? 2 : 1),
            1000 / fps
        )
    }
}

function pause() {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
    }
    interval_ref.value = null
    is_running.value = false
}

onBeforeUnmount(() => {
    pause()
    scene.value.cleanup()
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Activation', 'Kernel', 'Examples']"
        :issues="shader_issues"
        v-model="active_tab"
        @canvas-ready="onCanvasReady"
    >
        <template v-slot:tabs>
            <template v-if="active_tab === 'Activation'">
                <CodeEditor class="code-editor" v-model="editor_code" />
                <VBox>
                    <Checkbox name="skip_frames" v-model="skip_frames">
                        Skip every second frame
                    </Checkbox>
                    <HBox>
                        <span :style="{ flexGrow: 1 }">Colors</span>
                        <ColorInput
                            v-model="color_0"
                            @animation="
                                (hex_color) =>
                                    scene.setColor1(hex_color, !is_running)
                            "
                        />
                        <ColorInput
                            v-model="color_1"
                            @animation="
                                (hex_color) =>
                                    scene.setColor2(hex_color, !is_running)
                            "
                        />
                    </HBox>
                </VBox>
            </template>
            <template v-if="active_tab === 'Kernel'">
                <VBox>
                    <NumberSingleSelect
                        text="Kernel size"
                        :options="[1, 2, 3, 4, 5]"
                        v-model="kernel_radius"
                        @update:model-value="onKernelRadiusChange"
                    />
                    <MatrixEditor
                        :matrix-size="2 * kernel_radius + 1"
                        :symmetry="kernel_symmetry"
                        v-model:matrix="kernel"
                        @update:matrix="onKernelEdit"
                    />
                    <TextSingleSelect
                        text="Kernel symmetry"
                        :options="Object.values(KernelSymmetry)"
                        v-model="kernel_symmetry"
                    />
                </VBox>
            </template>
            <VBox v-if="active_tab === 'Examples'">
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
            <SimulationButtons
                v-model:code="editor_code"
                v-model:is_running="is_running"
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
                    @update:model-value="resetCanvas"
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
