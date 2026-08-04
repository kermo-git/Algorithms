<script setup lang="ts">
import ColorInput from '@/components/ColorInput.vue'
import PanelButton from '@/components/PanelButton.vue'
import HBox from '@/components/HBox.vue'

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
        name: 'VIP',
        colors: ['#323232', '#FECB3E', '#FF87FD', '#009200']
    },
    {
        name: 'Pastel green',
        colors: ['#DAFFC1', '#91DB76', '#689C56', '#FFFFFF']
    },
    {
        name: 'Amethyst',
        colors: ['#E6ABFF', '#AC51E4', '#5F158B', '#FAF2FA']
    },
    {
        name: 'Ice',
        colors: ['#24D6F2', '#1B94BF', '#B1F7FF', '#0C4B8A']
    },
    {
        name: 'Techno',
        colors: ['#323232', '#00CE00', '#DB04AA', '#0144DB']
    },
    {
        name: 'Funky',
        colors: ['#83DE08', '#7000DD', '#FB0D7A', '#FFF3E3']
    },
    {
        name: 'Magic',
        colors: ['#23A185', '#235DBE', '#EA93E4', '#D1E64B']
    }
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
    <HBox>
        <template v-for="(color, i) in props.modelValue" :key="i">
            <ColorInput
                :model-value="color"
                @update:model-value="
                    (new_color?: string) => {
                        const color_value = new_color || '#000000'
                        const before = props.modelValue.slice(0, i)
                        const after = props.modelValue.slice(i + 1)
                        const new_palette = before
                            .concat([color_value])
                            .concat(after)
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
                <span type="mdi" class="mdi mdi-swap-horizontal" />
            </button>
        </template>
    </HBox>
    <HBox class="palette-choices">
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
    </HBox>
</template>

<style scoped>
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

.palette-choices > button {
    flex-basis: 0;
    flex-grow: 1;
}
</style>
