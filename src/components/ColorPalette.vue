<script setup lang="ts">
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiSwapHorizontal } from '@mdi/js'

import PanelButton from './PanelButton.vue'
import PanelSection from './PanelSection.vue'
import ColorInput from './ColorInput.vue'

interface Props {
    modelValue: string[]
}
const props = defineProps<Props>()

interface Emits {
    (e: 'update:modelValue', value: string[]): void
}
const emit = defineEmits<Emits>()

const palettes = [
    {
        name: 'Techno',
        colors: ['#323232', '#00CE00', '#DB04AA', '#0144DB'],
    },
    {
        name: 'Funky',
        colors: ['#83DE08', '#7000DD', '#FB0D7A', '#FFF3E3'],
    },
    {
        name: 'Magic',
        colors: ['#23A185', '#235DBE', '#EA93E4', '#D1E64B'],
    },
    {
        name: 'Forest',
        colors: ['#7CD87C', '#32944F', '#665F35', '#2B2B2B'],
    },
    {
        name: 'Amethyst',
        colors: ['#E6ABFF', '#AC51E4', '#5F158B', '#FAF2FA'],
    },
    {
        name: 'Ice',
        colors: ['#24D6F2', '#1B94BF', '#B1F7FF', '#0C4B8A'],
    },
    {
        name: 'Satellite photo',
        colors: ['#E5D677', '#32944F', '#002E7A', '#FFF3E3'],
    },
]

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
    <PanelSection>
        <template v-for="(color, i) in props.modelValue" :key="i">
            <ColorInput
                :value="color"
                @input="
                    (ev: Event) => {
                        const before = props.modelValue.slice(0, i)
                        const new_color = (ev.target as HTMLInputElement).value
                        const after = props.modelValue.slice(i + 1)
                        const new_palette = before.concat([new_color]).concat(after)
                        emit('update:modelValue', new_palette)
                    }
                "
            />
            <button
                v-if="i < props.modelValue.length - 1"
                :data-i1="i"
                :data-i2="i + 1"
                class="swap"
                @click="onSwapClick"
            >
                <svg-icon type="mdi" :path="mdiSwapHorizontal" />
            </button>
        </template>
    </PanelSection>
    <PanelSection>
        <PanelButton
            v-for="palette in palettes"
            :key="palette.name"
            :text="palette.name"
            @click="
                () => {
                    emit('update:modelValue', palette.colors)
                }
            "
        />
    </PanelSection>
</template>

<style scoped>
.swap {
    background-color: transparent;
    border: none;
    color: var(--text-color);
    padding: 0;
    cursor: pointer;
}

.swap:hover {
    color: var(--accent-color);
}
</style>
