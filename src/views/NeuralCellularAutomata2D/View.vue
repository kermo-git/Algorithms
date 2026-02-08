<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import { shaderColorArray } from '@/utils/Colors'
import type { FloatArray } from '@/WebGPU/Engine'
import { type ShaderIssue } from '@/WebGPU/Engine'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelSection from '@/components/PanelSection.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import MenuItem from '@/components/MenuItem.vue'
import ColorInput from '@/components/ColorInput.vue'

import MatrixEditor from './MatrixEditor.vue'
import { NeuralScene } from './Scene'
import { examples, type Example } from './Examples'
import CACodeEditor from '@/components/CACodeEditor.vue'

const default_example = examples[0]

const active_tab = ref('Configuration')
const grid_size = ref(256)
const color_0 = ref(default_example.color_0)
const color_1 = ref(default_example.color_1)
const kernel_radius = ref(default_example.kernel_radius)
const kernel = ref<FloatArray>(default_example.get_kernel())
const activation_shader = ref<string>(default_example.activation)

const scene = shallowRef(
    new NeuralScene({
        activation_shader: activation_shader.value,
        n_grid_rows: grid_size.value,
        n_grid_cols: grid_size.value,
        kernel_radius: kernel_radius.value,
        kernel: kernel.value,
    }),
)
const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)

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
}

function reset() {
    scene.value.reset()
}

function step(two_frames: boolean) {
    scene.value.step(two_frames ? 2 : 1)
}

onBeforeUnmount(() => {
    scene.value.cleanup()
})

watch([color_0, color_1], ([new_color_0, new_color_1]) => {
    const colors = shaderColorArray([new_color_0, new_color_1])
    scene.value.updateColors(colors)
})

function onKernelRadiusChange(new_radius: number) {
    const new_size = 2 * new_radius + 1
    kernel.value = new Float32Array(new_size * new_size)
}

watch(
    [grid_size, activation_shader, kernel_radius, kernel],
    ([new_grid_size, new_activation, new_kernel_size, new_kernel]) => {
        scene.value.cleanup()
        scene.value = new NeuralScene({
            activation_shader: new_activation,
            n_grid_rows: new_grid_size,
            n_grid_cols: new_grid_size,
            kernel_radius: new_kernel_size,
            kernel: new_kernel,
        })

        if (canvasRef.value) {
            initScene(canvasRef.value)
        }
    },
)
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Style & Examples']"
        :issues="shader_issues"
        v-model="active_tab"
        @canvas-ready="initScene"
    >
        <template v-if="active_tab === 'Configuration'" #no-padding>
            <CACodeEditor
                :code="activation_shader"
                @code-change="
                    (new_activation_shader) => {
                        activation_shader = new_activation_shader
                    }
                "
                @reset="reset"
                @step="step"
            />
        </template>

        <template v-if="active_tab === 'Configuration'" #default>
            <NumberSingleSelect
                text="Kernel size"
                name="radius"
                :options="[1, 2, 3, 4, 5]"
                v-model="kernel_radius"
                @update:model-value="onKernelRadiusChange"
            />
            <MatrixEditor :matrix-size="2 * kernel_radius + 1" v-model:matrix="kernel" />
        </template>
        <template v-else #default>
            <PanelSection>
                <ColorInput v-model="color_0" />
                <p>Select colors</p>
                <ColorInput v-model="color_1" />
            </PanelSection>

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
                @click="
                    () => {
                        setExample(example)
                    }
                "
            />
        </template>
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
