<script setup lang="ts">
import { onMounted, useTemplateRef, getCurrentInstance } from 'vue'

import { ShaderIssue } from '@/WebGPU/ShaderModuleSystem/Compiler'
import PanelButton from '@/components/PanelButton.vue'

interface Props {
    issues?: ShaderIssue[]
}

interface Emits {
    (e: 'canvasReady', canvas: HTMLCanvasElement): void
    (e: 'drag', move_x: number, move_y: number): void
}
const emit = defineEmits<Emits>()
const props = defineProps<Props>()

const drag_event_assigned = getCurrentInstance()?.vnode.props?.onDrag
function hasIssues() {
    return props.issues ? props.issues.length > 0 : false
}

function getCanvasClassName() {
    let class_name = 'display-canvas '

    if (drag_event_assigned) {
        class_name += 'drag'
    }
    return class_name
}

const canvasRef = useTemplateRef('canvas')

onMounted(() => {
    if (!canvasRef.value) {
        throw Error('HTML canvas element not found!')
    }
    emit('canvasReady', canvasRef.value)
})

let last_pointer_x = 0
let last_pointer_y = 0

let current_pointer_x = 0
let current_pointer_y = 0

let frame_id = 0

function dragStart(ev: PointerEvent) {
    last_pointer_x = ev.clientX
    last_pointer_y = ev.clientY
    ev.target?.addEventListener('pointermove', onDrag)
}

function dragEnd(ev: PointerEvent) {
    last_pointer_x = ev.clientX
    last_pointer_y = ev.clientY
    ev.target?.removeEventListener('pointermove', onDrag)
}

function onDrag(ev: Event) {
    current_pointer_x = (ev as PointerEvent).clientX
    current_pointer_y = (ev as PointerEvent).clientY

    if (!frame_id) {
        frame_id = requestAnimationFrame(() => {
            let move_x = current_pointer_x - last_pointer_x
            let move_y = current_pointer_y - last_pointer_y

            last_pointer_x = current_pointer_x
            last_pointer_y = current_pointer_y

            frame_id = 0

            emit('drag', move_x, move_y)
        })
    }
}

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
    <div :class="`main-container`">
        <div class="issues" v-if="hasIssues()">
            <template v-for="(issue, i) in props.issues" :key="i">
                <p class="issue">{{ issue.message }}</p>
                <p class="issue">
                    &NonBreakingSpace;&NonBreakingSpace;&NonBreakingSpace;{{
                        issue.codeLine
                    }}
                </p>
            </template>
        </div>
        <canvas
            v-bind="
                drag_event_assigned
                    ? {
                          onPointerdown: dragStart,
                          onPointerup: dragEnd,
                          onPointerleave: dragEnd
                      }
                    : {}
            "
            :class="getCanvasClassName()"
            ref="canvas"
        />
        <PanelButton @click="download" class="save-button" mdi-icon="floppy" />
    </div>
</template>

<style scoped>
.main-container {
    position: relative;
    --error-color: rgb(255, 65, 65);
    height: 100%;
    width: 100%;
    overflow: hidden;
    background-color: black;
}

.display-canvas {
    height: 100%;
    width: 100%;
    image-rendering: pixelated;
    display: block;
}

.display-canvas.drag {
    cursor: grab;
}

.display-canvas.drag:active {
    cursor: grabbing;
}

.issues {
    position: absolute;
    background: black;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

.save-button {
    position: absolute;
    right: 2rem;
    bottom: 2rem;
}

.issue {
    text-align: left;
    font-size: 15pt;
    color: var(--error-color);
    font-family: monospace;
    margin-left: var(--small-gap);
}
</style>
