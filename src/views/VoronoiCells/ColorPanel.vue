<script setup lang="ts">
import { computed } from 'vue'
import { mdiDelete, mdiPlus } from '@mdi/js'

import PanelButton from '@/components/PanelButton.vue'
import ColorInput from '@/components/ColorInput.vue'

import { parseHexColor, toHexColor } from '@/utils/Colors'

const colors = defineModel<Float32Array>()

const color_info = computed(() => {
    return Array(colors.value!.length / 4)
        .fill(0)
        .map((_, index) => {
            const offset = 4 * index

            return toHexColor({
                red: Math.round(colors.value![offset] * 255),
                green: Math.round(colors.value![offset + 1] * 255),
                blue: Math.round(colors.value![offset + 2] * 255),
            })
        })
})

function onColorInput(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const offset = 4 * Number(data.index)
    const color = parseHexColor(element.value)

    colors.value![offset] = color.red / 255
    colors.value![offset + 1] = color.green / 255
    colors.value![offset + 2] = color.blue / 255
    colors.value = colors.value!.subarray()
}

function onAddColorClick() {
    const result = new Float32Array(colors.value!.length + 4)
    result.set([Math.random(), Math.random(), Math.random(), 1], 0)
    result.set(colors.value!, 4)
    colors.value = result
}

function onDeleteClick(ev: Event) {
    const element = ev.currentTarget as HTMLInputElement
    const data = element.dataset
    const offset = 4 * Number(data.index)

    const result = new Float32Array(colors.value!.length - 4)

    if (offset > 0) {
        result.set(colors.value!.subarray(0, offset), 0)
    }
    if (offset < result.length) {
        result.set(colors.value!.subarray(offset + 4), offset)
    }
    colors.value = result.subarray()
}
</script>

<template>
    <PanelButton :mdi-path="mdiPlus" @click="onAddColorClick" />
    <template v-for="(hex_color, i) in color_info" :key="i">
        <div class="color-unit">
            <ColorInput :value="hex_color" :data-index="i" @input="onColorInput" />
            <PanelButton
                v-if="color_info.length > 2"
                :mdi-path="mdiDelete"
                :data-index="i"
                @click="onDeleteClick"
            />
        </div>
    </template>
</template>

<style scoped>
.color-unit {
    width: 100%;
    display: flex;
    gap: 0.5em;
    align-items: center;
    justify-content: center;
}
</style>
