<script setup lang="ts">
const model = defineModel<number>()

function onInput(event: Event) {
    const element = event.target as HTMLInputElement
    model.value = Number(element.value)
}
</script>

<template>
    <input type="range" :value="model" @input="onInput" />
</template>

<style scoped>
input[type='range'] {
    appearance: none;
    background: transparent;
    cursor: pointer;
}

input[type='range']::-webkit-slider-runnable-track {
    height: 1em;
    background: var(--secondary-color);
    border-radius: 1em;
}

input[type='range']::-webkit-slider-thumb {
    appearance: none;
    background-color: var(--text-color);
    border: none;
    width: 2em;
    height: 2em;
    border-radius: 2em;
    margin-top: -0.5em;
}

input[type='range']::-moz-range-track {
    height: 1em;
    background: var(--secondary-color);
    border-radius: 1em;
}

input[type='range']::-moz-range-thumb {
    appearance: none;
    background-color: var(--text-color);
    border: none;
    width: 2em;
    height: 2em;
    border-radius: 2em;
    margin-top: -0.5em;
}
</style>
