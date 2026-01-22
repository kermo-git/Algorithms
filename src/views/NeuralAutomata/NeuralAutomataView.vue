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
import { shaderColorArray } from '@/utils/Colors'

const activeTab = ref('Configuration')

const activation = ref<Activation>('Discrete')
const grid_size = ref(256)
const color_0 = ref('#323232')
const color_1 = ref('#00CE00')
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
            colors: shaderColorArray([color_0.value, color_1.value]),
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

watch([color_0, color_1], ([new_color_0, new_color_1]) => {
    const device = renderer.value.device
    scene.value.updateColors(shaderColorArray([new_color_0, new_color_1]), device)
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

function organicMazeExample() {
    color_0.value = '#59F9CE'
    color_1.value = '#4842FF'

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
    activation.value = 'Sigmoid'
    reset()
}

function zebraExample() {
    color_0.value = '#000000'
    color_1.value = '#EBEBEB'

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
    activation.value = 'Sigmoid'
    reset()
}

// https://neuralpatterns.io
function slimeMoldExample() {
    color_0.value = '#000000'
    color_1.value = '#FFFC41'

    const X = -0.85
    const Y = -0.2
    const Z = 0.8

    kernel_size.value = 3
    kernel.value = new Float32Array(
        [
            [Z, X, Z],
            [X, Y, X],
            [Z, X, Z],
        ].flat(),
    )
    activation.value = 'Inverted Gaussian'
    reset()
}

// https://neuralpatterns.io
function mitosisExample() {
    color_0.value = '#001E57'
    color_1.value = '#00CE00'

    const X = 0.88
    const Y = 0.4
    const Z = -0.939

    kernel_size.value = 3
    kernel.value = new Float32Array(
        [
            [Z, X, Z],
            [X, Y, X],
            [Z, X, Z],
        ].flat(),
    )
    activation.value = 'Inverted Gaussian'
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
                :options="['Discrete', 'Sigmoid', 'Inverted Gaussian']"
                v-model="activation"
            />

            <NumberSingleSelect
                text="Kernel size"
                name="radius"
                :options="[3, 5, 7, 9, 11]"
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
                <ColorInput v-model="color_0" />
                <ColorInput v-model="color_1" />
                <PanelButton :mdi-path="mdiPlay" text="Step" @click="onStepClick" />
            </PanelSection>
            <NumberSingleSelect
                text="Grid size"
                name="grid-size"
                :options="[256, 512, 1024]"
                v-model="grid_size"
            />
            <MenuItem text="Organic maze" @click="organicMazeExample" />
            <MenuItem text="Zebra" @click="zebraExample" />
            <MenuItem text="Slime mold" @click="slimeMoldExample" />
            <MenuItem text="Mitosis" @click="mitosisExample" />
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
