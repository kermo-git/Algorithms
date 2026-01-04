<script setup lang="ts">
interface Props {
    text: string
    name: string
    options: number[]
}
const props = defineProps<Props>()
const model = defineModel()
</script>

<template>
    <div class="label-options">
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
    </div>
</template>

<style scoped>
.label-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
    width: 100%;
}

.caption {
    flex-basis: 20%;
    flex-grow: 1;
}

.options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
}

input[type='radio'] {
    display: none;
}

label {
    border: var(--border);
    border-radius: 0.5em;
    background-color: var(--bg-color);
    min-width: 2em;
    height: 2em;
    text-align: center;
    line-height: 2em;
    font-size: inherit;
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
