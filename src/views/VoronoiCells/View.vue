<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import ColorPalette from '@/components/ColorPalette.vue'
import VBox from '@/components/VBox.vue'

import { colorPalette } from '@/utils/Colors'
import { Value2D, Value3D } from '@/Noise/Algorithms/Value'
import { DistanceMeasure, Worley2D, Worley3D } from '@/Noise/Algorithms/Worley'
import { Perlin2D, Perlin3D } from '@/Noise/Algorithms/Perlin'
import { Simplex2D, Simplex3D } from '@/Noise/Algorithms/Simplex'

import Controller from './Controller'

const voronoi_distance = ref<DistanceMeasure>('Euclidean')
const noise_algorithm = ref<string>('Simplex')
const noise_dimension = ref<'2D' | '3D'>('2D')
const voronoi_n_columns = ref(16)
const voronoi_colors = ref(colorPalette('Biomes'))
const noise_scale = ref(1)
const noise_strength = ref(0)
const noise_n_octaves = ref(1)
const noise_persistence = ref(0.5)
const noise_z = ref(0)

const active_tab = ref('Configuration')
const scene = shallowRef(new Controller())
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    await scene.value.init(
        {
            distance_measure: voronoi_distance.value,
            noise: createNoiseAlgorithm(
                noise_algorithm.value,
                noise_dimension.value
            ),
            voronoi_n_columns: voronoi_n_columns.value,
            voronoi_colors: voronoi_colors.value,
            noise_scale: noise_scale.value,
            noise_strength: noise_strength.value,
            noise_n_octaves: noise_n_octaves.value,
            noise_persistence: noise_persistence.value,
            noise_z: noise_z.value
        },
        canvas
    )
}

function createNoiseAlgorithm(name: string, dimension: string) {
    switch (name) {
        case 'Perlin':
            return dimension === '2D' ? Perlin2D() : Perlin3D()
        case 'Worley':
            return dimension === '2D' ? Worley2D() : Worley3D()
        default:
            return dimension === '2D' ? Simplex2D() : Simplex3D()
    }
}

watch(
    [voronoi_distance, noise_algorithm, noise_dimension],
    ([new_measure, new_algorithm, new_dimension]) => {
        if (canvasRef.value) {
            scene.value.cleanup()
            scene.value.init(
                {
                    distance_measure: new_measure,
                    noise: createNoiseAlgorithm(new_algorithm, new_dimension),
                    voronoi_n_columns: voronoi_n_columns.value,
                    voronoi_colors: voronoi_colors.value,
                    noise_scale: noise_scale.value,
                    noise_strength: noise_strength.value,
                    noise_n_octaves: noise_n_octaves.value,
                    noise_persistence: noise_persistence.value,
                    noise_z: noise_z.value
                },
                canvasRef.value
            )
        }
    }
)

onBeforeUnmount(() => {
    scene.value.cleanup()
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors']"
        v-model="active_tab"
        @canvas-ready="initScene"
    >
        <template v-slot:tabs>
            <VBox>
                <template v-if="active_tab === 'Configuration'">
                    <TextSingleSelect
                        text="Distance measure"
                        :options="['Euclidean', 'Manhattan', 'Chebyshev']"
                        v-model="voronoi_distance"
                    />

                    <p>Noise strength: {{ noise_strength }}</p>
                    <RangeInput
                        :min="0"
                        :max="5"
                        :step="0.01"
                        v-model="noise_strength"
                        @animation="(value) => scene.setNoiseStrength(value)"
                    />

                    <TextSingleSelect
                        text="Noise algorithm"
                        :options="['Simplex', 'Perlin', 'Value', 'Worley']"
                        v-model="noise_algorithm"
                    />

                    <TextSingleSelect
                        text="Noise dimension"
                        :options="['2D', '3D']"
                        v-model="noise_dimension"
                    />

                    <template v-if="noise_dimension !== '2D'">
                        <p>Noise Z coordinate: {{ noise_z }}</p>
                        <RangeInput
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="noise_z"
                            @animation="(value) => scene.setNoiseZCoord(value)"
                        />
                    </template>

                    <NumberSingleSelect
                        text="Noise octaves"
                        :options="[1, 2, 3, 4, 5]"
                        v-model="noise_n_octaves"
                        @update:model-value="
                            (value) => scene.setNoiseNOctaves(value)
                        "
                    />

                    <template v-if="noise_n_octaves > 1">
                        <p>Noise persistence: {{ noise_persistence }}</p>
                        <RangeInput
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="noise_persistence"
                            @animation="
                                (value) => scene.setNoisePersistence(value)
                            "
                        />
                    </template>

                    <p>
                        Noise scale relative to Voronoi cells: {{ noise_scale }}
                    </p>
                    <RangeInput
                        :min="0.1"
                        :max="5"
                        :step="0.01"
                        v-model="noise_scale"
                        @animation="(value) => scene.setNoiseScale(value)"
                    />
                </template>
                <template v-else>
                    <ColorPalette
                        v-model="voronoi_colors"
                        @change-single-color="
                            (index, value) => scene.setColor(index, value)
                        "
                        @change-all-colors="
                            (colors) => scene.setAllColors(colors)
                        "
                    />
                </template>
            </VBox>
        </template>
        <template v-slot:pinned>
            <VBox>
                <NumberSingleSelect
                    text="Grid size"
                    :options="[4, 8, 16, 32, 64]"
                    v-model="voronoi_n_columns"
                    @update:model-value="
                        (value) => scene.setVoronoiNColumns(value)
                    "
                />
            </VBox>
        </template>
    </SidePanelCanvas>
</template>
