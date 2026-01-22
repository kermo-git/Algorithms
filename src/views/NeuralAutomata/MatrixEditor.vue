<script setup lang="ts">
import type { FloatArray } from '@/WebGPU/ShaderDataUtils'

interface Props {
    matrixSize: number
}
const props = defineProps<Props>()
const matrix = defineModel<FloatArray>('matrix')

function onCellClick(ev: Event) {
    const element = ev.target as HTMLInputElement
    element?.select()
    ev.stopPropagation()
}

function onInput(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset

    const row = Number(data.row)
    const col = Number(data.col)
    const value = Number(element.value)

    const copy = matrix.value!.subarray()
    copy[row * props.matrixSize + col] = value
    matrix.value! = copy
}
</script>

<template>
    <div
        class="matrix"
        :style="{
            gridTemplateColumns: `repeat(${matrixSize}, 1fr)`,
        }"
    >
        <template v-for="row in matrixSize" :key="row">
            <input
                class="cell"
                v-for="col in matrixSize"
                :key="col"
                :data-row="row - 1"
                :data-col="col - 1"
                type="number"
                :value="matrix![matrixSize * (row - 1) + (col - 1)].toFixed(2)"
                @click="onCellClick"
                @change="onInput"
            />
        </template>
    </div>
</template>

<style scoped>
.matrix {
    display: grid;
    border-right: var(--border);
    border-top: var(--border);
    width: 100%;
}

.cell::-webkit-inner-spin-button,
.cell::-webkit-outer-spin-button {
    appearance: textfield;
    -webkit-appearance: none;
    -moz-appearance: textfield;
}
.cell {
    font-size: inherit;
    text-align: center;
    background-color: inherit;
    color: inherit;
    border: none;
    border-left: var(--border);
    border-bottom: var(--border);
    box-sizing: border-box;
    width: 100%;
    aspect-ratio: 1 / 1;
}
.cell:focus {
    background-color: var(--accent-color);
    color: var(--bg-color);
    outline: none;
}
</style>
