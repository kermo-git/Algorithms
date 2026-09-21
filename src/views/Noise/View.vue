<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import VBox from '@/components/VBox.vue'
import ColorPanel from './ColorPanel.vue'

import { Simplex2D, Simplex3D, Simplex4D } from '@/Noise/Algorithms/Simplex'
import { Perlin2D, Perlin3D, Perlin4D } from '@/Noise/Algorithms/Perlin'
import { Value2D, Value3D, Value4D } from '@/Noise/Algorithms/Value'
import { Cubic2D, Cubic3D, Cubic4D } from '@/Noise/Algorithms/Cubic'
import {
    DistanceMeasure,
    Worley2D,
    Worley3D,
    Worley4D
} from '@/Noise/Algorithms/Worley'
import {
    WorleyEdge2D,
    WorleyEdge3D,
    WorleyEdge4D
} from '@/Noise/Algorithms/WorleyEdge.js'

import type { DomainTransform } from './Shader'
import WebGPUScene from './Controller.js'
import Checkbox from '@/components/Checkbox.vue'

const algorithm = ref<string>('Simplex')
const quadratic_perlin = ref(false)
const simplex_type = ref<'Gradient' | 'Value'>('Gradient')
const worley_distance = ref<DistanceMeasure>('Euclidean')

const dimension = ref<string>('2D')
const domain_transform = ref<DomainTransform>('None')
const n_grid_columns = ref(16)
const z_coord = ref(0)
const w_coord = ref(0)
const n_main_octaves = ref(1)
const persistence = ref(0.5)
const lacunarity = ref(2)
const n_warp_octaves = ref(1)
const warp_strength = ref(0.1)
const colors = ref(['#000000', '#FFFFFF'])
const color_points = ref([0, 1])

const active_tab = ref('Configuration')
const scene = shallowRef(new WebGPUScene())
const canvasRef = ref<HTMLCanvasElement | null>(null)

function createNoiseAlgorithm(
    algorithm_name: string,
    noise_dimension: string,
    quadratic_perlin: boolean,
    simplex_value: 'Gradient' | 'Value',
    worley_distance: DistanceMeasure
) {
    switch (algorithm_name) {
        case 'Simplex':
            switch (noise_dimension) {
                case '2D':
                    return Simplex2D(simplex_value)
                case '3D':
                    return Simplex3D(simplex_value)
                default:
                    return Simplex4D(simplex_value)
            }
        case 'Perlin':
            switch (noise_dimension) {
                case '2D':
                    return Perlin2D(quadratic_perlin)
                case '3D':
                    return Perlin3D(quadratic_perlin)
                default:
                    return Perlin4D(quadratic_perlin)
            }
        case 'Cubic':
            switch (noise_dimension) {
                case '2D':
                    return Cubic2D()
                case '3D':
                    return Cubic3D()
                default:
                    return Cubic4D()
            }
        case 'Value':
            switch (noise_dimension) {
                case '2D':
                    return Value2D()
                case '3D':
                    return Value3D()
                default:
                    return Value4D()
            }
        case 'Worley F1':
            switch (noise_dimension) {
                case '2D':
                    return Worley2D(worley_distance)
                case '3D':
                    return Worley3D(worley_distance)
                default:
                    return Worley4D(worley_distance)
            }
        default:
            switch (noise_dimension) {
                case '2D':
                    return WorleyEdge2D()
                case '3D':
                    return WorleyEdge3D()
                default:
                    return WorleyEdge4D()
            }
    }
}

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    await scene.value.init(
        {
            noise: createNoiseAlgorithm(
                algorithm.value,
                dimension.value,
                quadratic_perlin.value,
                simplex_type.value,
                worley_distance.value
            ),
            transform: domain_transform.value,
            n_grid_columns: n_grid_columns.value,
            z_coord: z_coord.value,
            w_coord: w_coord.value,
            n_main_octaves: n_main_octaves.value,
            persistence: persistence.value,
            lacunarity: lacunarity.value,
            n_warp_octaves: n_warp_octaves.value,
            warp_strength: warp_strength.value,
            colors: colors.value,
            color_points: color_points.value
        },
        canvas
    )
}

watch(dimension, (new_dimension) => {
    if (new_dimension === '2D' && domain_transform.value === 'Rotate') {
        domain_transform.value = 'None'
    }
    if (new_dimension === '4D' && domain_transform.value.startsWith('Warp')) {
        domain_transform.value = 'None'
    }
})

