<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { mdiFloppy } from '@mdi/js'

import type { ShaderIssue } from '@/WebGPU/Engine'
import PanelButton from '@/components/PanelButton.vue'

interface Props {
    issues?: ShaderIssue[]
}

interface Emits {
    (e: 'canvasReady', canvas: HTMLCanvasElement): void
}
const props = defineProps<Props>()
const canvasRef = useTemplateRef('canvas')
const emit = defineEmits<Emits>()

onMounted(() => {
    if (!canvasRef.value) {
        throw Error('HTML canvas element not found!')
    }
    emit('canvasReady', canvasRef.value)
})

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
            <canvas ref="canvas" />
        </div>
        <div v-if="props.issues" class="issue-block">
            <template v-for="(issue, i) in props.issues" :key="i">
                <p class="issue">{{ issue.message }}</p>
                <p class="issue">
                    &NonBreakingSpace;&NonBreakingSpace;&NonBreakingSpace;{{ issue.codeLine }}
                </p>
            </template>
        </div>
        <PanelButton @click="download" class="save-button" :mdi-path="mdiFloppy" />
    </div>
</template>

<style scoped>
.main-container {
    position: relative;
    overflow-y: scroll;
    --error-color: rgb(255, 65, 65);
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

.issue-block {
    position: absolute;
    top: 0;
    left: 1rem;
    width: 100%;
    text-align: left;
    font-size: 15pt;
    font-family: monospace;
    color: var(--error-color);
}
</style>
