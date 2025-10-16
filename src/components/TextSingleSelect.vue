<script setup lang="ts">
interface Props {
    text: string
    name: string
    options: string[]
}
const props = defineProps<Props>()
const model = defineModel()
</script>

<template>
    <fieldset>
        <legend>{{ props.text }}</legend>
        <template v-for="value in props.options" :key="value">
            <input
                type="radio"
                :id="`${props.name}-${value}`"
                :name="props.name"
                :value="value"
                v-model="model"
            />
            <label class="panel-button" :for="`${props.name}-${value}`">{{ value }}</label>
        </template>
    </fieldset>
</template>

<style scoped>
fieldset {
    border: var(--border);
    border-radius: 0.5em;
    padding: 1em;
    box-sizing: border-box;
    margin: 0;
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 1em;
    width: 100%;
}

input[type='radio'] {
    display: none;
}

label {
    border: var(--border);
    border-radius: 0.7em;
    background-color: var(--secondary-color);
    padding: 0.5em;
    font-size: inherit;
    color: inherit;
}

label:hover {
    border: var(--accent-border);
    cursor: pointer;
}

input[type='radio']:checked + label {
    border: var(--accent-border);
    background-color: var(--accent-color);
    color: var(--bg-color);
}
</style>
