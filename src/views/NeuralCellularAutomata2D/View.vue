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

import { shaderColorArray } from '@/utils/Colors'
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
const kernel = ref<FloatArray>(default_example.get_kernel())

const activation_shader = ref(default_example.activation)
const editor_code = ref(default_example.activation)
const is_running = ref(false)
const skip_frames = ref(false)
const interval_ref = ref<number | null>(null)

const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)

const scene = shallowRef(
    new NeuralScene({
        activation_shader: activation_shader.value,
        canvas_dims: [grid_size.value, grid_size.value],
        kernel_radius: kernel_radius.value,
        kernel: kernel.value,
    }),
)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const colors = shaderColorArray([color_0.value, color_1.value])
    shader_issues.value = await scene.value.init(colors, canvas)
}

function setExample(example: Example) {
    color_0.value = example.color_0
    color_1.value = example.color_1
    kernel_radius.value = example.kernel_radius
    kernel.value = example.get_kernel()
    activation_shader.value = example.activation
    editor_code.value = example.activation
}

function reset() {
    if (editor_code.value != activation_shader.value) {
        activation_shader.value = editor_code.value
    } else {
        scene.value.reset()
    }
}

function step() {
    scene.value.step(skip_frames.value ? 2 : 1)
}

function run() {
    const fps = 60
    interval_ref.value = setInterval(step, 1000 / fps)
}

function pause() {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
    }
    interval_ref.value = null
}

function onKernelRadiusChange(new_radius: number) {
    const new_size = 2 * new_radius + 1
    kernel.value = new Float32Array(new_size * new_size)
}

watch([color_0, color_1], ([new_color_0, new_color_1]) => {
    const colors = shaderColorArray([new_color_0, new_color_1])
    scene.value.updateColors(colors)
})

watch(
    [grid_size, activation_shader, kernel_radius, kernel],
    ([new_grid_size, new_activation, new_kernel_size, new_kernel]) => {
        pause()

        scene.value.cleanup()
        scene.value = new NeuralScene({
            activation_shader: new_activation,
            canvas_dims: [new_grid_size, new_grid_size],
            kernel_radius: new_kernel_size,
            kernel: new_kernel,
        })

        if (canvasRef.value) {
            initScene(canvasRef.value)
        }

        if (is_running.value) {
            run()
        }
    },
)

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
        @canvas-ready="initScene"
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
                <MatrixEditor :matrix-size="2 * kernel_radius + 1" v-model:matrix="kernel" />
            </template>
            <template v-else>
                <HBox>
                    <ColorInput v-model="color_0" />
                    <p>Select colors</p>
                    <ColorInput v-model="color_1" />
                </HBox>

                <NumberSingleSelect
                    text="Grid size"
                    name="grid-size"
                    :options="[256, 512, 1024]"
                    v-model="grid_size"
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
