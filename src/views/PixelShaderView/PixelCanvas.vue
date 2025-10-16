<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { mdiFloppy } from '@mdi/js'

import type { Matrix } from '@/utils/Matrix'
import { BLACK, lerpColors, parseHexColor, type Color } from '@/utils/Colors'
import PanelButton from '@/components/PanelButton.vue'

interface Props {
    matrix: Matrix<Color>
}
const props = defineProps<Props>()
const canvasRef = ref<HTMLCanvasElement | null>(null)

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
watch(props, draw)
onMounted(draw)

function download() {
    if (canvasRef.value) {
        const canvas = canvasRef.value
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.href = url
                link.download = 'image.png'

                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                URL.revokeObjectURL(url)
            }
        }, 'image/png')
    }
}
</script>

<template>
    <div class="main-container">
        <div class="canvas-container">
            <PanelButton class="save-button" :mdi-path="mdiFloppy" />
            <canvas ref="canvasRef" />
        </div>
        <PanelButton @click="download" class="save-button" :mdi-path="mdiFloppy" />
    </div>
</template>

<style scoped>
.main-container {
    position: relative;
    overflow-y: scroll;
}

.canvas-container {
    height: 100%;
    overflow-y: scroll;
}

canvas {
    width: 100%;
    image-rendering: pixelated;
}

.save-button {
    position: absolute;
    right: 2em;
    bottom: 2em;
}
</style>
