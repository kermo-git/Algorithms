<script setup lang="ts">
import { ref, watch } from 'vue'

import type { Matrix } from '@/utils/Matrix'
import { BLACK, lerpColors, parseHexColor } from '@/utils/Colors'
import type { ColorPoint } from './types'
import Canvas from '@/components/Canvas.vue'

interface Props {
    matrix: Matrix
    colors: ColorPoint[]
    continuousColors: boolean
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
</script>

<template>
    <Canvas @canvas-ready="onCanvasReady" />
</template>
