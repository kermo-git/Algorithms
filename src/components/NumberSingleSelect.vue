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
        <div class="options" role="radiogroup" :aria-label="props.text">
            <button
                v-for="value in props.options"
                :key="value"
                role="radio"
                :aria-checked="model == value"
                @click="model = value"
            >
                {{ value }}
            </button>
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
}

.options button {
    border: var(--border);
    border-right: none;
    background-color: var(--bg-color);
    min-width: var(--button-height);
    height: var(--button-height);
    padding-left: 0.2rem;
    padding-right: 0.2rem;

    text-align: center;
    color: inherit;
    font-size: 15pt;
}

.options button:first-child {
    border-top-left-radius: var(--border-radius);
    border-bottom-left-radius: var(--border-radius);
}

.options button:last-child {
    border-top-right-radius: var(--border-radius);
    border-bottom-right-radius: var(--border-radius);
    border: var(--border);
}

.options button:hover {
    background-color: var(--secondary-color);
    cursor: pointer;
}

.options button[aria-checked='true'] {
    background-color: var(--accent-color);
    color: var(--bg-color);
    font-weight: bold;
}
</style>
