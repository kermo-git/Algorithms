<script setup lang="ts">
import ColorInput from '@/components/ColorInput.vue'
import HBox from '@/components/HBox.vue'

interface Props {
    modelValue: string[]
    n: number
}
const props = defineProps<Props>()

interface Emits {
    (e: 'update:modelValue', value: string[]): void
}
const emit = defineEmits<Emits>()

function onSwapClick(ev: Event) {
    const data = (ev.currentTarget as HTMLElement).dataset
    const i1 = Number(data.i1)
    const i2 = Number(data.i2)

    const new_palette = props.modelValue.slice()
    const temp = new_palette[i1]
    new_palette[i1] = new_palette[i2]
    new_palette[i2] = temp

    emit('update:modelValue', new_palette)
}
</script>

<template>
    <HBox justify="center">
        <p class="label">Colors</p>
        <template v-for="i in n" :key="i">
            <ColorInput
                :model-value="modelValue[i - 1]"
                @update:model-value="
                    (new_color?: string) => {
                        const color_value = new_color || '#000000'
                        const before = modelValue.slice(0, i - 1)
                        const after = modelValue.slice(i)
                        const new_palette = before
                            .concat([color_value])
                            .concat(after)
                        emit('update:modelValue', new_palette)
                    }
                "
            />
            <button
                v-if="i < n"
                :data-i1="i - 1"
                :data-i2="i"
                class="swap"
                @click="onSwapClick"
            >
                <span type="mdi" class="mdi mdi-swap-horizontal" />
            </button>
        </template>
    </HBox>
</template>

<style scoped>
.label {
    flex-grow: 1;
}

.swap {
    background-color: transparent;
    border: none;
    color: var(--text-color);
    padding: 0;
    cursor: pointer;
    font-size: 20pt;
}

.swap:hover {
    color: var(--accent-color);
}
</style>
