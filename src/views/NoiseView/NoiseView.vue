<script setup lang="ts">
import { computed, ref } from 'vue'
import { Matrix } from '@/utils/Matrix'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelSection from '@/components/PanelSection.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import TabControl from '@/components/TabControl.vue'
import RangeInput from '@/components/RangeInput.vue'

import type { ColorPoint } from './types'
import { type Noise2D, type Noise3D, type powerOfTwo } from './Noise/Noise'
import { Worley2D, Worley3D } from './Noise/Worley'
import { Perlin2D, Perlin3D } from './Noise/Perlin'
import { Simplex2D, Simplex3D } from './Noise/Simplex'
import ColorPanel from './ColorPanel.vue'
import PixelCanvas from './PixelCanvas.vue'

const colors = ref<ColorPoint[]>([
    { color: '#FFFFFF', point: 0 },
    { color: '#000000', point: 1 },
])
const color_type = ref('Continuous')

const algorithm = ref('Worley')
const dimension = ref('2D')
const z_coord = ref(0)
const resolution = ref(512)
const grid_size = ref(16)
const n_octaves = ref(1)
const persistence = ref(0.5)

const noise = computed<Noise2D | Noise3D>(() => {
    if (algorithm.value === 'Worley') {
        if (dimension.value === '2D') {
            return new Worley2D()
        } else {
            return new Worley3D()
        }
    } else if (algorithm.value === 'Perlin') {
        if (dimension.value === '2D') {
            return new Perlin2D()
        } else {
            return new Perlin3D()
        }
    }
    if (dimension.value === '2D') {
        return new Simplex2D()
    } else {
        return new Simplex3D()
    }
})

const matrix = computed(() => {
    const height_px = resolution.value
    const width_px = resolution.value
    const matrix_size = height_px * width_px
    const matrix = new Matrix(height_px, width_px, 0)

    let amplitude = 1
    let frequency_x = grid_size.value / width_px
    let frequency_y = grid_size.value / height_px

    for (let i = 0; i < n_octaves.value; i++) {
        for (let i = 0; i < matrix_size; i++) {
            const row = Math.trunc(i / width_px)
            const col = i % width_px

            const value = noise.value.noise(col * frequency_x, row * frequency_x, z_coord.value)
            matrix.data[i] += amplitude * value
        }
        amplitude *= persistence.value
        frequency_x *= 2
        frequency_y *= 2
    }
    let max_value = 0
    let min_value = 0

    for (let i = 0; i < matrix_size; i++) {
        min_value = Math.min(min_value, matrix.data[i])
        max_value = Math.max(max_value, matrix.data[i])
    }
    const multiplier = 1 / (max_value - min_value)
    for (let i = 0; i < matrix_size; i++) {
        matrix.data[i] = (matrix.data[i] - min_value) * multiplier
    }
    return matrix
})
const activeTab = ref('Configuration')
</script>

<template>
    <div class="container">
        <TabControl :captions="['Configuration', 'Colors']" v-model="activeTab">
            <template v-if="activeTab === 'Configuration'">
                <TextSingleSelect
                    text="Noise algorithm"
                    name="algorithm"
                    :options="['Worley', 'Perlin', 'Simplex']"
                    v-model="algorithm"
                />

                <TextSingleSelect
                    text="Noise dimension"
                    name="dimension"
                    :options="['2D', '3D']"
                    v-model="dimension"
                />

                <template v-if="dimension === '3D'">
                    <p>Z coordinate: {{ z_coord }}</p>

                    <PanelSection>
                        <p>0</p>
                        <RangeInput
                            class="label-field"
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="z_coord"
                        />
                        <p>1</p>
                    </PanelSection>
                </template>

                <NumberSingleSelect
                    text="Canvas resolution px"
                    name="resolution"
                    :options="[256, 512, 1024]"
                    v-model="resolution"
                />

                <NumberSingleSelect
                    text="Grid size"
                    name="grid_size"
                    :options="[4, 8, 16, 32, 64]"
                    v-model="grid_size"
                />

                <NumberSingleSelect
                    text="Octaves"
                    name="n_octaves"
                    :options="[1, 2, 3, 4, 5]"
                    v-model="n_octaves"
                />

                <template v-if="n_octaves > 1">
                    <p>Persistence: {{ persistence }}</p>

                    <PanelSection>
                        <p>0</p>
                        <RangeInput
                            class="label-field"
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="persistence"
                        />
                        <p>1</p>
                    </PanelSection>
                </template>
            </template>
            <template v-else>
                <TextSingleSelect
                    text="Continuous colors"
                    name="dimension"
                    :options="['Discrete', 'Continuous']"
                    v-model="color_type"
                />
                <ColorPanel v-model="colors" />
            </template>
        </TabControl>
        <PixelCanvas
            class="canvas"
            :matrix="matrix"
            :colors="colors"
            :continuous-colors="color_type === 'Continuous'"
        />
    </div>
</template>

<style scoped>
.container {
    display: grid;
    grid-template-columns: 30% 70%;
    flex-grow: 1;
    overflow-y: scroll;
}

.field {
    width: 100%;
}

.label-field {
    flex-grow: 1;
}
</style>
