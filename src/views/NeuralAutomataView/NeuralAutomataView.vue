<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiPlay, mdiDice5, mdiPlus, mdiMinus, mdiNumeric0 } from '@mdi/js'
import SvgIcon from '@jamescoyle/vue-icon'

import { createMatrix, Matrix } from '@/utils/Matrix'
import {
    randomize,
    discrete,
    sigmoid,
    invertedGaussian,
    neuralAutomatonStep,
} from '@/views/NeuralAutomataView/NeuralCellularAutomaton'

import ColorPalette from '@/components/ColorPalette.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import PanelSection from '@/components/PanelSection.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import PixelCanvas from '@/components/PixelCanvas.vue'
import TabControl from '@/components/TabControl.vue'
import MatrixEditor from '@/views/NeuralAutomataView/MatrixEditor.vue'

const grid_size = ref(64)
const kernelDesignMethod = ref('Toggle -/0/+')
const colors = ref(['#323232', '#00CE00', '#DB04AA', '#0144DB'])

type sign = '-' | '0' | '+'

const weightSign = ref(
    createMatrix<sign>([
        ['-', '-', '-', '-', '-', '-', '-'],
        ['-', '-', '-', '-', '-', '-', '-'],
        ['-', '-', '+', '+', '+', '-', '-'],
        ['-', '-', '+', '+', '+', '-', '-'],
        ['-', '-', '+', '+', '+', '-', '-'],
        ['-', '-', '-', '-', '-', '-', '-'],
        ['-', '-', '-', '-', '-', '-', '-'],
    ]),
)

const kernel_size = ref(7)

function createWeightMatrix(signs: Matrix<sign>) {
    const weights = new Matrix(signs.n_rows, signs.n_rows, 0)
    let numNegatives = 0
    let numPositives = 0

    signs.foreach((row, col, value) => {
        switch (value) {
            case '-':
                numNegatives++
                break
            case '+':
                numPositives++
                weights.set(row, col, 1)
                break
        }
    })
    const negativeWeight = -numPositives / numNegatives

    signs.foreach((row, col, value) => {
        if (value === '-') {
            weights.set(row, col, negativeWeight)
        }
    })
    return weights
}

const weights = ref(createWeightMatrix(weightSign.value))

function getWeightStyle(row: number, col: number) {
    const value = weightSign.value.get(row, col)

    switch (value) {
        case '-':
            return {
                backgroundColor: colors.value[0],
                color: colors.value[1],
            }
        case '+':
            return {
                backgroundColor: colors.value[1],
                color: colors.value[0],
            }
        default:
            return {
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
            }
    }
}

function getWeightMdiPath(row: number, col: number) {
    const value = weightSign.value.get(row, col)

    switch (value) {
        case '-':
            return mdiMinus
        case '+':
            return mdiPlus
        default:
            return mdiNumeric0
    }
}

function onSignCellClick(event: Event) {
    const data = (event.currentTarget as HTMLElement).dataset
    const row = Number(data.row)
    const col = Number(data.col)
    const value = weightSign.value.get(row, col)

    switch (value) {
        case '+':
            weightSign.value.set(row, col, '-')
            break
        case '0':
            weightSign.value.set(row, col, '+')
            break
        default:
            weightSign.value.set(row, col, '0')
            break
    }
    weights.value = createWeightMatrix(weightSign.value)
}

const generation = ref(0)
const current_gen = ref(
    (() => {
        const result = new Matrix(grid_size.value, grid_size.value, 0)
        randomize(result)
        return result
    })(),
)
const next_gen = ref(new Matrix(grid_size.value, grid_size.value, 0))

const activationChoice = ref('Discrete')

const activationFunction = computed(() => {
    switch (activationChoice.value) {
        case 'Discrete':
            return discrete
        case 'Sigmoid':
            return sigmoid
        default:
            return invertedGaussian
    }
})

function onStepClick() {
    neuralAutomatonStep(current_gen.value, next_gen.value, weights.value, activationFunction.value)
    const temp = current_gen.value
    current_gen.value = next_gen.value
    next_gen.value = temp
    generation.value += 1
}

function reset() {
    current_gen.value = new Matrix(grid_size.value, grid_size.value, 0)
    next_gen.value = new Matrix(grid_size.value, grid_size.value, 0)
    randomize(current_gen.value)
    generation.value = 0
}

const activeTab = ref('Configuration')
</script>

<template>
    <div class="container">
        <TabControl :captions="['Configuration', 'Style', 'Run']" v-model="activeTab">
            <template v-if="activeTab === 'Configuration'">
                <TextSingleSelect
                    text="Activation"
                    name="activation"
                    :options="['Discrete', 'Sigmoid', 'Inverted Gaussian']"
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
                            weightSign = new Matrix<sign>(kernel_size, kernel_size, '-')
                            weights = new Matrix(kernel_size, kernel_size, 0)
                            reset()
                        }
                    "
                />

                <TextSingleSelect
                    text="Kernel design method"
                    name="kernel-design-method"
                    :options="['Toggle -/0/+', 'Direct input']"
                    v-model="kernelDesignMethod"
                    @update:model-value="
                        (new_value: string) => {
                            if (new_value == 'Toggle -/0/+') {
                                weights = createWeightMatrix(weightSign)
                            }
                        }
                    "
                />

                <div
                    v-if="kernelDesignMethod === 'Toggle -/0/+'"
                    class="matrix"
                    :style="{
                        gridTemplateColumns: `repeat(${kernel_size}, 1fr)`,
                    }"
                >
                    <template v-for="row in kernel_size" :key="row">
                        <div
                            v-for="col in kernel_size"
                            :key="col"
                            :style="getWeightStyle(row - 1, col - 1)"
                            class="cell"
                            :data-row="row - 1"
                            :data-col="col - 1"
                            @click="onSignCellClick"
                        >
                            <svg-icon type="mdi" :path="getWeightMdiPath(row - 1, col - 1)" />
                        </div>
                    </template>
                </div>
                <MatrixEditor v-else v-model="weights" />
            </template>
            <template v-else-if="activeTab === 'Style'">
                <p>Colors</p>

                <ColorPalette v-model="colors" />

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
            </template>
            <template v-else>
                <PanelSection>
                    <PanelButton :mdi-path="mdiDice5" text="Randomize" @click="reset" />
                    <PanelButton :mdi-path="mdiPlay" text="Step" @click="onStepClick" />
                </PanelSection>
            </template>
        </TabControl>
        <PixelCanvas
            class="canvas"
            :matrix="current_gen"
            :colors="colors"
            :continuousColors="activationChoice != 'Discrete'"
        />
    </div>
</template>

<style scoped>
.container {
    display: grid;
    grid-template-columns: 30% 70%;
    flex-grow: 1;
    overflow-y: scroll;
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
