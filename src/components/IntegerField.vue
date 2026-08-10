<script setup lang="ts">
import { ref } from 'vue'
import PanelField from './PanelField.vue'

interface Props {
    min: number
    max: number
    width: string
}

const props = defineProps<Props>()
const active_value = defineModel<number>({ default: 0 })
const editor_value = ref(active_value.value)

function onChange(ev: Event) {
    const str_value = (ev.target as HTMLInputElement).value
    const number_value = Number(str_value)
    const fixed_value = Math.max(Math.min(number_value, props.max), props.min)
    active_value.value = fixed_value
    editor_value.value = fixed_value
}
</script>

<template>
    <PanelField
        ref="field"
        :container-width="width"
        left-button-mdi-icon="less-than"
        :left-button-disabled="active_value <= min"
        @left-button-click="
            () => {
                editor_value = editor_value - 1
                active_value = active_value - 1
            }
        "
        right-button-mdi-icon="greater-than"
        @right-button-click="
            () => {
                editor_value = editor_value + 1
                active_value = active_value + 1
            }
        "
        :right-button-disabled="active_value >= max"
        type="number"
        v-model="editor_value"
        @change="onChange"
    />
</template>
