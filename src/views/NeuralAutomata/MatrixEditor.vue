<script setup lang="ts">
import type { Matrix } from '@/utils/Matrix'

interface Props {
    modelValue: Matrix<number>
}
const props = defineProps<Props>()

interface Emits {
    (e: 'update:modelValue', value: Matrix<number>): void
}
const emit = defineEmits<Emits>()

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

    props.modelValue.set(row, col, value)
    emit('update:modelValue', props.modelValue)
}
</script>

<template>
    <div
        class="matrix"
        :style="{
            gridTemplateColumns: `repeat(${props.modelValue.n_cols}, 1fr)`,
        }"
    >
        <template v-for="row in props.modelValue.n_rows" :key="row">
            <input
                class="cell"
                v-for="col in props.modelValue.n_cols"
                :key="col"
                :data-row="row - 1"
                :data-col="col - 1"
                type="number"
                :value="props.modelValue.data[props.modelValue.n_cols * (row - 1) + (col - 1)]"
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
