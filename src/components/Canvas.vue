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

function issue_class() {
    if (props.issues && props.issues.length > 0) {
        return 'issues'
    }
    return 'props.issues && props.issues.length > 0'
}
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
    <div :class="`main-container ${issue_class()}`">
        <template v-for="(issue, i) in props.issues" :key="i">
            <p class="issue">{{ issue.message }}</p>
            <p class="issue">
                &NonBreakingSpace;&NonBreakingSpace;&NonBreakingSpace;{{ issue.codeLine }}
            </p>
        </template>
        <canvas :class="`display-canvas ${issue_class()}`" ref="canvas" />
        <PanelButton @click="download" class="save-button" :mdi-path="mdiFloppy" />
    </div>
</template>

<style scoped>
.main-container {
    position: relative;
    overflow-y: scroll;
    --error-color: rgb(255, 65, 65);
}

.main-container.issues {
    background-color: black;
}

.display-canvas {
    width: 100%;
    image-rendering: pixelated;
}

.display-canvas.issues {
    display: none;
}

.save-button {
    position: absolute;
    left: 2rem;
    top: 2rem;
}

.issue {
    text-align: left;
    font-size: 15pt;
    color: var(--error-color);
    font-family: monospace;
    margin-left: var(--small-gap);
}
</style>
