<script setup lang="ts">
import { mdiDelete, mdiPlus } from '@mdi/js'

import PanelButton from '@/components/PanelButton.vue'
import ColorInput from '@/components/ColorInput.vue'
import { toHexColor } from '@/utils/Colors'

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
                text="Biomes"
                @click="
                    () => {
                        colors = ['#8AC90A', '#129145', '#9ED6F2', '#ED9C1A', '#E5D96E', '#1730DB']
                    }
                "
            />
            <PanelButton
                text="Rainbow"
                @click="
                    () => {
                        colors = [
                            '#BE38F3',
                            '#0061FF',
                            '#00C7FC',
                            '#00F900',
                            '#F5EC00',
                            '#FFAA00',
                            '#FF4013',
                        ]
                    }
                "
            />
            <PanelButton
                text="Fire & Ice"
                @click="
                    () => {
                        colors = ['#0B90B7', '#00C7FC', '#94E3FE', '#FAB700', '#FF6A00', '#EA4F00']
                    }
                "
            />
            <PanelButton
                text="Lava"
                @click="
                    () => {
                        colors = ['#FEC700', '#FF6A00', '#E32400', '#606060', '#444444']
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
