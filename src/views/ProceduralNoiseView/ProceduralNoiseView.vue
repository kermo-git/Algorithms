<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import TabControl from '@/components/TabControl.vue'
import RangeInput from '@/components/RangeInput.vue'

import ColorPanel from './ColorPanel.vue'
import Canvas from '@/components/Canvas.vue'
import ComputeRenderer from './ComputeRenderer'
import { Perlin2D, Perlin3D, Perlin4D } from './NoiseFunctions/Perlin'
import { Simplex2D, Simplex3D, Simplex4D } from './NoiseFunctions/Simplex'
import { Cubic2D, Cubic3D, Cubic4D } from './NoiseFunctions/Cubic'
import { Worley2D, Worley3D, Worley4D } from './NoiseFunctions/Worley'
import { Value2D, Value3D, Value4D } from './NoiseFunctions/Value'
import {
    NoiseScene,
    type DomainTransform,
    type NoiseDimension,
    type NoiseUniforms,
} from './NoiseUtils/NoiseScene'
import { defaultColorPoints } from './NoiseUtils/Buffers'

const color_points = ref(defaultColorPoints)
const algorithm = ref('Perlin')
const dimension = ref<NoiseDimension>('2D')
const domain_transform = ref<DomainTransform>('None')
const warp_strength = ref(4)
const z_coord = ref(0)
const w_coord = ref(0)
const grid_size = ref(16)
const n_octaves = ref(1)
const persistence = ref(0.5)
const activeTab = ref('Configuration')

function createScene(
    algorithm: string,
    dimension: NoiseDimension,
    transform: DomainTransform,
): NoiseScene {
    if (algorithm.startsWith('Worley')) {
        const second_closest = algorithm === 'Worley (2nd closest)'

        if (dimension === '2D') {
            return new Worley2D(second_closest, transform)
        } else if (dimension === '3D') {
            return new Worley3D(second_closest, transform)
        } else {
            return new Worley4D(second_closest, transform)
        }
    } else if (algorithm === 'Value') {
        if (dimension === '2D') {
            return new Value2D(transform)
        } else if (dimension === '3D') {
            return new Value3D(transform)
        } else {
            return new Value4D(transform)
        }
    } else if (algorithm === 'Simplex') {
        if (dimension === '2D') {
            return new Simplex2D(transform)
        } else if (dimension === '3D') {
            return new Simplex3D(transform)
        } else {
            return new Simplex4D(transform)
        }
    } else if (algorithm === 'Cubic') {
        if (dimension === '2D') {
            return new Cubic2D(transform)
        } else if (dimension === '3D') {
            return new Cubic3D(transform)
        } else {
            return new Cubic4D(transform)
        }
    } else {
        if (dimension === '2D') {
            return new Perlin2D(transform)
        } else if (dimension === '3D') {
            return new Perlin3D(transform)
        } else {
            return new Perlin4D(transform)
        }
    }
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

const scene = shallowRef(
    markRaw(createScene(algorithm.value, dimension.value, domain_transform.value)),
)

const renderer = shallowRef(markRaw(new ComputeRenderer()))
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const init_info = await renderer.value.init(canvas)
    await scene.value.init(getNoiseParams(), init_info)
    renderer.value.initObserver(canvas, scene.value)
}

watch(grid_size, (new_grid_size) => {
    scene.value.updateNGridColumns(new_grid_size, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(n_octaves, (new_n_octaves) => {
    scene.value.updateNOctaves(new_n_octaves, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(persistence, (new_persistence) => {
    scene.value.updatePersistence(new_persistence, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(z_coord, (new_z_coord) => {
    scene.value.updateZCoord(new_z_coord, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(w_coord, (new_w_coord) => {
    scene.value.updateWCoord(new_w_coord, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(warp_strength, (new_warp_strength) => {
    scene.value.updateWarpStrength(new_warp_strength, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(color_points, (new_color_points) => {
    scene.value.updateColorPoints(new_color_points, renderer.value.device)
    renderer.value.render(scene.value)
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
        scene.value.cleanup()
        scene.value = createScene(new_algorithm, new_dimension, new_domain_transform)

        if (canvasRef.value) {
            initScene(canvasRef.value)
        }
    },
)

onBeforeUnmount(() => {
    renderer.value.cleanup()
    scene.value.cleanup()
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
        <Canvas @canvas-ready="initScene" />
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
