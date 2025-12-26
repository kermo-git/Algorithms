<script setup lang="ts">
import { ref, watch } from 'vue'

import type { Matrix } from '@/utils/Matrix'
import { type Color } from '@/utils/Colors'
import Canvas from '@/components/Canvas.vue'

interface Props {
    matrix: Matrix<Color>
}
const props = defineProps<Props>()
const canvasRef = ref<HTMLCanvasElement | null>(null)

function onCanvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    draw()
}

watch(props, draw)

function draw() {
    if (canvasRef.value) {
        const n_cols = props.matrix.n_cols
        const n_rows = props.matrix.n_rows

        const canvas = canvasRef.value
        canvas.width = n_cols
        canvas.height = n_rows
        const ctx = canvas.getContext('2d')

        if (ctx) {
            const image_data = ctx.createImageData(n_cols, n_rows)
            const color_array = image_data.data
            const matrix_data = props.matrix.data

            let color_i = 0
            for (let i = 0; i < n_rows * n_cols; i++) {
                const color = matrix_data[i]
                color_array[color_i++] = color.red
                color_array[color_i++] = color.green
                color_array[color_i++] = color.blue
                color_array[color_i++] = 255
            }
            ctx.putImageData(image_data, 0, 0)
        }
    }
}
</script>

<template>
    <Canvas @canvas-ready="onCanvasReady" />
</template>
