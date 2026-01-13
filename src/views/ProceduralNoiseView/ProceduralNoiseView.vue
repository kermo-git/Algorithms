<script setup lang="ts">
import { markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'

import ComputeRenderer from '@/WebGPU/ComputeRenderer'
import { defaultColorPoints } from '@/Noise/Buffers'
import { type NoiseSetup } from '@/Noise/Types'

import ColorPanel from './ColorPanel.vue'
import NoiseScene from './NoiseScene'
import NoisePanel from '@/Noise/NoisePanel.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'

const color_points = ref(defaultColorPoints)
const noise = ref<NoiseSetup>({
    algorithm: 'Perlin',
    dimension: '2D',
    transform: 'None',
})
const n_grid_columns = ref(16)
const n_main_octaves = ref(1)
const persistence = ref(0.5)
const z_coord = ref(0)
const w_coord = ref(0)
const warp_strength = ref(2)
const n_warp_octaves = ref(1)
const active_tab = ref('Configuration')

const scene = shallowRef(markRaw(new NoiseScene(noise.value)))
const renderer = shallowRef(markRaw(new ComputeRenderer()))
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const init_info = await renderer.value.init(canvas)
    const init_params = {
        n_grid_columns: n_grid_columns.value,
        n_main_octaves: n_main_octaves.value,
        persistence: persistence.value,
        z_coord: z_coord.value,
        w_coord: w_coord.value,
        n_warp_octaves: n_warp_octaves.value,
        warp_strength: warp_strength.value,
        color_points: color_points.value,
    }
    await scene.value.init(init_params, init_info)
    renderer.value.initObserver(canvas, scene.value)
}

watch(n_grid_columns, (new_grid_size) => {
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

watch(noise, (new_noise) => {
    renderer.value.cleanup()
    scene.value.cleanup()
    scene.value = new NoiseScene(new_noise)

    if (canvasRef.value) {
        initScene(canvasRef.value)
    }
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
            <NoisePanel
                v-model:noise="noise"
                v-model:z_coord="z_coord"
                v-model:w_coord="w_coord"
                v-model:n_main_octaves="n_main_octaves"
                v-model:persistence="persistence"
                v-model:n_warp_octaves="n_warp_octaves"
                v-model:warp_strength="warp_strength"
            />
        </template>
        <template v-else>
            <ColorPanel v-model="color_points" />
        </template>
    </SidePanelCanvas>
</template>
