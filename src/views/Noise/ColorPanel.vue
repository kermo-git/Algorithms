<script setup lang="ts">
import { mdiDelete, mdiPlus, mdiSwapVertical } from '@mdi/js'

import RangeInput from '@/components/RangeInput.vue'
import PanelButton from '@/components/PanelButton.vue'

import { parseHexColor, toHexColor } from '@/utils/Colors'
import { computed } from 'vue'
import ColorInput from '@/components/ColorInput.vue'

interface Props {
    /**
     * This array represents colors for procedural noise generation and it can be sent directly to WebGPU shader.
     *
     * It is formatted like this: [R1, G1, B1, P1, R2, G2, ...]
     *
     * - RN, GN and BN are red, green and blue color components
     * - PN is a cutoff point that determines which noise values interpolate which colors.
     */
    modelValue: Float32Array<ArrayBuffer>
}
const props = defineProps<Props>()

interface Emits {
    (e: 'update:modelValue', value: Float32Array<ArrayBuffer>): void
}
const emit = defineEmits<Emits>()

function lerp(t: number, a: number, b: number) {
    return a + t * (b - a)
}

const color_info = computed(() => {
    return Array(props.modelValue.length / 4)
        .fill(0)
        .map((_, index) => {
            const color_points = props.modelValue
            const offset = 4 * index

            return {
                hexColor: toHexColor({
                    red: Math.round(color_points[offset] * 255),
                    green: Math.round(color_points[offset + 1] * 255),
                    blue: Math.round(color_points[offset + 2] * 255),
                }),
                point: color_points[offset + 3],
            }
        })
})

function onColorInput(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const offset = 4 * Number(data.index)

    const color = parseHexColor(element.value)

    const color_points = props.modelValue
    color_points[offset] = color.red / 255
    color_points[offset + 1] = color.green / 255
    color_points[offset + 2] = color.blue / 255

    emit('update:modelValue', color_points.subarray())
}

function onAddColorClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const next_offset = 4 * Number(data.index)
    const prev_offset = next_offset - 4

    const color_points = props.modelValue
    const prev_red = color_points[prev_offset]
    const prev_green = color_points[prev_offset + 1]
    const prev_blue = color_points[prev_offset + 2]
    const prev_point = color_points[prev_offset + 3]

    const next_red = color_points[next_offset]
    const next_green = color_points[next_offset + 1]
    const next_blue = color_points[next_offset + 2]
    const next_point = color_points[next_offset + 3]

    const new_red = lerp(0.5, prev_red, next_red)
    const new_green = lerp(0.5, prev_green, next_green)
    const new_blue = lerp(0.5, prev_blue, next_blue)
    const new_point = lerp(0.5, prev_point, next_point)

    const result = new Float32Array(color_points.length + 4)
    result.set(color_points.subarray(0, next_offset), 0)
    result.set([new_red, new_green, new_blue, new_point], next_offset)
    result.set(color_points.subarray(next_offset), next_offset + 4)

    emit('update:modelValue', result)
}

function onSwapClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const current = 4 * Number(data.index)
    const prev = current - 4

    const color_points = props.modelValue
    const temp_red = color_points[current]
    const temp_green = color_points[current + 1]
    const temp_blue = color_points[current + 2]

    color_points[current] = color_points[prev]
    color_points[current + 1] = color_points[prev + 1]
    color_points[current + 2] = color_points[prev + 2]

    color_points[prev] = temp_red
    color_points[prev + 1] = temp_green
    color_points[prev + 2] = temp_blue

    emit('update:modelValue', color_points.subarray())
}

function onDeleteClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const offset = 4 * Number(data.index)

    const color_points = props.modelValue
    const result = new Float32Array(color_points.length - 4)

    if (offset > 0) {
        result.set(color_points.subarray(0, offset), 0)
    }
    if (offset < result.length) {
        result.set(color_points.subarray(offset + 4), offset)
    }
    emit('update:modelValue', result.subarray())
}
</script>

<template>
    <template v-for="(info, i) in color_info" :key="i">
        <div class="color-buttons">
            <ColorInput :value="info.hexColor" :data-index="i" @input="onColorInput" />
            <p class="color-point-value">{{ info.point.toFixed(2) }}</p>
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
                v-if="color_info.length > 2"
                :mdi-path="mdiDelete"
                :data-index="i"
                @click="onDeleteClick"
            />
        </div>
        <RangeInput
            :min="0"
            :max="1"
            :step="0.01"
            :model-value="info.point"
            @update:model-value="
                (value) => {
                    const color_points = props.modelValue
                    color_points[4 * i + 3] = value!
                    emit('update:modelValue', color_points.subarray())
                }
            "
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
