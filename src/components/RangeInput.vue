<script setup lang="ts">
import HBox from './HBox.vue'

defineOptions({ inheritAttrs: false })
const model = defineModel<number>()

interface Emits {
    (e: 'animation', value: number): void
}
const emit = defineEmits<Emits>()

let frame_requested = false

function onInput(event: Event) {
    const element = event.target as HTMLInputElement
    model.value = Number(element.value)

    if (!frame_requested) {
        frame_requested = true
        requestAnimationFrame(() => {
            emit('animation', model.value!)
            frame_requested = false
        })
    }
}
</script>

<template>
    <HBox>
        <p>{{ $attrs['min'] }}</p>
        <input v-bind="$attrs" type="range" :value="model" @input="onInput" />
        <p>{{ $attrs['max'] }}</p>
        <slot />
    </HBox>
</template>

<style scoped>
input[type='range'] {
    flex-grow: 1;
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
