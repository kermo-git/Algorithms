<script setup lang="ts">
import { computed } from 'vue'
import { mdiDelete, mdiPlus } from '@mdi/js'

import PanelButton from '@/components/PanelButton.vue'
import ColorInput from '@/components/ColorInput.vue'

import { parseHexColor, toHexColor, shaderColorArray } from '@/utils/Colors'

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
    <div class="container">
        <div class="column">
            <PanelButton :mdi-path="mdiPlus" @click="onAddColorClick" />
            <div v-for="(hex_color, i) in color_info" :key="i" class="color-unit">
                <PanelButton
                    v-if="color_info.length > 2"
                    :mdi-path="mdiDelete"
                    :data-index="i"
                    @click="onDeleteClick"
                />
                <ColorInput
                    :model-value="hex_color"
                    :data-index="i"
                    @update:model-value="
                        (new_color?: string) => {
                            const color = parseHexColor(new_color || '#000000')
                            const offset = 4 * i

                            colors![offset] = color.red / 255
                            colors![offset + 1] = color.green / 255
                            colors![offset + 2] = color.blue / 255
                            colors = colors!.subarray()
                        }
                    "
                />
            </div>
        </div>
        <div class="column">
            <PanelButton
                text="Biomes"
                @click="
                    () => {
                        colors = shaderColorArray([
                            '#8AC90A',
                            '#129145',
                            '#9ED6F2',
                            '#ED9C1A',
                            '#E5D96E',
                            '#1730DB',
                        ])
                    }
                "
            />
            <PanelButton
                text="Rainbow"
                @click="
                    () => {
                        colors = shaderColorArray([
                            '#BE38F3',
                            '#0061FF',
                            '#00C7FC',
                            '#00F900',
                            '#F5EC00',
                            '#FFAA00',
                            '#FF4013',
                        ])
                    }
                "
            />
            <PanelButton
                text="Fire & Ice"
                @click="
                    () => {
                        colors = shaderColorArray([
                            '#0B90B7',
                            '#00C7FC',
                            '#94E3FE',
                            '#FAB700',
                            '#FF6A00',
                            '#EA4F00',
                        ])
                    }
                "
            />
            <PanelButton
                text="Lava"
                @click="
                    () => {
                        colors = shaderColorArray([
                            '#FEC700',
                            '#FF6A00',
                            '#E32400',
                            '#606060',
                            '#444444',
                        ])
                    }
                "
            />
        </div>
    </div>
</template>

<style scoped>
.container {
    width: 100%;
    display: flex;
    justify-content: space-around;
}

.column {
    display: flex;
    flex-direction: column;
    gap: var(--small-gap);
}

.color-unit {
    width: 100%;
    display: flex;
    gap: var(--small-gap);
    align-items: center;
    justify-content: center;
}
</style>
