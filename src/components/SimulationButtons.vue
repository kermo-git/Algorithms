<script setup lang="ts">
interface Emits {
    (e: 'reset'): void
    (e: 'step'): void
}

const emits = defineEmits<Emits>()
const is_running = defineModel<boolean>('is_running')
</script>

<template>
    <div class="container" :style="{ gridTemplateColumns: 'repeat(3, 1fr)' }">
        <button class="simulation-button" @click="emits('reset')">
            <span class="mdi mdi-reload" />
            <span>Reset</span>
        </button>
        <button class="simulation-button" @click="emits('step')">
            <span class="mdi mdi-step-forward" />
            <span>Step</span>
        </button>
        <button class="simulation-button" @click="is_running = !is_running">
            <span :class="`mdi mdi-${is_running ? 'pause' : 'play'}`" />
            <span>{{ is_running ? 'Pause' : 'Run' }}</span>
        </button>
    </div>
</template>

<style scoped>
.container {
    width: 100%;
    display: grid;
    gap: 2pt;
    background-color: var(--secondary-color);
    border-bottom: var(--border);
}

.simulation-button {
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

.simulation-button:first-child {
    border-left: none;
}

.simulation-button:hover {
    background-color: var(--secondary-color);
    cursor: pointer;
}

.simulation-button:active {
    background-color: var(--accent-color);
    color: var(--bg-color);
}

.simulation-button > .mdi {
    font-size: 20pt;
}
</style>
