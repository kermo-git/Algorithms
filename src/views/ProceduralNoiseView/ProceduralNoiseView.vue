<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'

import ComputeRenderer from '@/WebGPU/ComputeRenderer'
import { defaultColorPoints } from '@/Noise/Buffers'
import type { DomainTransform, NoiseAlgorithm, NoiseDimension, NoiseUniforms } from '@/Noise/Types'

import ColorPanel from './ColorPanel.vue'
import NoiseScene from './NoiseScene'

const color_points = ref(defaultColorPoints)
const algorithm = ref<NoiseAlgorithm>('Perlin')
const dimension = ref<NoiseDimension>('2D')
const domain_transform = ref<DomainTransform>('None')
const grid_size = ref(16)
const n_main_octaves = ref(1)
const persistence = ref(0.5)
const z_coord = ref(0)
const w_coord = ref(0)
const warp_strength = ref(4)
const n_warp_octaves = ref(1)
const active_tab = ref('Configuration')

function getNoiseParams(): NoiseUniforms {
    return {
        n_grid_columns: grid_size.value,
        n_main_octaves: n_main_octaves.value,
        persistence: persistence.value,
        z_coord: z_coord.value,
        w_coord: w_coord.value,
        n_warp_octaves: n_warp_octaves.value,
        warp_strength: warp_strength.value,
        color_points: color_points.value,
    }
}

const scene = shallowRef(
    markRaw(
        new NoiseScene({
            algorithm: algorithm.value,
            dimension: dimension.value,
            transform: domain_transform.value,
        }),
    ),
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

watch(n_main_octaves, (new_n_octaves) => {
    scene.value.updateNMainOctaves(new_n_octaves, renderer.value.device)
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

watch(n_warp_octaves, (new_n_octaves) => {
    scene.value.updateNWarpOctaves(new_n_octaves, renderer.value.device)
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
    if (new_dimension === '4D' && domain_transform.value.startsWith('Warp')) {
        domain_transform.value = 'None'
    }
})

watch(
    [algorithm, dimension, domain_transform],
    ([new_algorithm, new_dimension, new_domain_transform]) => {
        renderer.value.cleanup()
        scene.value.cleanup()
        scene.value = new NoiseScene({
            algorithm: new_algorithm,
            dimension: new_dimension,
            transform: new_domain_transform,
        })

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
        ? ['None', 'Warp', 'Warp 2X']
        : dimension.value === '3D'
          ? ['None', 'Rotate', 'Warp', 'Warp 2X']
          : ['None', 'Rotate'],
)
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors']"
        v-model="active_tab"
        @canvas-ready="initScene"
    >
        <template v-if="active_tab === 'Configuration'">
            <TextSingleSelect
                text="Noise algorithm"
                name="algorithm"
                :options="['Perlin', 'Simplex', 'Cubic', 'Value', 'Worley', 'Worley (2nd closest)']"
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

            <template v-if="domain_transform.startsWith('Warp')">
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
                v-if="domain_transform.startsWith('Warp')"
                text="Warp octaves"
                name="n_warp_octaves"
                :options="[1, 2, 3, 4, 5]"
                v-model="n_warp_octaves"
            />

            <NumberSingleSelect
                :text="domain_transform.startsWith('Warp') ? 'Main octaves' : 'Octaves'"
                name="n_main_octaves"
                :options="[1, 2, 3, 4, 5]"
                v-model="n_main_octaves"
            />

            <template
                v-if="
                    n_main_octaves > 1 ||
                    (domain_transform.startsWith('Warp') && n_warp_octaves > 1)
                "
            >
                <p>Persistence: {{ persistence }}</p>
                <RangeInput :min="0" :max="1" :step="0.01" v-model="persistence" />
            </template>
        </template>
        <template v-else>
            <ColorPanel v-model="color_points" />
        </template>
    </SidePanelCanvas>
</template>

<style scoped>
.field {
    width: 100%;
}
</style>
