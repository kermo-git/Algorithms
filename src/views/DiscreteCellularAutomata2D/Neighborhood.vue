<script setup lang="ts">
interface Props {
    neighborhoodRadius: number
}
const props = defineProps<Props>()
const radius = props.neighborhoodRadius
const matrix_size = 2 * radius + 1

function cellBackgroundColor(row: number, col: number): string {
    if (row === radius + 1 && col === radius + 1) {
        return 'var(--accent-color)'
    }
    return 'var(--bg-color)'
}
</script>

<template>
    <div
        class="matrix"
        :style="{
            gridTemplateColumns: `repeat(${matrix_size}, 1fr)`,
        }"
    >
        <template v-for="row in matrix_size" :key="row">
            <div
                class="cell"
                v-for="col in matrix_size"
                :key="col"
                :style="{
                    backgroundColor: cellBackgroundColor(row, col),
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
    width: 100%;
}

.cell {
    color: inherit;
    border: none;
    border-left: var(--border);
    border-bottom: var(--border);
    box-sizing: border-box;
    width: 100%;
    aspect-ratio: 1 / 1;
}
</style>
