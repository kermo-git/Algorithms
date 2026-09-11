<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import VBox from '@/components/VBox.vue'
import ColorPanel from './ColorPanel.vue'

import { Simplex2D, Simplex3D, Simplex4D } from '@/Noise/Algorithms/Simplex'
import {
    Perlin2D,
    Perlin2DModule,
    Perlin3D,
    Perlin3DModule,
    Perlin4D,
    Perlin4DModule
} from '@/Noise/Algorithms/Perlin'
import { Value2D, Value3D, Value4D } from '@/Noise/Algorithms/Value'
import { Cubic2D, Cubic3D, Cubic4D } from '@/Noise/Algorithms/Cubic'
import { Worley2D, Worley3D, Worley4D } from '@/Noise/Algorithms/Worley'
import { WorleyF22D, WorleyF23D, WorleyF24D } from '@/Noise/Algorithms/WorleyF2'

import type { DomainTransform } from './Shader'
import WebGPUScene from './Contoller'

const colors = ref(['#000000', '#FFFFFF'])
const color_points = ref([0, 1])
const algorithm = ref<string>('Simplex')
const dimension = ref<string>('2D')
const domain_transform = ref<DomainTransform>('None')
const n_grid_columns = ref(16)
const n_main_octaves = ref(1)
const persistence = ref(0.5)
const lacunarity = ref(2)
const z_coord = ref(0)
const w_coord = ref(0)
const warp_strength = ref(0.1)
const n_warp_octaves = ref(1)
const active_tab = ref('Configuration')
const scene = shallowRef(new WebGPUScene())
const canvasRef = ref<HTMLCanvasElement | null>(null)

function createNoiseAlgorithm(algorithm_name: string, noise_dimension: string) {
    switch (noise_dimension) {
        case '2D':
            return Perlin2DModule()
        case '3D':
            return Perlin3DModule()
        default:
            return Perlin4DModule()
    }
}

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    await scene.value.init(
        {
            noise: createNoiseAlgorithm(algorithm.value, dimension.value),
            transform: domain_transform.value,
            n_grid_columns: n_grid_columns.value,
            n_main_octaves: n_main_octaves.value,
            persistence: persistence.value,
            lacunarity: lacunarity.value,
            z_coord: z_coord.value,
            w_coord: w_coord.value,
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
    [algorithm, dimension, domain_transform],
    ([new_algorithm, new_dimension, new_domain_transform]) => {
        if (canvasRef.value) {
            scene.value.cleanup()
            scene.value.init(
                {
                    noise: createNoiseAlgorithm(new_algorithm, new_dimension),
                    transform: new_domain_transform,
                    n_grid_columns: n_grid_columns.value,
                    n_main_octaves: n_main_octaves.value,
                    persistence: persistence.value,
                    z_coord: z_coord.value,
                    w_coord: w_coord.value,
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
                            'Simplex Value',
                            'Perlin',
                            'Quadratic',
                            'Cubic',
                            'Value',
                            'Worley F1',
                            'Worley F2 - F1'
                        ]"
                        v-model="algorithm"
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
