<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { mdiPause, mdiPlay, mdiReload, mdiStepForward } from '@mdi/js'
import CodeEditor from './CodeEditor.vue'
import SvgIcon from '@jamescoyle/vue-icon'

interface Props {
    code: string
}

interface Emits {
    (e: 'reset'): void
    (e: 'codeChange', new_code: string): void
    (e: 'step'): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

const code_changed = ref(false)
const editor_ref = useTemplateRef('editor')

function applyCode() {
    if (code_changed.value && editor_ref.value) {
        code_changed.value = false
        const editor_code = editor_ref.value.getCode()
        emits('codeChange', editor_code)
        return true
    }
    return false
}

function onResetClick() {
    if (!applyCode()) {
        emits('reset')
    }
}

function onStepClick() {
    if (!applyCode()) {
        emits('step')
    }
}

const interval_ref = ref<number | null>(null)
const FPS = ref<number>(0)

function onRunClick(fps: number) {
    if (FPS.value === 0) {
        applyCode()
        startAnimation(fps)
    } else if (FPS.value === fps) {
        pauseAnimation()
    } else {
        pauseAnimation()
        applyCode()
        startAnimation(fps)
    }
}

function getRunIcon(fps: number) {
    if (FPS.value === fps) {
        return mdiPause
    }
    return mdiPlay
}

function startAnimation(fps: number) {
    interval_ref.value = setInterval(() => emits('step'), 1000 / fps)
    FPS.value = fps
}

function pauseAnimation() {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
    }
    interval_ref.value = null
    FPS.value = 0
}

onBeforeUnmount(() => {
    pauseAnimation()
})
</script>

<template>
    <div class="container">
        <div class="header" :style="{ gridTemplateColumns: 'repeat(6, 1fr)' }">
            <button
                class="header-button"
                :style="{ gridColumnStart: 1, gridColumnEnd: 4 }"
                @click="onResetClick"
            >
                <span>
                    <svg-icon type="mdi" :path="mdiReload" />
                </span>
                <span>Reset</span>
            </button>
            <button
                class="header-button"
                :style="{ gridColumnStart: 4, gridColumnEnd: 7 }"
                @click="onStepClick"
            >
                <span>
                    <svg-icon type="mdi" :path="mdiStepForward" />
                </span>
                <span>Step</span>
            </button>
            <button
                class="header-button"
                :style="{ gridColumnStart: 1, gridColumnEnd: 3 }"
                @click="() => onRunClick(15)"
            >
                <span>
                    <svg-icon type="mdi" :path="getRunIcon(15)" />
                </span>
                <span>15 FPS</span>
            </button>
            <button
                class="header-button"
                :style="{ gridColumnStart: 3, gridColumnEnd: 5 }"
                @click="() => onRunClick(30)"
            >
                <span>
                    <svg-icon type="mdi" :path="getRunIcon(30)" />
                </span>
                <span>30 FPS</span>
            </button>
            <button
                class="header-button"
                :style="{ gridColumnStart: 5, gridColumnEnd: 7 }"
                @click="() => onRunClick(60)"
            >
                <span>
                    <svg-icon type="mdi" :path="getRunIcon(60)" />
                </span>
                <span>60 FPS</span>
            </button>
        </div>
        <CodeEditor class="ca-editor" :code="props.code" v-model="code_changed" ref="editor" />
    </div>
</template>

<style scoped>
.container {
    display: flex;
    flex-direction: column;
    width: 100%;
}

.header {
    width: 100%;
    display: grid;
    gap: 2pt;
    background-color: var(--secondary-color);
    border-bottom: var(--border);
}

.header-button {
    height: var(--button-height);
    background-color: var(--bg-color);
    font-size: inherit;
    color: inherit;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--small-gap);
}

.header-button:first-child {
    border-left: none;
}

.header-button:hover {
    background-color: var(--secondary-color);
}

.header-button:active {
    background-color: var(--accent-color);
}

.header-button > svg-icon {
    font-size: 10pt;
}

.ca-editor {
    border-bottom: var(--border);
    width: 100%;
}
</style>
