<script setup lang="ts">
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
    border: var(--border);
    height: var(--button-height);
    width: 100%;
    background-color: inherit;
    font-size: inherit;
    color: inherit;
    text-align: center;
}

button:first-child {
    border-top-left-radius: var(--border-radius);
    border-top-right-radius: var(--border-radius);
}

button:not(:last-child) {
    border-bottom: 0;
}

button:last-child {
    border-bottom-left-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);
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
