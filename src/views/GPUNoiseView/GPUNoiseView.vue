<script setup lang="ts">
import { ref, watch } from 'vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import TabControl from '@/components/TabControl.vue'
import RangeInput from '@/components/RangeInput.vue'

import ColorPanel from './ColorPanel.vue'
import Canvas from '@/components/Canvas.vue'
import ComputeRenderer, { type RenderLogic } from './ComputeRenderer'
import { Perlin2D, Perlin3D } from './Noise/Perlin'
import { Worley2D, Worley3D } from './Noise/Worley'
import { defaultColorPoints, type NoiseUniforms } from './NoiseUtils'
import { Value2D, Value3D } from './Noise/Value'
import { Simplex2D, Simplex3D } from './Noise/Simplex'
import { Cubic2D, Cubic3D } from './Noise/Cubic'

const color_points = ref(defaultColorPoints)
const algorithm = ref('Perlin')
const dimension = ref<'2D' | '3D'>('2D')
const domain_transform = ref('None')
const domain_warp_strength = ref(2)
const z_coord = ref(0)
const grid_size = ref(16)
const n_octaves = ref(1)
const persistence = ref(0.5)
const activeTab = ref('Configuration')

function createRenderer(algorithm: string, dimension: '2D' | '3D') {
    let render_logic: RenderLogic<NoiseUniforms>

    if (algorithm.startsWith('Worley')) {
        const second_closest = algorithm === 'Worley (2nd closest)'

        if (dimension === '2D') {
            render_logic = new Worley2D(second_closest)
        } else {
            render_logic = new Worley3D(second_closest)
        }
    } else if (algorithm === 'Value') {
        if (dimension === '2D') {
            render_logic = new Value2D()
        } else {
            render_logic = new Value3D()
        }
    } else if (algorithm === 'Simplex') {
        if (dimension === '2D') {
            render_logic = new Simplex2D()
        } else {
            render_logic = new Simplex3D()
        }
    } else if (algorithm === 'Cubic') {
        if (dimension === '2D') {
            render_logic = new Cubic2D()
        } else {
            render_logic = new Cubic3D()
        }
    } else {
        if (dimension === '2D') {
            render_logic = new Perlin2D()
        } else {
            render_logic = new Perlin3D()
        }
    }
    return new ComputeRenderer(render_logic)
}
let renderer = createRenderer(algorithm.value, dimension.value)
let canvas_element: HTMLCanvasElement | null = null

function onCanvasReady(canvas: HTMLCanvasElement) {
    canvas_element = canvas
    renderer.init(canvas, {
        n_grid_columns: grid_size.value,
        z_coord: z_coord.value,
        color_points: color_points.value,
    })
}

watch(grid_size, (new_grid_size) => {
    renderer.update({
        n_grid_columns: new_grid_size,
        z_coord: null,
        color_points: null,
    })
})

watch(z_coord, (new_z_coord) => {
    renderer.update({
        n_grid_columns: null,
        z_coord: new_z_coord,
        color_points: null,
    })
})

watch(color_points, () => {
    renderer.update({
        n_grid_columns: null,
        z_coord: null,
        color_points: color_points.value,
    })
})

watch(dimension, (new_dimension) => {
    if (canvas_element !== null) {
        renderer.cleanup()
        renderer = createRenderer(algorithm.value, new_dimension)
        renderer.init(canvas_element, {
            n_grid_columns: grid_size.value,
            z_coord: z_coord.value,
            color_points: color_points.value,
        })
    }
})

watch(algorithm, (new_algorithm) => {
    if (canvas_element !== null) {
        renderer.cleanup()
        renderer = createRenderer(new_algorithm, dimension.value)
        renderer.init(canvas_element, {
            n_grid_columns: grid_size.value,
            z_coord: z_coord.value,
            color_points: color_points.value,
        })
    }
})
</script>

<template>
    <div class="container">
        <TabControl :captions="['Configuration', 'Colors']" v-model="activeTab">
            <template v-if="activeTab === 'Configuration'">
                <TextSingleSelect
                    text="Noise algorithm"
                    name="algorithm"
                    :options="[
                        'Perlin',
                        'Simplex',
                        'Cubic',
                        'Value',
                        'Worley',
                        'Worley (2nd closest)',
                    ]"
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

                    <RangeInput :min="0" :max="1" :step="0.01" v-model="z_coord" />

                    <TextSingleSelect
                        text="Domain transformation"
                        name="domain_transform"
                        :options="['None', 'Rotate', 'Warp']"
                        v-model="domain_transform"
                    />

                    <template v-if="domain_transform === 'Warp'">
                        <p>Warp strength: {{ domain_warp_strength }}</p>
                        <RangeInput :min="1" :max="10" :step="0.5" v-model="domain_warp_strength" />
                    </template>
                </template>

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
                    <RangeInput :min="0" :max="1" :step="0.01" v-model="persistence" />
                </template>
            </template>
            <template v-else>
                <ColorPanel v-model="color_points" />
            </template>
        </TabControl>
        <Canvas @canvas-ready="onCanvasReady" />
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
</style>
