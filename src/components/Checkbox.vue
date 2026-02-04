<script setup lang="ts">
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiCheck, mdiPlay } from '@mdi/js'

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
    console.log(mdiPlay)
}
</script>

<template>
    <div class="component">
        <span class="checkbox-wrapper">
            <input
                type="checkbox"
                v-bind="$attrs"
                :id="`${props.name}`"
                :name="props.name"
                :value="model"
                @change="onChange"
            />
            <svg-icon class="checkbox-icon" type="mdi" :path="model ? mdiCheck : ''" />
        </span>
        <label class="caption" :for="props.name">{{ props.text }}</label>
    </div>
</template>

<style scoped>
.component {
    box-sizing: border-box;
    height: var(--button-height);
    display: flex;
    justify-content: left;
    align-items: center;
    gap: 0;
}

.checkbox-wrapper {
    position: relative;
    height: 100%;
    aspect-ratio: 1;
}

.checkbox-icon {
    position: absolute;
    top: 0;
    left: 0;
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

input[type='checkbox']:checked,
input[type='checkbox']:hover {
    border: var(--accent-border);
}

input[type='checkbox']:checked + .checkbox-icon {
    color: var(--accent-color);
}
.caption {
    flex-grow: 1;
}

.caption {
    height: 100%;
    line-height: 2.5rem;
    padding-left: var(--small-gap);
}
</style>
