<script setup lang="ts">
import { mdiDelete, mdiPlus } from '@mdi/js'

import PanelButton from '@/components/PanelButton.vue'
import ColorInput from '@/components/ColorInput.vue'
import { COLOR_PALETTES, toHexColor } from '@/utils/Colors'

const colors = defineModel<string[]>()
</script>

<template>
    <div class="container">
        <div class="column">
            <PanelButton
                :mdi-path="mdiPlus"
                @click="
                    () => {
                        const colors_copy = colors!.slice()
                        colors_copy.unshift(
                            toHexColor({
                                red: Math.floor(Math.random() * 255),
                                green: Math.floor(Math.random() * 255),
                                blue: Math.floor(Math.random() * 255),
                            }),
                        )

                        colors = colors_copy
                    }
                "
            />
            <div v-for="(hex_color, i) in colors" :key="i" class="color-unit">
                <PanelButton
                    v-if="colors!.length > 2"
                    :mdi-path="mdiDelete"
                    @click="
                        () => {
                            const colors_copy = colors!.slice()
                            colors_copy.splice(i, 1)
                            colors = colors_copy
                        }
                    "
                />
                <ColorInput
                    :model-value="hex_color"
                    :data-index="i"
                    @update:model-value="
                        (new_color?: string) => {
                            const colors_copy = colors!.slice()
                            colors_copy.splice(i, 1, new_color!)
                            colors = colors_copy
                        }
                    "
                />
            </div>
        </div>
        <div class="column">
            <PanelButton
                v-for="[name, hex_colors] in COLOR_PALETTES"
                :key="name"
                :text="name"
                @click="
                    () => {
                        colors = hex_colors
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
