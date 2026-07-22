<script setup lang="ts">
import { mdiDelete, mdiPlus } from '@mdi/js'

import { COLOR_PALETTES, toHexColor } from '@/utils/Colors'
import PanelButton from '@/components/PanelButton.vue'
import ColorInput from '@/components/ColorInput.vue'

interface Emits {
    (e: 'changeSingleColor', i: number, hex_color: string): void
    (e: 'changeAllColors', hex_colors: string[]): void
}
const emit = defineEmits<Emits>()

const hex_colors = defineModel<string[]>({ default: ['#000000'] })
</script>

<template>
    <div class="container">
        <div class="column">
            <PanelButton
                :mdi-path="mdiPlus"
                @click="
                    () => {
                        const colors_copy = hex_colors.slice()
                        colors_copy.unshift(
                            toHexColor({
                                red: Math.floor(Math.random() * 255),
                                green: Math.floor(Math.random() * 255),
                                blue: Math.floor(Math.random() * 255),
                            }),
                        )
                        emit('changeAllColors', colors_copy)
                        hex_colors = colors_copy
                    }
                "
            />
            <div v-for="(_, i) in hex_colors" :key="i" class="color-unit">
                <PanelButton
                    v-if="hex_colors!.length > 2"
                    :mdi-path="mdiDelete"
                    @click="
                        () => {
                            const colors_copy = hex_colors.slice()
                            colors_copy.splice(i, 1)
                            emit('changeAllColors', colors_copy)
                            hex_colors = colors_copy
                        }
                    "
                />
                <ColorInput
                    v-model="hex_colors[i]"
                    @animation="(hex_color) => emit('changeSingleColor', i, hex_color)"
                />
            </div>
        </div>
        <div class="column">
            <PanelButton
                v-for="[name, hex_palette] in COLOR_PALETTES"
                :key="name"
                :text="name"
                @click="
                    () => {
                        emit('changeAllColors', hex_palette)
                        hex_colors = hex_palette
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
