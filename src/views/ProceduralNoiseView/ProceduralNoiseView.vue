<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import TabControl from '@/components/TabControl.vue'
import RangeInput from '@/components/RangeInput.vue'

import ColorPanel from './ColorPanel.vue'
import Canvas from '@/components/Canvas.vue'
import ComputeRenderer, { type RenderLogic } from './ComputeRenderer'
import { Perlin2D, Perlin3D, Perlin4D } from './Noise/Perlin'
import { Simplex2D, Simplex3D, Simplex4D } from './Noise/Simplex'
import { Cubic2D, Cubic3D, Cubic4D } from './Noise/Cubic'
import { Worley2D, Worley3D, Worley4D } from './Noise/Worley'
import { Value2D, Value3D, Value4D } from './Noise/Value'
import {
    defaultColorPoints,
    type DomainTransform,
    type NoiseDimension,
    type NoiseUniforms,
} from './NoiseUtils'

const color_points = ref(defaultColorPoints)
const algorithm = ref('Perlin')
const dimension = ref<NoiseDimension>('2D')
const domain_transform = ref<DomainTransform>('None')
const warp_strength = ref(1)
const z_coord = ref(0)
const w_coord = ref(0)
const grid_size = ref(16)
const n_octaves = ref(1)
const persistence = ref(0.5)
const activeTab = ref('Configuration')

function createRenderer(algorithm: string, dimension: NoiseDimension, transform: DomainTransform) {
    let render_logic: RenderLogic<NoiseUniforms>

    if (algorithm.startsWith('Worley')) {
        const second_closest = algorithm === 'Worley (2nd closest)'

        if (dimension === '2D') {
            render_logic = new Worley2D(second_closest, transform)
        } else if (dimension === '3D') {
            render_logic = new Worley3D(second_closest, transform)
        } else {
            render_logic = new Worley4D(second_closest, transform)
        }
    } else if (algorithm === 'Value') {
        if (dimension === '2D') {
            render_logic = new Value2D(transform)
        } else if (dimension === '3D') {
            render_logic = new Value3D(transform)
        } else {
            render_logic = new Value4D(transform)
        }
    } else if (algorithm === 'Simplex') {
        if (dimension === '2D') {
            render_logic = new Simplex2D(transform)
        } else if (dimension === '3D') {
            render_logic = new Simplex3D(transform)
        } else {
            render_logic = new Simplex4D(transform)
        }
    } else if (algorithm === 'Cubic') {
        if (dimension === '2D') {
            render_logic = new Cubic2D(transform)
        } else if (dimension === '3D') {
            render_logic = new Cubic3D(transform)
        } else {
            render_logic = new Cubic4D(transform)
        }
    } else {
        if (dimension === '2D') {
            render_logic = new Perlin2D(transform)
        } else if (dimension === '3D') {
            render_logic = new Perlin3D(transform)
        } else {
            render_logic = new Perlin4D(transform)
        }
    }
    return markRaw(new ComputeRenderer(render_logic))
}

function getNoiseParams(): NoiseUniforms {
    return {
        n_grid_columns: grid_size.value,
        n_octaves: n_octaves.value,
        persistence: persistence.value,
        z_coord: z_coord.value,
        w_coord: w_coord.value,
        warp_strength: warp_strength.value,
        color_points: color_points.value,
    }
}

const renderer = shallowRef<ComputeRenderer<NoiseUniforms>>(
    createRenderer(algorithm.value, dimension.value, domain_transform.value),
)
const canvasRef = ref<HTMLCanvasElement | null>(null)

function onCanvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    renderer.value.init(canvas, getNoiseParams())
}

watch(n_octaves, (new_n_octaves) => {
    renderer.value.update({
        n_octaves: new_n_octaves,
    })
})

watch(grid_size, (new_grid_size) => {
    renderer.value.update({
        n_grid_columns: new_grid_size,
    })
})

watch(persistence, (new_persistence) => {
    renderer.value.update({
        persistence: new_persistence,
    })
})

watch(z_coord, (new_z_coord) => {
    renderer.value.update({
        z_coord: new_z_coord,
    })
})

watch(w_coord, (new_w_coord) => {
    renderer.value.update({
        w_coord: new_w_coord,
    })
})

watch(warp_strength, (new_warp_strength) => {
    renderer.value.update({
        warp_strength: new_warp_strength,
    })
})

watch(color_points, (new_color_points) => {
    renderer.value.update({
        color_points: new_color_points,
    })
})

watch(dimension, (new_dimension) => {
    if (new_dimension === '2D' && domain_transform.value === 'Rotate') {
        domain_transform.value = 'None'
    }
    if (new_dimension === '4D' && domain_transform.value === 'Warp') {
        domain_transform.value = 'None'
    }
})

watch(
    [algorithm, dimension, domain_transform],
    ([new_algorithm, new_dimension, new_domain_transform]) => {
        renderer.value.cleanup()
        renderer.value = createRenderer(new_algorithm, new_dimension, new_domain_transform)
        if (canvasRef.value) {
            renderer.value.init(canvasRef.value, getNoiseParams())
        }
    },
)

onBeforeUnmount(() => {
    renderer.value.cleanup()
})

const available_transforms = computed(() =>
    dimension.value === '2D'
        ? ['None', 'Warp']
        : dimension.value === '3D'
          ? ['None', 'Rotate', 'Warp']
          : ['None', 'Rotate'],
)
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
                    :options="['2D', '3D', '4D']"
                    v-model="dimension"
                />

                <template v-if="dimension !== '2D'">
                    <p>Z coordinate: {{ z_coord }}</p>
                    <RangeInput :min="0" :max="1" :step="0.01" v-model="z_coord" />

                    <template v-if="dimension === '4D'">
                        <p>W coordinate: {{ w_coord }}</p>
                        <RangeInput :min="0" :max="1" :step="0.01" v-model="w_coord" />
                    </template>
                </template>

                <TextSingleSelect
                    text="Domain transformation"
                    name="domain_transform"
                    :options="available_transforms"
                    v-model="domain_transform"
                />

                <template v-if="domain_transform === 'Warp'">
                    <p>Warp strength: {{ warp_strength }}</p>
                    <RangeInput :min="1" :max="10" :step="0.1" v-model="warp_strength" />
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
