<script setup lang="ts">
import HBox from './HBox.vue'

interface Props {
    text: string
    name: string
    options: number[]
}
const props = defineProps<Props>()
const model = defineModel()
</script>

<template>
    <HBox>
        <p class="caption">{{ props.text }}</p>
        <div class="options">
            <template v-for="value in props.options" :key="value">
                <input
                    type="radio"
                    :id="`${props.name}-${value}`"
                    :name="props.name"
                    :value="value"
                    v-model="model"
                />
                <label class="option" :for="`${props.name}-${value}`">{{ value }}</label>
            </template>
        </div>
    </HBox>
</template>

<style scoped>
.caption {
    flex-basis: 20%;
    flex-grow: 1;
}

.options {
    display: flex;
    flex-wrap: wrap;
    gap: var(--small-gap);
}

input[type='radio'] {
    display: none;
}

label {
    border: var(--border);
    background-color: var(--bg-color);
    border-radius: var(--border-radius);
    min-width: var(--label-height);
    line-height: var(--label-height);
    text-align: center;
    color: inherit;
    font-size: 15pt;
}

label:hover {
    background-color: var(--secondary-color);
    cursor: pointer;
}

input[type='radio']:checked + label {
    background-color: var(--accent-color);
    border: var(--accent-border);
    color: var(--bg-color);
}
</style>
