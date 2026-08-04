<script setup lang="ts">
import PanelButton from './PanelButton.vue'

defineOptions({ inheritAttrs: false })

interface Props {
    containerWidth?: string
    fieldWidth?: string
    leftButtonMdiIcon?: string
    leftButtonDisabled?: boolean
    rightButtonMdiIcon?: string
    rightButtonDisabled?: boolean
}
const props = defineProps<Props>()

interface Emits {
    (e: 'leftButtonClick'): void
    (e: 'rightButtonClick'): void
}
const emit = defineEmits<Emits>()

const model = defineModel()

function onFieldClick(ev: Event) {
    const element = ev.target as HTMLInputElement
    element?.select()
    ev.stopPropagation()
}
</script>

<template>
    <div class="field-container">
        <PanelButton
            v-if="leftButtonMdiIcon"
            class="left-button"
            :disabled="leftButtonDisabled"
            :mdi-icon="leftButtonMdiIcon"
            @click="() => emit('leftButtonClick')"
        />
        <input
            :class="{
                field: true,
                'left-button-field': leftButtonMdiIcon,
                'right-button-field': rightButtonMdiIcon
            }"
            v-bind="$attrs"
            @click="onFieldClick"
            v-model="model"
        />
        <PanelButton
            v-if="props.rightButtonMdiIcon"
            class="right-button"
            :disabled="rightButtonDisabled"
            :mdi-icon="props.rightButtonMdiIcon"
            @click="() => emit('rightButtonClick')"
        />
    </div>
</template>

<style scoped>
.field-container {
    width: v-bind(containerWidth);
    display: flex;
    gap: 0;
}

.left-button,
.right-button {
    padding: 0;
}

.left-button {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.right-button {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.field[type='number']::-webkit-inner-spin-button,
.field[type='number']::-webkit-outer-spin-button {
    appearance: textfield;
    -webkit-appearance: none;
    -moz-appearance: textfield;
}
.field {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 15pt;
    text-align: center;
    background-color: inherit;
    color: inherit;
    border: var(--border);
    border-radius: var(--border-radius);
    height: var(--button-height);
    box-sizing: border-box;
    text-overflow: ellipsis;
}

.field:focus {
    border: var(--accent-border);
    outline: none;
}

.field.left-button-field {
    border-left: none;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.field.right-button-field {
    border-right: none;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}
</style>
