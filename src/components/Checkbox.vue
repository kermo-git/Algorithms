<script setup lang="ts">
interface Props {
    text: string
    name: string
}
const props = defineProps<Props>()
const model = defineModel<boolean>()
defineOptions({ inheritAttrs: false })

function onChange(event: Event) {
    const element = event.target as HTMLInputElement
    model.value = element.checked
}
</script>

<template>
    <div class="checkbox-container">
        <input
            type="checkbox"
            v-bind="$attrs"
            :id="`${props.name}`"
            :name="props.name"
            :value="model"
            @change="onChange"
        />
        <label class="caption" :for="props.name">{{ props.text }}</label>
    </div>
</template>

<style scoped>
.checkbox-container {
    display: flex;
    justify-content: left;
    align-items: center;
    gap: var(--small-gap);
    box-sizing: border-box;
}

input[type='checkbox'] {
    height: 1.5rem;
    width: 1.5rem;
}

.caption {
    flex-grow: 1;
}
</style>
