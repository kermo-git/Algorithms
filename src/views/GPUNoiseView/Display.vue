<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { mdiFloppy } from '@mdi/js'

import PanelButton from '@/components/PanelButton.vue'
import type ComputeRenderer from './ComputeRenderer'

interface Props {
    renderer: ComputeRenderer
}
const props = defineProps<Props>()
const canvasRef = ref<HTMLCanvasElement | null>(null)

onMounted(async () => {
    if (!canvasRef.value) {
        throw Error('HTML canvas element not found!')
    }
    await props.renderer.init(canvasRef.value)
})

onUnmounted(() => {
    props.renderer.cleanup()
})

/* watch(props.renderer, async () => {
    if (!canvasRef.value) {
        throw Error('HTML canvas element not found!')
    }
    await props.renderer.init(canvasRef.value)
}) */

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
    aspect-ratio: 1;
    image-rendering: pixelated;
}

.save-button {
    position: absolute;
    right: 2em;
    bottom: 2em;
}
</style>
