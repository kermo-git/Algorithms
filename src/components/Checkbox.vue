<script setup lang="ts">
import HBox from './HBox.vue'

interface Props {
    name: string
}
const props = defineProps<Props>()
const model = defineModel<boolean>()

function onChange(event: Event) {
    const element = event.target as HTMLInputElement
    model.value = element.checked
}
</script>

<template>
    <HBox>
        <span class="checkbox-wrapper">
            <input
                type="checkbox"
                :id="`${props.name}`"
                :name="props.name"
                :value="model"
                @change="onChange"
            />
            <span :class="`checkbox-icon ${model ? 'mdi mdi-check' : ''}`" />
        </span>
        <label class="caption" :for="props.name"><slot /></label>
    </HBox>
</template>

<style scoped>
.checkbox-wrapper {
    position: relative;
    height: 100%;
    aspect-ratio: 1;
}

.checkbox-icon {
    font-size: 25pt;
    position: absolute;
    top: 0;
    left: 8%;
    width: 100%;
    height: 100%;
    pointer-events: none;
    color: var(--secondary-color);
}

input[type='checkbox'] {
    margin: 0;
    width: 100%;
    height: 100%;
    border-radius: var(--border-radius);
    border: var(--border);
    appearance: none;
}

input[type='checkbox']:hover {
    border: var(--accent-border);
}

input[type='checkbox']:checked + .checkbox-icon {
    color: var(--accent-color);
}

.caption {
    flex-grow: 1;
    height: 100%;
    line-height: 2.5rem;
    padding-left: var(--small-gap);
}
</style>
