<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { mdiFloppy } from '@mdi/js'

import PanelButton from '@/components/PanelButton.vue'
import { webGPUComputeTextureDemo } from './Utils'

/* interface Props {
    shader: string
}
const props = defineProps<Props>() */
const canvasRef = ref<HTMLCanvasElement | null>(null)

onMounted(async () => {
    if (!canvasRef.value) {
        throw Error('HTML canvas element not found!')
    }
    const context = canvasRef.value.getContext('webgpu')
    if (!context) {
        throw Error('HTML canvas context not found!')
    }
    webGPUComputeTextureDemo(context)
})

// watch(props, draw)

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
            <canvas width="1000" height="1000" ref="canvasRef" />
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
