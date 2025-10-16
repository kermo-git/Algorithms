<script setup lang="ts">
const model = defineModel()

function onFieldClick(ev: Event) {
    const element = ev.target as HTMLInputElement
    element?.select()
    ev.stopPropagation()
}
</script>

<template>
    <input @click="onFieldClick" v-model="model" />
</template>

<style scoped>
input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
    appearance: textfield;
    -webkit-appearance: none;
    -moz-appearance: textfield;
}
input {
    font-size: inherit;
    text-align: center;
    background-color: inherit;
    color: inherit;
    border: var(--border);
    border-radius: 0.7em;
    box-sizing: border-box;
    height: 2.5em;
    text-overflow: ellipsis;
}

input:focus {
    border: var(--accent-border);
    outline: none;
}
</style>
