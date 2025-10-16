<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { mdiFloppy } from '@mdi/js'

import type { Matrix } from '@/utils/Matrix'
import { BLACK, lerpColors, parseHexColor } from '@/utils/Colors'
import PanelButton from '@/components/PanelButton.vue'
import type { ColorPoint } from './types'

interface Props {
    matrix: Matrix
    colors: ColorPoint[]
    continuousColors: boolean
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

            const colors = props.colors.map((cp) => parseHexColor(cp.color))
            const points = props.colors.map((cp) => cp.point)

            if (props.continuousColors) {
                const diffs = points.slice(1).map((p, i) => {
                    return p - points[i]
                })

                let color_i = 0
                for (let i = 0; i < n_rows * n_cols; i++) {
                    const value = matrix_data[i]
                    let color = BLACK

                    if (value <= points[0]) {
                        color = colors[0]
                    } else if (points[points.length - 1] < value) {
                        color = colors[colors.length - 1]
                    } else {
                        for (let j = 1; j < points.length; j++) {
                            if (value <= points[j]) {
                                const norm_value = (value - points[j - 1]) / diffs[j - 1]
                                color = lerpColors(norm_value, colors[j - 1], colors[j])
                                break
                            }
                        }
                    }
                    color_array[color_i++] = color.red
                    color_array[color_i++] = color.green
                    color_array[color_i++] = color.blue
                    color_array[color_i++] = 255
                }
            } else {
                let color_i = 0
                for (let i = 0; i < n_rows * n_cols; i++) {
                    const value = matrix_data[i]
                    let color = colors[0]

                    for (let j = points.length - 1; j >= 0; j--) {
                        if (value >= points[j]) {
                            color = colors[j]
                            break
                        }
                    }
                    color_array[color_i++] = color.red
                    color_array[color_i++] = color.green
                    color_array[color_i++] = color.blue
                    color_array[color_i++] = 255
                }
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
