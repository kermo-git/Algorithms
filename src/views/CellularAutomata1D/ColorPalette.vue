<script setup lang="ts">
import ColorInput from '@/components/ColorInput.vue'
import HBox from '@/components/HBox.vue'

interface Props {
    n: number
}
const props = defineProps<Props>()
const hex_colors = defineModel<string[]>({ default: () => ['#000000'] })

function onSwapClick(ev: Event) {
    const data = (ev.currentTarget as HTMLElement).dataset
    const i1 = Number(data.i1)
    const i2 = Number(data.i2)

    const temp = hex_colors.value[i1]
    hex_colors.value[i1] = hex_colors.value[i2]
    hex_colors.value[i2] = temp
    hex_colors.value = hex_colors.value.slice()
}
</script>

<template>
    <HBox justify="center">
        <p class="label">Colors</p>
        <template v-for="i in n" :key="i">
            <ColorInput
                v-model="hex_colors[i - 1]"
                @update:model-value="
                    (new_color) => {
                        hex_colors[i - 1] = new_color
                        hex_colors = hex_colors.slice()
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
