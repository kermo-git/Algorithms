<script setup lang="ts">
import PanelSection from '@/components/PanelSection.vue'
import RangeInput from '@/components/RangeInput.vue'

import type { ColorPoint } from './types'
import PanelButton from '@/components/PanelButton.vue'
import { mdiDelete, mdiPlus, mdiSwapVertical } from '@mdi/js'
import { lerpColors, parseHexColor, toHexColor } from '@/utils/Colors'

interface Props {
    modelValue: ColorPoint[]
}
const props = defineProps<Props>()

interface Emits {
    (e: 'update:modelValue', value: ColorPoint[]): void
}
const emit = defineEmits<Emits>()

function lerp(t: number, a: number, b: number) {
    return a + t * (b - a)
}

function onColorInput(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const i = Number(data.index)

    const color_points = props.modelValue
    color_points[i].color = element.value

    emit('update:modelValue', color_points.slice())
}

function onAddColorClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const i = Number(data.index)

    const color_points = props.modelValue
    const prev = color_points[i - 1]
    const next = color_points[i]

    const prev_color = parseHexColor(prev.color)
    const next_color = parseHexColor(next.color)
    const new_color = lerpColors(0.5, prev_color, next_color)

    color_points.splice(i, 0, {
        color: toHexColor(new_color),
        point: lerp(0.5, prev.point, next.point),
    })
    emit('update:modelValue', color_points.slice())
}

function onSwapClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const i = Number(data.index)

    const color_points = props.modelValue
    const temp = color_points[i].color
    color_points[i].color = color_points[i - 1].color
    color_points[i - 1].color = temp

    emit('update:modelValue', color_points.slice())
}

function onDeleteClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const i = Number(data.index)

    const color_points = props.modelValue
    color_points.splice(i, 1)

    emit('update:modelValue', color_points.slice())
}
</script>

<template>
    <template v-for="(color_point, i) in props.modelValue" :key="i">
        <div class="color-buttons">
            <input
                type="color"
                :style="`background-color: ${color_point.color}`"
                :value="color_point.color"
                :data-index="i"
                @input="onColorInput"
            />
            <p class="color-point-value">{{ color_point.point }}</p>
            <PanelButton
                v-if="i > 0"
                :mdi-path="mdiSwapVertical"
                :data-index="i"
                @click="onSwapClick"
            />
            <PanelButton
                v-if="i > 0"
                :mdi-path="mdiPlus"
                :data-index="i"
                @click="onAddColorClick"
            />
            <PanelButton
                v-if="props.modelValue.length > 2"
                :mdi-path="mdiDelete"
                :data-index="i"
                @click="onDeleteClick"
            />
        </div>
        <PanelSection>
            <p>0</p>
            <RangeInput
                class="slider"
                :min="0"
                :max="1"
                :step="0.01"
                :model-value="color_point.point"
                @update:model-value="
                    (value) => {
                        const color_points = props.modelValue
                        color_points[i].point = value!
                        emit('update:modelValue', color_points.slice())
                    }
                "
            />
            <p>1</p>
        </PanelSection>
    </template>
</template>

<style scoped>
input[type='color'] {
    height: 4em;
    aspect-ratio: 1;
    border-radius: 30%;
    border: var(--border);
    cursor: pointer;
}

input[type='color']:hover {
    border: var(--accent-border);
}

.slider {
    flex-grow: 1;
}

.color-buttons {
    width: 100%;
    display: flex;
    gap: 0.5em;
    align-items: center;
}

.color-point-value {
    margin-right: auto;
}
</style>
