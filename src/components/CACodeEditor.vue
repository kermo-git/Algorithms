<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { mdiPause, mdiPlay, mdiReload, mdiStepForward } from '@mdi/js'
import CodeEditor from './CodeEditor.vue'
import SvgIcon from '@jamescoyle/vue-icon'

interface Props {
    code: string
    FPS: number
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
const interval_ref = ref<number | null>(null)

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

function onRunClick() {
    applyCode()
    startAnimation(props.FPS)
}

function startAnimation(fps: number) {
    interval_ref.value = setInterval(() => emits('step'), 1000 / props.FPS)
}

function pauseAnimation() {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
    }
    interval_ref.value = null
}

watch(
    () => props.FPS,
    (new_FPS) => {
        pauseAnimation()
        startAnimation(new_FPS)
    },
)

onBeforeUnmount(() => {
    pauseAnimation()
})
</script>

<template>
    <div class="container">
        <div class="header" :style="{ gridTemplateColumns: 'repeat(3, 1fr)' }">
            <button class="header-button" @click="onResetClick">
                <span>
                    <svg-icon type="mdi" :path="mdiReload" />
                </span>
                <span>Reset</span>
            </button>
            <button class="header-button" @click="onStepClick">
                <span>
                    <svg-icon type="mdi" :path="mdiStepForward" />
                </span>
                <span>Step</span>
            </button>
            <button v-if="interval_ref === null" class="header-button" @click="onRunClick">
                <span>
                    <svg-icon type="mdi" :path="mdiPlay" />
                </span>
                <span>Run</span>
            </button>
            <button v-else class="header-button" @click="pauseAnimation">
                <span>
                    <svg-icon type="mdi" :path="mdiPause" />
                </span>
                <span>Pause</span>
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
    gap: 0;
    border-bottom: var(--border);
    height: var(--button-height);
}

.header-button {
    background-color: var(--bg-color);
    font-size: inherit;
    color: inherit;
    border: none;
    border-left: var(--border);
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
