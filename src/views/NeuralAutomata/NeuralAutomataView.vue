<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { mdiPlay, mdiDice5, mdiPlus, mdiMinus, mdiNumeric0, mdiReload } from '@mdi/js'
import SvgIcon from '@jamescoyle/vue-icon'

import ColorPalette from '@/components/ColorPalette.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import PanelSection from '@/components/PanelSection.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import MatrixEditor from '@/views/NeuralAutomata/MatrixEditor.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'

import { createMatrix, Matrix } from '@/utils/Matrix'
import { drawContinuousColors, drawDiscreteColors } from '@/utils/DrawPixels'
import {
    randomize,
    discrete,
    sigmoid,
    invertedGaussian,
    neuralAutomatonStep,
} from './NeuralAutomaton'
import MenuItem from '@/components/MenuItem.vue'
import ColorInput from '@/components/ColorInput.vue'

const grid_size = ref(64)
const color_1 = ref('#323232')
const color_2 = ref('#00CE00')

const kernel_size = ref(7)

function normalizeKernel(weights: Matrix<number>) {
    let numNegatives = 0
    let numPositives = 0

    weights.foreach((row, col, value) => {
        if (value < 0) {
            numNegatives++
        } else if (value > 0) {
            numPositives++
            weights.set(row, col, 1)
        }
    })
    const negativeWeight = parseFloat((-numPositives / numNegatives).toFixed(2))

    weights.foreach((row, col, value) => {
        if (value < 0) {
            weights.set(row, col, negativeWeight)
        }
    })
    return weights
}

const kernel = ref(
    normalizeKernel(
        createMatrix([
            [-1, -1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1, -1],
            [-1, -1, 1, 1, 1, -1, -1],
            [-1, -1, 1, 1, 1, -1, -1],
            [-1, -1, 1, 1, 1, -1, -1],
            [-1, -1, -1, -1, -1, -1, -1],
            [-1, -1, -1, -1, -1, -1, -1],
        ]),
    ),
)

const generation = ref(0)
const current_gen = ref(
    (() => {
        const result = new Matrix(grid_size.value, grid_size.value, () => 0)
        randomize(result)
        return result
    })(),
)
const next_gen = ref(new Matrix(grid_size.value, grid_size.value, () => 0))

const activationChoice = ref('Discrete')

const activationFunction = computed(() => {
    switch (activationChoice.value) {
        case 'Discrete':
            return discrete
        default:
            return sigmoid
    }
})

function onStepClick() {
    neuralAutomatonStep(current_gen.value, next_gen.value, kernel.value, activationFunction.value)
    const temp = current_gen.value
    current_gen.value = next_gen.value
    next_gen.value = temp
    generation.value += 1
}

function reset() {
    current_gen.value = new Matrix(grid_size.value, grid_size.value, () => 0)
    next_gen.value = new Matrix(grid_size.value, grid_size.value, () => 0)
    randomize(current_gen.value)
    generation.value = 0
}

const activeTab = ref('Configuration')

const canvasRef = ref<HTMLCanvasElement | null>(null)

function onCanvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    drawDiscreteColors(canvas, current_gen.value, [color_1.value, color_2.value])
}

watch([current_gen, color_1, color_2], ([new_current_gen, new_color_1, new_color_2]) => {
    if (canvasRef.value) {
        if (activationChoice.value === 'Discrete') {
            drawDiscreteColors(canvasRef.value, new_current_gen, [new_color_1, new_color_2])
        } else {
            drawContinuousColors(canvasRef.value, new_current_gen, [new_color_1, new_color_2])
        }
    }
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Run']"
        v-model="activeTab"
        @canvas-ready="onCanvasReady"
    >
        <template v-if="activeTab === 'Configuration'">
            <TextSingleSelect
                text="Activation"
                name="activation"
                :options="['Discrete', 'Sigmoid']"
                v-model="activationChoice"
            />

            <NumberSingleSelect
                text="Kernel size"
                name="radius"
                :options="[5, 7, 9, 11]"
                v-model="kernel_size"
                @update:model-value="
                    (new_value: number) => {
                        kernel_size = new_value
                        kernel = new Matrix(kernel_size, kernel_size, () => 0)
                        reset()
                    }
                "
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
            <MatrixEditor v-model="kernel" />
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
                @update:model-value="
                    (new_value: number) => {
                        grid_size = new_value
                        reset()
                    }
                "
            />
            <MenuItem
                text="Random curved lines"
                @click="
                    () => {
                        color_1 = '#323232'
                        color_2 = '#FECB3E'

                        let N = -1
                        let P = 1

                        kernel_size = 5
                        kernel = normalizeKernel(
                            createMatrix([
                                [0, 0, N, 0, 0],
                                [0, N, P, N, 0],
                                [N, P, P, P, N],
                                [0, N, P, N, 0],
                                [0, 0, N, 0, 0],
                            ]),
                        )
                        reset()
                    }
                "
            />
            <MenuItem
                text="Maze"
                @click="
                    () => {
                        color_1 = '#59F9CE'
                        color_2 = '#4842FF'

                        let N = -1
                        let P = 1

                        kernel_size = 11
                        kernel = normalizeKernel(
                            createMatrix([
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
                            ]),
                        )
                        reset()
                    }
                "
            />
            <MenuItem
                text="Zebra"
                @click="
                    () => {
                        color_1 = '#000000'
                        color_2 = '#EBEBEB'

                        let N = -1
                        let P = 1

                        kernel_size = 9
                        kernel = normalizeKernel(
                            createMatrix([
                                [0, 0, N, N, P, N, N, 0, 0],
                                [0, N, N, P, P, P, N, N, 0],
                                [N, N, N, P, P, P, N, N, N],
                                [N, N, P, P, P, P, P, N, N],
                                [N, N, P, P, P, P, P, N, N],
                                [N, N, P, P, P, P, P, N, N],
                                [N, N, N, P, P, P, N, N, N],
                                [0, N, N, P, P, P, N, N, 0],
                                [0, 0, N, N, P, N, N, 0, 0],
                            ]),
                        )
                        reset()
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
