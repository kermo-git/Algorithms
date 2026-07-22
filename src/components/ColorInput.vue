<script setup lang="ts">
const model = defineModel<string>()

interface Emits {
    (e: 'animation', hex_color: string): void
}
const emit = defineEmits<Emits>()

let frame_id = 0
let raw_value = model.value || '#000000'

function onInput(event: Event) {
    const element = event.target as HTMLInputElement
    raw_value = element.value

    if (!frame_id) {
        frame_id = requestAnimationFrame(() => {
            emit('animation', raw_value)
            model.value = raw_value
            frame_id = 0
        })
    }
}
</script>
<template>
    <input type="color" :style="`background-color: ${model}`" :value="model" @input="onInput" />
</template>

<style scoped>
input[type='color'] {
    border: var(--border);
    border-radius: var(--border-radius);
    height: var(--button-height);
    width: var(--button-height);
    cursor: pointer;
}

input[type='color']:hover {
    border: var(--accent-border);
}
</style>
