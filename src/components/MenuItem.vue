<script setup lang="ts">
import SvgIcon from '@jamescoyle/vue-icon'

interface Props {
    text: string
}
const props = defineProps<Props>()
</script>

<template>
    <button>
        {{ props.text }}
    </button>
</template>

<style scoped>
button {
    width: 100%;
    border: var(--border);
    border-radius: 0.7em;
    background-color: inherit;
    height: 3em;
    font-size: inherit;
    color: inherit;
    text-align: center;
}

button:hover {
    background-color: var(--secondary-color);
    cursor: pointer;
}

button:active {
    border: var(--accent-border);
    background-color: var(--accent-color);
    color: var(--bg-color);
}
</style>
