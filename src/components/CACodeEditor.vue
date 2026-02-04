<script setup lang="ts">
import { onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { mdiPause, mdiPlay, mdiReload, mdiStepForward } from '@mdi/js'
import CodeEditor from './CodeEditor.vue'
import SvgIcon from '@jamescoyle/vue-icon'
import Checkbox from './Checkbox.vue'

interface Props {
    code: string
}

interface Emits {
    (e: 'reset'): void
    (e: 'codeChange', new_code: string): void
    (e: 'step', two_frames?: boolean): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

const code_changed = ref(false)
const editor_ref = useTemplateRef('editor')
const skip_frames = ref(false)

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

function onRunClick() {
    if (!interval_ref.value) {
        applyCode()
        startAnimation(skip_frames.value)
    } else {
        pauseAnimation()
    }
}

function getRunIcon() {
    if (interval_ref.value) {
        return mdiPause
    }
    return mdiPlay
}

function startAnimation(skip_frames: boolean) {
    const fps = 60
    interval_ref.value = setInterval(() => emits('step', skip_frames), 1000 / fps)
}

function pauseAnimation() {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
    }
    interval_ref.value = null
}

function changeSkip(new_skip_frames: boolean) {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
        startAnimation(new_skip_frames)
    }
}

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
            <button class="header-button" @click="() => onRunClick()">
                <span>
                    <svg-icon type="mdi" :path="getRunIcon()" />
                </span>
                <span>{{ interval_ref ? 'Pause' : 'Run' }}</span>
            </button>
        </div>
        <CodeEditor class="ca-editor" :code="props.code" v-model="code_changed" ref="editor" />
    </div>
    <div class="skip-frames-section">
        <Checkbox
            text="Skip every second frame"
            name="skip_frames"
            v-model="skip_frames"
            @update:model-value="(value) => changeSkip(value!)"
        />
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

.skip-frames-section {
    padding: var(--small-gap);
    border-bottom: var(--border);
    box-sizing: border-box;
}
</style>
