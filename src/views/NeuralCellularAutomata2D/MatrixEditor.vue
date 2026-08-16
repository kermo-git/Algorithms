<script setup lang="ts">
import { KernelSymmetry } from './Types'

interface Props {
    matrixSize: number
    symmetry: KernelSymmetry
}
const props = defineProps<Props>()
const matrix = defineModel<number[]>('matrix', { default: () => [] })

function flatIndex(row: number, col: number) {
    return row * props.matrixSize + col
}

function isDisabled(row: number, col: number) {
    switch (props.symmetry) {
        case KernelSymmetry.VERTICAL:
            return row > props.matrixSize / 2
        case KernelSymmetry.HORIZONTAL:
            return col > props.matrixSize / 2
        case KernelSymmetry.VERTICAL_HORIZONTAL:
            return row > props.matrixSize / 2 || col > props.matrixSize / 2
        case KernelSymmetry.FULL:
            return col > props.matrixSize / 2 || col < row
        default:
            return false
    }
}

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

    matrix.value[flatIndex(row, col)] = value

    const mirror_row = props.matrixSize - 1 - row
    const mirror_col = props.matrixSize - 1 - col

    switch (props.symmetry) {
        case KernelSymmetry.VERTICAL:
            matrix.value[flatIndex(mirror_row, col)] = value
            break
        case KernelSymmetry.HORIZONTAL:
            matrix.value[flatIndex(row, mirror_col)] = value
            break
        case KernelSymmetry.VERTICAL_HORIZONTAL:
            matrix.value[flatIndex(mirror_row, col)] = value
            matrix.value[flatIndex(row, mirror_col)] = value
            matrix.value[flatIndex(mirror_row, mirror_col)] = value
            break
        case KernelSymmetry.FULL:
            matrix.value[flatIndex(mirror_row, col)] = value
            matrix.value[flatIndex(row, mirror_col)] = value
            matrix.value[flatIndex(mirror_row, mirror_col)] = value

            matrix.value[flatIndex(col, row)] = value
            matrix.value[flatIndex(col, mirror_row)] = value
            matrix.value[flatIndex(mirror_col, row)] = value
            matrix.value[flatIndex(mirror_col, mirror_row)] = value
            break
    }
    matrix.value = matrix.value.slice()
}
</script>

<template>
    <div
        class="matrix"
        :style="{
            gridTemplateColumns: `repeat(${matrixSize}, 1fr)`,
            width: `${50 + (50 * (matrixSize - 3)) / 8}%`
        }"
    >
        <template v-for="row in matrixSize" :key="row">
            <input
                class="cell"
                v-for="col in matrixSize"
                :disabled="isDisabled(row - 1, col - 1)"
                :key="col"
                :data-row="row - 1"
                :data-col="col - 1"
                type="number"
                :value="matrix[matrixSize * (row - 1) + (col - 1)].toFixed(2)"
                @click="onCellClick"
                @change="onInput"
                :style="{
                    fontSize: `${1.1 - 0.45 * ((matrixSize - 3) / 8)}rem`
                }"
            />
        </template>
    </div>
</template>

<style scoped>
.matrix {
    display: grid;
    border-right: var(--border);
    border-top: var(--border);
}

.cell::-webkit-inner-spin-button,
.cell::-webkit-outer-spin-button {
    appearance: textfield;
    -webkit-appearance: none;
    -moz-appearance: textfield;
}
.cell {
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

.cell:disabled {
    color: var(--secondary-color);
}

.cell:focus {
    background-color: var(--accent-color);
    color: var(--bg-color);
    outline: none;
}
</style>
