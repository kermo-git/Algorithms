<script setup lang="ts">
import { markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import ColorPanel from '@/components/ColorPalette.vue'
import VBox from '@/components/VBox.vue'

import { shaderColorArray } from '@/utils/Colors'
import Engine from '@/WebGPU/Engine'
import { Value2D, Value3D } from '@/Noise/Algorithms/Value'
import { Worley2D, Worley3D } from '@/Noise/Algorithms/Worley'
import { Perlin2D, Perlin3D } from '@/Noise/Algorithms/Perlin'
import { Simplex2D, Simplex3D } from '@/Noise/Algorithms/Simplex'

import { type DistanceMeasure, type UniformData } from './Shader'
import VoronoiScene from './Scene'

const active_tab = ref('Configuration')

const voronoi_distance = ref<DistanceMeasure>('Euclidean')
const voronoi_colors = ref(['#8AC90A', '#129145', '#9ED6F2', '#ED9C1A', '#E5D96E', '#1730DB'])
const voronoi_n_columns = ref(16)

const noise_algorithm = ref<string>('Simplex')
const noise_dimension = ref<'2D' | '3D'>('2D')
const noise_scale = ref(1)
const noise_n_octaves = ref(1)
const noise_persistence = ref(0.5)
const noise_warp_strength = ref(0)
const noise_z = ref(0)

const scene = shallowRef(
    markRaw(
        new VoronoiScene({
            distance_measure: voronoi_distance.value,
            warp_algorithm: Simplex2D,
        }),
    ),
)
const renderer = shallowRef(markRaw(new Engine()))
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const init_params: UniformData = {
        voronoi_n_columns: voronoi_n_columns.value,
        voronoi_colors: shaderColorArray(voronoi_colors.value),
        noise_scale: noise_scale.value,
        noise_warp_strength: noise_warp_strength.value,
        noise_z: noise_z.value,
        noise_n_octaves: noise_n_octaves.value,
        noise_persistence: noise_persistence.value,
    }
    await scene.value.init(init_params, canvas)
}

function createNoiseAlgorithm(name: string, dimension: string) {
    switch (name) {
        case 'Perlin':
            return dimension === '2D' ? Perlin2D : Perlin3D
        case 'Value':
            return dimension === '2D' ? Value2D : Value3D
        case 'Worley':
            return dimension === '2D' ? Worley2D : Worley3D
        default:
            return dimension === '2D' ? Simplex2D : Simplex3D
    }
}

watch(
    [voronoi_distance, noise_algorithm, noise_dimension],
    ([new_measure, new_algorithm, new_dimension]) => {
        scene.value.cleanup()
        renderer.value.cleanup()

        scene.value = new VoronoiScene({
            distance_measure: new_measure,
            warp_algorithm: createNoiseAlgorithm(new_algorithm, new_dimension),
        })
        if (canvasRef.value) {
            initScene(canvasRef.value)
        }
    },
)

watch(voronoi_n_columns, (new_grid_size) => {
    scene.value.updateVoronoiNColumns(new_grid_size)
})

watch(voronoi_colors, (new_colors) => {
    const shader_colors = shaderColorArray(new_colors)
    scene.value.updateVoronoiColors(shader_colors)
})

watch(noise_scale, (new_scale) => {
    scene.value.updateNoiseScale(new_scale)
})

watch(noise_warp_strength, (new_warp_strength) => {
    scene.value.updateNoiseWarpStrength(new_warp_strength)
})

watch(noise_n_octaves, (new_n_octaves) => {
    scene.value.updateNoiseOctaves(new_n_octaves)
})

watch(noise_persistence, (new_persistence) => {
    scene.value.updateNoisePersistence(new_persistence)
})

watch(noise_z, (new_z_coord) => {
    scene.value.updateNoiseZ(new_z_coord)
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
        <VBox>
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
                    :options="['Euclidean', 'Manhattan']"
                    v-model="voronoi_distance"
                />

                <p>Noise strength: {{ noise_warp_strength }}</p>
                <RangeInput :min="0" :max="5" :step="0.01" v-model="noise_warp_strength" />

                <TextSingleSelect
                    text="Noise algorithm"
                    name="algorithm"
                    :options="['Simplex', 'Perlin', 'Value', 'Worley']"
                    v-model="noise_algorithm"
                />

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
            </template>
            <template v-else>
                <ColorPanel v-model="voronoi_colors" />
            </template>
        </VBox>
    </SidePanelCanvas>
</template>
