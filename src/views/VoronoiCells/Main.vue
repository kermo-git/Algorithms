<script setup lang="ts">
import { markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'

import ComputeRenderer from '@/WebGPU/ComputeRenderer'
import { type NoiseSetup } from '@/Noise/Types'

import NoisePanel from '@/Noise/NoisePanel.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import VoronoiScene from './VoronoiScene'
import { type DistanceMeasure, type VoronoiSetup, type VoronoiUniforms } from './VoronoiShader'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'

const noise = ref<NoiseSetup | null>(null)
const voronoi = ref<VoronoiSetup>({
    distance_measure: 'Euclidean',
})
const distance_measure = ref<DistanceMeasure>('Euclidean')
const n_grid_columns = ref(16)
const noise_scale = ref(1)
const noise_z_coord = ref(0)
const n_noise_octaves = ref(1)
const noise_persistence = ref(0.5)
const noise_warp_strength = ref(2)
const active_tab = ref('Configuration')

const scene = shallowRef(markRaw(new VoronoiScene(voronoi.value)))
const renderer = shallowRef(markRaw(new ComputeRenderer()))
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const init_info = await renderer.value.init(canvas)
    const init_params: VoronoiUniforms = {
        n_grid_columns: n_grid_columns.value,
        noise_scale: noise_scale.value,
        noise_warp_strength: noise_warp_strength.value,
        noise_z_coord: noise_z_coord.value,
        n_noise_octaves: n_noise_octaves.value,
        noise_persistence: noise_persistence.value,
    }
    await scene.value.init(init_params, init_info)
    renderer.value.initObserver(canvas, scene.value)
}

watch(n_grid_columns, (new_grid_size) => {
    scene.value.updateNGridColumns(new_grid_size, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(noise_scale, (new_scale) => {
    scene.value.updateNoiseScale(new_scale, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(noise_warp_strength, (new_warp_strength) => {
    scene.value.updateNoiseWarpStrength(new_warp_strength, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(n_noise_octaves, (new_n_octaves) => {
    scene.value.updateNoiseOctaves(new_n_octaves, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(noise_persistence, (new_persistence) => {
    scene.value.updateNoisePersistence(new_persistence, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(noise_z_coord, (new_z_coord) => {
    scene.value.updateNoiseZCoord(new_z_coord, renderer.value.device)
    renderer.value.render(scene.value)
})

onBeforeUnmount(() => {
    renderer.value.cleanup()
    scene.value.cleanup()
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors']"
        v-model="active_tab"
        @canvas-ready="initScene"
    >
        <template v-if="active_tab === 'Configuration'">
            <NumberSingleSelect
                text="Grid size"
                name="n_grid_columns"
                :options="[4, 8, 16, 32, 64]"
                v-model="n_grid_columns"
            />
            <RangeInput :min="0.1" :max="5" :step="0.1" v-model="noise_scale" />
            <TextSingleSelect
                text="Distance measure"
                name="distance"
                :options="['Euclidean', 'Manhattan']"
                v-model="distance_measure"
            />
            <NoisePanel
                allow-none
                :dimensions="['2D', '3D']"
                :transforms="[]"
                v-model:noise="noise"
                v-model:z_coord="noise_z_coord"
                v-model:n_main_octaves="n_noise_octaves"
                v-model:persistence="noise_persistence"
            />
            <template v-if="noise !== null">
                <p>Noise scale relative to Voronoi cells: {{ noise_scale }}</p>
                <RangeInput :min="0.1" :max="5" :step="0.1" v-model="noise_scale" />
                <p>Warp strength: {{ noise_warp_strength }}</p>
                <RangeInput :min="1" :max="5" :step="0.1" v-model="noise_warp_strength" />
            </template>
        </template>
    </SidePanelCanvas>
</template>
