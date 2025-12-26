<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Matrix } from '@/utils/Matrix'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'

import type { Color } from '@/utils/Colors'
import { type powerOfTwo } from '@/views/NoiseView/Noise/Noise'
import { Simplex2D, Simplex3D } from '@/views/NoiseView/Noise/Simplex'
import { Perlin2D, Perlin3D } from '@/views/NoiseView/Noise/Perlin'
import Display from './Display.vue'
import TabControl from '@/components/TabControl.vue'
import { Worley2D, Worley3D } from '@/views/NoiseView/Noise/Worley'
import CodeEditor from './CodeEditor.vue'
import PanelButton from '@/components/PanelButton.vue'
import { mdiPlay } from '@mdi/js'

const resolution = ref(512)
const grid_size = ref<powerOfTwo>(32)

const starter_code = `/*
 * Input coordinates: 
 * x and y range from 0 to grid size
 * 
 * Noise functions:
 * worley_2D, worley_3D: between 0 and 1
 * perlin_2D, perlin_3D: between -1 and 1
 * simplex_2D, simplex_3D: between -1 and 1
 */

const w = worley_2D.noise(x, y)
const s = simplex_3D.noise(
    0.1 * x, 0.1 * y, 0
)
const n = 2 * w * Math.abs(s)

return {
    red: 70 * n,
    green: 255 * n,
    blue: 70 * n,
}`

const editor_code = ref(starter_code)
const executable_code = ref(starter_code)

const matrix = computed(() => {
    const black = { red: 0, green: 0, blue: 0 }

    const height_px = resolution.value
    const width_px = resolution.value
    const matrix_size = height_px * width_px

    const worley_2D = new Worley2D()
    const worley_3D = new Worley3D()
    const perlin_2D = new Perlin2D()
    const perlin_3D = new Perlin3D()
    const simplex_2D = new Simplex2D()
    const simplex_3D = new Simplex3D()

    const calculateColor = new Function(
        'x',
        'y',
        'worley_2D',
        'worley_3D',
        'perlin_2D',
        'perlin_3D',
        'simplex_2D',
        'simplex_3D',
        executable_code.value,
    )

    const color_matrix = new Matrix<Color>(height_px, width_px, black)

    const frequency_x = grid_size.value / width_px
    const frequency_y = grid_size.value / height_px

    for (let m = 0; m < matrix_size; m++) {
        const col = m % width_px
        const row = Math.trunc(m / width_px)

        const noise_x = col * frequency_x
        const noise_y = row * frequency_y

        color_matrix.data[m] = calculateColor(
            noise_x,
            noise_y,
            worley_2D,
            worley_3D,
            perlin_2D,
            perlin_3D,
            simplex_2D,
            simplex_3D,
        )
    }
    return color_matrix
})
</script>

<template>
    <div class="container">
        <TabControl :captions="[]">
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

            <PanelButton
                :mdi-path="mdiPlay"
                text="Run code"
                @click="() => (executable_code = editor_code)"
            />
            <CodeEditor v-model="editor_code" />
        </TabControl>
        <Display :matrix="matrix" />
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
