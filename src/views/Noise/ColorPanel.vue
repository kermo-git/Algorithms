<script setup lang="ts">
import { mdiDelete, mdiPlus, mdiSwapVertical } from '@mdi/js'

import { lerpColors, parseHexColor, toHexColor } from '@/utils/Colors'
import RangeInput from '@/components/RangeInput.vue'
import PanelButton from '@/components/PanelButton.vue'
import ColorInput from '@/components/ColorInput.vue'

interface Emits {
    (e: 'changeSingleColor', i: number, hex_color: string): void
    (e: 'changeSinglePoint', i: number, value: number): void
    (e: 'changeAllColorPoints', hex_colors: string[], points: number[]): void
}
const emit = defineEmits<Emits>()

const colors = defineModel<string[]>('colors', { default: ['#000000', '#FFFFFF'] })
const points = defineModel<number[]>('points', { default: [0, 1] })

function lerp(t: number, a: number, b: number) {
    return a + t * (b - a)
}

function onAddColorClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const next_index = Number(data.index)

    const prev_hex = colors.value[next_index - 1]
    const prev_point = points.value[next_index - 1]

    const next_hex = colors.value[next_index]
    const next_point = points.value[next_index]

    const prev_color = parseHexColor(prev_hex)
    const next_color = parseHexColor(next_hex)

    const new_color = toHexColor(lerpColors(0.5, prev_color, next_color))
    const new_point = lerp(0.5, prev_point, next_point)

    const new_colors = colors.value
        .slice(0, next_index)
        .concat([new_color])
        .concat(colors.value.slice(next_index))

    const new_points = points.value
        .slice(0, next_index)
        .concat([new_point])
        .concat(points.value.slice(next_index))

    emit('changeAllColorPoints', new_colors, new_points)
    colors.value = new_colors
    points.value = new_points
}

function onSwapClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const current_index = Number(data.index)
    const prev_index = current_index - 1

    const temp_color = colors.value[current_index]
    colors.value[current_index] = colors.value[prev_index]
    colors.value[prev_index] = temp_color

    emit('changeAllColorPoints', colors.value, points.value)
}

function onDeleteClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const index = Number(data.index)

    colors.value.splice(index, 1)
    points.value.splice(index, 1)

    emit('changeAllColorPoints', colors.value, points.value)
}
</script>

<template>
    <template v-for="(_, i) in colors" :key="i">
        <div class="color-buttons">
            <ColorInput
                v-model="colors[i]"
                @animation="(hex_color) => emit('changeSingleColor', i, hex_color)"
            />
            <p class="color-point-value">{{ points![i].toFixed(2) }}</p>
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
                v-if="colors!.length > 2"
                :mdi-path="mdiDelete"
                :data-index="i"
                @click="onDeleteClick"
            />
        </div>
        <RangeInput
            :min="0"
            :max="1"
            :step="0.01"
            v-model="points[i]"
            @animation="(value: number) => emit('changeSinglePoint', i, value)"
        />
    </template>
</template>

<style scoped>
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