watch(
    [
        algorithm,
        dimension,
        quadratic_perlin,
        simplex_type,
        worley_distance,
        domain_transform
    ],
    ([
        new_algorithm,
        new_dimension,
        new_quadratic_perlin,
        new_simplex_value,
        new_worley_distance,
        new_domain_transform
    ]) => {
        if (canvasRef.value) {
            scene.value.cleanup()
            scene.value.init(
                {
                    noise: createNoiseAlgorithm(
                        new_algorithm,
                        new_dimension,
                        new_quadratic_perlin,
                        new_simplex_value,
                        new_worley_distance
                    ),
                    transform: new_domain_transform,
                    n_grid_columns: n_grid_columns.value,
                    z_coord: z_coord.value,
                    w_coord: w_coord.value,
                    n_main_octaves: n_main_octaves.value,
                    persistence: persistence.value,
                    lacunarity: lacunarity.value,
                    n_warp_octaves: n_warp_octaves.value,
                    warp_strength: warp_strength.value,
                    colors: colors.value,
                    color_points: color_points.value
                },
                canvasRef.value
            )
        }
    }
)

onBeforeUnmount(() => {
    scene.value.cleanup()
})

const available_transforms = computed(() =>
    dimension.value === '2D'
        ? ['None', 'Warp']
        : dimension.value === '3D'
          ? ['None', 'Rotate', 'Warp']
          : ['None', 'Rotate']
)
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
                        text="Noise algorithm"
                        :options="[
                            'Simplex',
                            'Perlin',
                            'Cubic',
                            'Value',
                            'Worley F1',
                            'Worley F2 - F1'
                        ]"
                        v-model="algorithm"
                    />

                    <Checkbox
                        v-if="algorithm === 'Perlin'"
                        name="quadratic_perlin"
                        v-model="quadratic_perlin"
                    >
                        Quadratic trick
                    </Checkbox>
                    <TextSingleSelect
                        v-else-if="algorithm === 'Simplex'"
                        text="Random element type"
                        :options="['Gradient', 'Value']"
                        v-model="simplex_type"
                    />
                    <TextSingleSelect
                        v-else-if="algorithm === 'Worley F1'"
                        text="Distance metric"
                        :options="['Euclidean', 'Manhattan', 'Chebyshev']"
                        v-model="worley_distance"
                    />

                    <TextSingleSelect
                        text="Noise dimension"
                        :options="['2D', '3D', '4D']"
                        v-model="dimension"
                    />

                    <template v-if="dimension !== '2D'">
                        <p>Z coordinate: {{ z_coord }}</p>
                        <RangeInput
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="z_coord"
                            @animation="(value) => scene.setZCoord(value)"
                        />

                        <template v-if="dimension === '4D'">
                            <p>W coordinate: {{ w_coord }}</p>
                            <RangeInput
                                :min="0"
                                :max="1"
                                :step="0.01"
                                v-model="w_coord"
                                @animation="(value) => scene.setWCoord(value)"
                            />
                        </template>
                    </template>

                    <TextSingleSelect
                        text="Domain transformation"
                        :options="available_transforms"
                        v-model="domain_transform"
                    />

                    <template v-if="domain_transform.startsWith('Warp')">
                        <p>Warp strength: {{ warp_strength }}</p>
                        <RangeInput
                            :min="0.01"
                            :max="1"
                            :step="0.01"
                            v-model="warp_strength"
                            @animation="(value) => scene.setWarpStrength(value)"
                        />
                    </template>
                    <NumberSingleSelect
                        v-if="domain_transform.startsWith('Warp')"
                        text="Warp octaves"
                        :options="[1, 2, 3, 4, 5]"
                        v-model="n_warp_octaves"
                        @update:model-value="
                            (value) => scene.setNWarpOctaves(value)
                        "
                    />

                    <NumberSingleSelect
                        :text="
                            domain_transform.startsWith('Warp')
                                ? 'Main octaves'
                                : 'Octaves'
                        "
                        :options="[1, 2, 3, 4, 5]"
                        v-model="n_main_octaves"
                        @update:model-value="
                            (value) => scene.setNMainOctaves(value)
                        "
                    />

                    <template
                        v-if="
                            n_main_octaves > 1 ||
                            (domain_transform.startsWith('Warp') &&
                                n_warp_octaves > 1)
                        "
                    >
                        <p>Persistence: {{ persistence }}</p>
                        <RangeInput
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="persistence"
                            @animation="(value) => scene.setPersistence(value)"
                        />
                        <p>Lacunarity: {{ lacunarity }}</p>
                        <RangeInput
                            :min="1"
                            :max="5"
                            :step="0.01"
                            v-model="lacunarity"
                            @animation="(value) => scene.setLacunarity(value)"
                        />
                    </template>
                </template>
                <template v-else>
                    <ColorPanel
                        v-model:colors="colors"
                        v-model:points="color_points"
                        @change-single-color="
                            (index, color) => scene.setColor(index, color)
                        "
                        @change-single-point="
                            (index, value) => scene.setColorPoint(index, value)
                        "
                        @change-all-color-points="
                            (colors, points) =>
                                scene.setAllColors(colors, points)
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
                    v-model="n_grid_columns"
                    @update:model-value="
                        (value) => scene.setNGridColumns(value)
                    "
                />
            </VBox>
        </template>
    </SidePanelCanvas>
</template>

<style scoped>
.field {
    width: 100%;
}
</style>
