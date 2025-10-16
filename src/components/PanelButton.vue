<script setup lang="ts">
import SvgIcon from '@jamescoyle/vue-icon'

interface Props {
    text?: string
    mdiPath?: string
}
const props = defineProps<Props>()
</script>

<template>
    <button>
        <span v-if="props.mdiPath">
            <svg-icon type="mdi" :path="props.mdiPath" />
        </span>
        <span v-if="props.text">{{ props.text }}</span>
    </button>
</template>

<style scoped>
button {
    border: var(--border);
    border-radius: 0.7em;
    background-color: var(--secondary-color);
    padding: 0.5em;
    font-size: inherit;
    color: inherit;
    display: flex;
    align-items: center;
    gap: 0.5em;
}

button:hover {
    border: var(--accent-border);
    cursor: pointer;
}

button:active {
    border: var(--accent-border);
    background-color: var(--accent-color);
    color: var(--bg-color);
}

button svg {
    height: 2em;
    width: 2em;
    padding: 0;
    font-size: 10pt;
}
</style>
