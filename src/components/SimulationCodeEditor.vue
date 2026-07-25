<script setup lang="ts">
import CodeEditor from './CodeEditor.vue'
import Checkbox from './Checkbox.vue'

interface Emits {
    (e: 'reset'): void
    (e: 'step'): void
}

const emits = defineEmits<Emits>()

const code = defineModel<string>('code')
const is_running = defineModel<boolean>('is_running')
const skip_frames = defineModel<boolean>('skip-frames')
</script>

<template>
    <div class="container">
        <div class="header" :style="{ gridTemplateColumns: 'repeat(3, 1fr)' }">
            <button class="header-button" @click="emits('reset')">
                <span class="mdi mdi-reload" />
                <span>Reset</span>
            </button>
            <button class="header-button" @click="emits('step')">
                <span class="mdi mdi-step-forward" />
                <span>Step</span>
            </button>
            <button class="header-button" @click="is_running = !is_running">
                <span :class="`mdi mdi-${is_running ? 'pause' : 'play'}`" />
                <span>{{ is_running ? 'Pause' : 'Run' }}</span>
            </button>
        </div>
        <CodeEditor class="ca-editor" v-model="code" />
    </div>
    <div class="skip-frames-section">
        <Checkbox text="Skip every second frame" name="skip_frames" v-model="skip_frames" />
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

.header-button > .mdi {
    font-size: 20pt;
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
