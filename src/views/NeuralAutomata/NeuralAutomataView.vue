<script setup lang="ts">
import { markRaw, ref, shallowRef, watch } from 'vue'
import { mdiPlay, mdiReload } from '@mdi/js'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import PanelSection from '@/components/PanelSection.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import MatrixEditor from '@/views/NeuralAutomata/MatrixEditor.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'

import MenuItem from '@/components/MenuItem.vue'
import ColorInput from '@/components/ColorInput.vue'
import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import { NeuralScene } from './NeuralScene'
import type { Activation } from './NeuralShader'
import ComputeRenderer from '@/WebGPU/ComputeRenderer'
import { shaderColor } from '@/utils/Colors'

const activeTab = ref('Configuration')

const activation = ref<Activation>('Discrete')
const grid_size = ref(64)
const color_1 = ref('#323232')
const color_2 = ref('#00CE00')
const kernel_size = ref(7)

const kernel = ref<FloatArray>(
    normalizeKernel(
        new Float32Array(
            [
                [-1, -1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1, -1],
                [-1, -1, 1, 1, 1, -1, -1],
                [-1, -1, 1, 1, 1, -1, -1],
                [-1, -1, 1, 1, 1, -1, -1],
                [-1, -1, -1, -1, -1, -1, -1],
                [-1, -1, -1, -1, -1, -1, -1],
            ].flat(),
        ),
    ),
)

const scene = shallowRef(markRaw(new NeuralScene(activation.value)))
const renderer = shallowRef(markRaw(new ComputeRenderer()))
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    canvas.width = grid_size.value
    canvas.height = grid_size.value

    const init_info = await renderer.value.init(canvas)
    await scene.value.init(
        {
            grid_size: grid_size.value,
            kernel_size: kernel_size.value,
            kernel: kernel.value,
            color_1: shaderColor(color_1.value),
            color_2: shaderColor(color_2.value),
        },
        init_info,
    )
    renderer.value.render(scene.value)
}

function normalizeKernel(kernel: FloatArray) {
    let n_nagative = 0
    let n_positive = 0

    kernel.forEach((value) => {
        if (value < 0) {
            n_nagative++
        } else if (value > 0) {
            n_positive++
        }
    })
    const neg_weight = parseFloat((-n_positive / n_nagative).toFixed(2))

    return kernel.map((value) => {
        if (value < 0) {
            return neg_weight
        } else if (value > 0) {
            return 1
        }
        return 0
    })
}

function onKernelSizeChange(new_value: number) {
    const data_length = new_value * new_value
    kernel.value = new Float32Array(data_length)
}

function reset() {
    const device = renderer.value.device
    scene.value.initGrid(grid_size.value, device)
    renderer.value.render(scene.value)
}

function onStepClick() {
    const device = renderer.value.device
    scene.value.switchGenerations(device)
    renderer.value.render(scene.value)
}

watch(grid_size, (new_grid_size) => {
    const canvas = canvasRef.value
    if (canvas) {
        canvas.width = new_grid_size
        canvas.height = new_grid_size
        reset()
    }
})

watch(kernel, (new_kernel) => {
    const device = renderer.value.device
    scene.value.updateKernel(kernel_size.value, new_kernel, device)
})

watch([color_1, color_2], ([new_color_1, new_color_2]) => {
    const device = renderer.value.device
    scene.value.updateColors(shaderColor(new_color_1), shaderColor(new_color_2), device)
    renderer.value.render(scene.value)
})

watch(activation, (new_activation) => {
    renderer.value.cleanup()
    scene.value.cleanup()
    scene.value = new NeuralScene(new_activation)

    if (canvasRef.value) {
        initScene(canvasRef.value)
    }
})

function randomLinesExample() {
    color_1.value = '#323232'
    color_2.value = '#FECB3E'

    const N = -1
    const P = 1

    kernel_size.value = 5
    kernel.value = normalizeKernel(
        new Float32Array(
            [
                [0, 0, N, 0, 0],
                [0, N, P, N, 0],
                [N, P, P, P, N],
                [0, N, P, N, 0],
                [0, 0, N, 0, 0],
            ].flat(),
        ),
    )
    reset()
}

function organicMazeExample() {
    color_1.value = '#59F9CE'
    color_2.value = '#4842FF'

    const N = -1
    const P = 1

    kernel_size.value = 11
    kernel.value = normalizeKernel(
        new Float32Array(
            [
                [0, 0, 0, 0, N, N, N, 0, 0, 0, 0],
                [0, 0, N, N, N, N, N, N, N, 0, 0],
                [0, N, N, N, N, N, N, N, N, N, 0],
                [0, N, N, N, P, P, P, N, N, N, 0],
                [N, N, N, P, P, P, P, P, N, N, N],
                [N, N, N, P, P, P, P, P, N, N, N],
                [N, N, N, P, P, P, P, P, N, N, N],
                [0, N, N, N, P, P, P, N, N, N, 0],
                [0, N, N, N, N, N, N, N, N, N, 0],
                [0, 0, N, N, N, N, N, N, N, 0, 0],
                [0, 0, 0, 0, N, N, N, 0, 0, 0, 0],
            ].flat(),
        ),
    )
    reset()
}

function zebraExample() {
    color_1.value = '#000000'
    color_2.value = '#EBEBEB'

    const N = -1
    const P = 1

    kernel_size.value = 9
    kernel.value = normalizeKernel(
        new Float32Array(
            [
                [0, 0, N, N, P, N, N, 0, 0],
                [0, N, N, P, P, P, N, N, 0],
                [N, N, N, P, P, P, N, N, N],
                [N, N, P, P, P, P, P, N, N],
                [N, N, P, P, P, P, P, N, N],
                [N, N, P, P, P, P, P, N, N],
                [N, N, N, P, P, P, N, N, N],
                [0, N, N, P, P, P, N, N, 0],
                [0, 0, N, N, P, N, N, 0, 0],
            ].flat(),
        ),
    )
    reset()
}
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Run']"
        v-model="activeTab"
        @canvas-ready="initScene"
    >
        <template v-if="activeTab === 'Configuration'">
            <TextSingleSelect
                text="Activation"
                name="activation"
                :options="['Discrete', 'Sigmoid']"
                v-model="activation"
            />

            <NumberSingleSelect
                text="Kernel size"
                name="radius"
                :options="[5, 7, 9, 11]"
                v-model="kernel_size"
                @update:model-value="onKernelSizeChange"
            />

            <PanelSection>
                <PanelButton
                    text="Normalize kernel"
                    @click="
                        () => {
                            kernel = normalizeKernel(kernel)
                        }
                    "
                />
            </PanelSection>
            <MatrixEditor :matrix-size="kernel_size" v-model:matrix="kernel" />
        </template>
        <template v-else>
            <PanelSection>
                <PanelButton :mdi-path="mdiReload" text="Reset" @click="reset" />
                <ColorInput v-model="color_1" />
                <ColorInput v-model="color_2" />
                <PanelButton :mdi-path="mdiPlay" text="Step" @click="onStepClick" />
            </PanelSection>
            <NumberSingleSelect
                text="Grid size"
                name="grid-size"
                :options="[64, 128]"
                v-model="grid_size"
            />
            <MenuItem text="Random curved lines" @click="randomLinesExample" />
            <MenuItem text="Maze" @click="organicMazeExample" />
            <MenuItem text="Zebra" @click="zebraExample" />
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
