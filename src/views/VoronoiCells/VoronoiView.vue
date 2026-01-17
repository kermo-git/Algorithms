<script setup lang="ts">
import { markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import { toShaderBuffer } from '@/utils/Colors'
import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import ComputeRenderer from '@/WebGPU/ComputeRenderer'
import { type NoiseAlgorithm } from '@/Noise/Types'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'

import VoronoiScene from './VoronoiScene'
import { type DistanceMeasure, type VoronoiUniforms } from './VoronoiShader'
import ColorPanel from './ColorPanel.vue'

const active_tab = ref('Configuration')

const voronoi_distance = ref<DistanceMeasure>('Euclidean')
const voronoi_colors = ref<FloatArray>(
    toShaderBuffer(['#8AC90A', '#129145', '#9ED6F2', '#ED9C1A', '#E5D96E', '#1730DB']),
)
const voronoi_n_columns = ref(16)

const noise_algorithm = ref<NoiseAlgorithm | 'None'>('None')
const noise_dimension = ref<'2D' | '3D'>('2D')
const noise_scale = ref(1)
const noise_n_octaves = ref(1)
const noise_persistence = ref(0.5)
const noise_warp_strength = ref(1)
const noise_z = ref(0)

const scene = shallowRef(
    markRaw(
        new VoronoiScene({
            distance_measure: voronoi_distance.value,
        }),
    ),
)
const renderer = shallowRef(markRaw(new ComputeRenderer()))
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const init_info = await renderer.value.init(canvas)
    const init_params: VoronoiUniforms = {
        voronoi_n_columns: voronoi_n_columns.value,
        voronoi_colors: voronoi_colors.value,
        noise_scale: noise_scale.value,
        noise_warp_strength: noise_warp_strength.value,
        noise_z: noise_z.value,
        noise_n_octaves: noise_n_octaves.value,
        noise_persistence: noise_persistence.value,
    }
    await scene.value.init(init_params, init_info)
    renderer.value.initObserver(canvas, scene.value)
}

watch(
    [voronoi_distance, noise_algorithm, noise_dimension],
    ([new_measure, new_algorithm, new_dimension]) => {
        scene.value.cleanup()
        renderer.value.cleanup()

        scene.value = new VoronoiScene({
            distance_measure: new_measure,
            warp_algorithm: new_algorithm === 'None' ? undefined : new_algorithm,
            warp_dimension: new_dimension,
        })
        if (canvasRef.value) {
            initScene(canvasRef.value)
        }
    },
)

watch(voronoi_n_columns, (new_grid_size) => {
    scene.value.updateVoronoiNColumns(new_grid_size, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(voronoi_colors, (new_colors) => {
    scene.value.updateVoronoiColors(new_colors, renderer.value.device)
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

watch(noise_n_octaves, (new_n_octaves) => {
    scene.value.updateNoiseOctaves(new_n_octaves, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(noise_persistence, (new_persistence) => {
    scene.value.updateNoisePersistence(new_persistence, renderer.value.device)
    renderer.value.render(scene.value)
})

watch(noise_z, (new_z_coord) => {
    scene.value.updateNoiseZ(new_z_coord, renderer.value.device)
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
                v-model="voronoi_n_columns"
            />
            <TextSingleSelect
                text="Distance measure"
                name="distance"
                :options="['Euclidean', 'Manhattan', 'Pixels']"
                v-model="voronoi_distance"
            />
            <TextSingleSelect
                text="Noise algorithm"
                name="algorithm"
                :options="['None', 'Perlin', 'Simplex', 'Value', 'Worley']"
                v-model="noise_algorithm"
            />

            <template v-if="noise_algorithm !== 'None'">
                <TextSingleSelect
                    text="Noise dimension"
                    name="dimension"
                    :options="['2D', '3D']"
                    v-model="noise_dimension"
                />

                <template v-if="noise_dimension !== '2D'">
                    <p>Noise Z coordinate: {{ noise_z }}</p>
                    <RangeInput :min="0" :max="1" :step="0.01" v-model="noise_z" />
                </template>

                <NumberSingleSelect
                    text="Noise octaves"
                    name="noise_n_octaves"
                    :options="[1, 2, 3, 4, 5]"
                    v-model="noise_n_octaves"
                />

                <template v-if="noise_n_octaves > 1">
                    <p>Noise persistence: {{ noise_persistence }}</p>
                    <RangeInput :min="0" :max="1" :step="0.01" v-model="noise_persistence" />
                </template>

                <p>Noise scale relative to Voronoi cells: {{ noise_scale }}</p>
                <RangeInput :min="0.1" :max="5" :step="0.01" v-model="noise_scale" />

                <p>Noise warp strength: {{ noise_warp_strength }}</p>
                <RangeInput :min="0.1" :max="5" :step="0.01" v-model="noise_warp_strength" />
            </template>
        </template>
        <template v-else>
            <ColorPanel v-model="voronoi_colors" />
        </template>
    </SidePanelCanvas>
</template>
