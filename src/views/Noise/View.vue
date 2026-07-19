<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import VBox from '@/components/VBox.vue'
import ColorPanel from './ColorPanel.vue'

import NoiseScene, { defaultColorPoints } from './Scene'
import type { DomainTransform, Setup } from './Shader'
import { Simplex2D, Simplex3D, Simplex4D } from '@/Noise/Algorithms/Simplex'
import { SimplexValue2D, SimplexValue3D, SimplexValue4D } from '@/Noise/Algorithms/SimplexValue.ts'
import { Perlin2D, Perlin3D, Perlin4D } from '@/Noise/Algorithms/Perlin'
import { Value2D, Value3D, Value4D } from '@/Noise/Algorithms/Value'
import { Cubic2D, Cubic3D, Cubic4D } from '@/Noise/Algorithms/Cubic'
import { Worley2D, Worley3D, Worley4D } from '@/Noise/Algorithms/Worley'
import { WorleyF22D, WorleyF23D, WorleyF24D } from '@/Noise/Algorithms/WorleyF2.ts'

const color_points = ref(defaultColorPoints)
const algorithm = ref<string>('Simplex')
const dimension = ref<string>('2D')
const domain_transform = ref<DomainTransform>('None')
const n_grid_columns = ref(16)
const n_main_octaves = ref(1)
const persistence = ref(0.5)
const z_coord = ref(0)
const w_coord = ref(0)
const warp_strength = ref(0.1)
const n_warp_octaves = ref(1)
const active_tab = ref('Configuration')
const scene = shallowRef(new NoiseScene())
const canvasRef = ref<HTMLCanvasElement | null>(null)

function createNoiseAlgorithm(name: string, dimension: string) {
    switch (name) {
        case 'Simplex':
            switch (dimension) {
                case '2D':
                    return Simplex2D
                case '3D':
                    return Simplex3D
                default:
                    return Simplex4D
            }
        case 'Simplex Value':
            switch (dimension) {
                case '2D':
                    return SimplexValue2D
                case '3D':
                    return SimplexValue3D
                default:
                    return SimplexValue4D
            }
        case 'Perlin':
            switch (dimension) {
                case '2D':
                    return new Perlin2D()
                case '3D':
                    return new Perlin3D()
                default:
                    return new Perlin4D()
            }
        case 'Quadratic':
            switch (dimension) {
                case '2D':
                    return new Perlin2D(true)
                case '3D':
                    return new Perlin3D(true)
                default:
                    return new Perlin4D(true)
            }
        case 'Cubic':
            switch (dimension) {
                case '2D':
                    return Cubic2D
                case '3D':
                    return Cubic3D
                default:
                    return Cubic4D
            }
        case 'Value':
            switch (dimension) {
                case '2D':
                    return Value2D
                case '3D':
                    return Value3D
                default:
                    return Value4D
            }
        case 'Worley':
            switch (dimension) {
                case '2D':
                    return Worley2D
                case '3D':
                    return Worley3D
                default:
                    return Worley4D
            }
        default:
            switch (dimension) {
                case '2D':
                    return WorleyF22D
                case '3D':
                    return WorleyF23D
                default:
                    return WorleyF24D
            }
    }
}

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    await scene.value.init(
        {
            algorithm: createNoiseAlgorithm(algorithm.value, dimension.value),
            transform: domain_transform.value,
            n_grid_columns: n_grid_columns.value,
            n_main_octaves: n_main_octaves.value,
            persistence: persistence.value,
            z_coord: z_coord.value,
            w_coord: w_coord.value,
            n_warp_octaves: n_warp_octaves.value,
            warp_strength: warp_strength.value,
            color_points: color_points.value,
        },
        canvas,
    )
}

watch(color_points, (new_color_points) => {
    scene.value.updateColorPoints(new_color_points)
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
        if (canvasRef.value) {
            scene.value.cleanup()
            scene.value.init(
                {
                    algorithm: createNoiseAlgorithm(new_algorithm, new_dimension),
                    transform: new_domain_transform,
                    n_grid_columns: n_grid_columns.value,
                    n_main_octaves: n_main_octaves.value,
                    persistence: persistence.value,
                    z_coord: z_coord.value,
                    w_coord: w_coord.value,
                    n_warp_octaves: n_warp_octaves.value,
                    warp_strength: warp_strength.value,
                    color_points: color_points.value,
                },
                canvasRef.value,
            )
        }
    },
)

onBeforeUnmount(() => {
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
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors']"
        v-model="active_tab"
        @canvas-ready="initScene"
    >
        <VBox>
            <template v-if="active_tab === 'Configuration'">
                <TextSingleSelect
                    text="Noise algorithm"
                    name="algorithm"
                    :options="[
                        'Simplex',
                        'Simplex Value',
                        'Perlin',
                        'Quadratic',
                        'Cubic',
                        'Value',
                        'Worley',
                        'Worley F2 - F1',
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
                    <RangeInput
                        :min="0"
                        :max="1"
                        :step="0.01"
                        v-model="z_coord"
                        @animation="(value) => scene.updateZCoord(value)"
                    />

                    <template v-if="dimension === '4D'">
                        <p>W coordinate: {{ w_coord }}</p>
                        <RangeInput
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="w_coord"
                            @animation="(value) => scene.updateWCoord(value)"
                        />
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
                    <RangeInput
                        :min="0.01"
                        :max="1"
                        :step="0.01"
                        v-model="warp_strength"
                        @animation="(value) => scene.updateWarpStrength(value)"
                    />
                </template>

                <NumberSingleSelect
                    text="Grid size"
                    name="grid_size"
                    :options="[4, 8, 16, 32, 64]"
                    v-model="n_grid_columns"
                    @update:model-value="(value) => scene.updateGridDimensions(value)"
                />

                <NumberSingleSelect
                    v-if="domain_transform.startsWith('Warp')"
                    text="Warp octaves"
                    name="n_warp_octaves"
                    :options="[1, 2, 3, 4, 5]"
                    v-model="n_warp_octaves"
                    @update:model-value="(value) => scene.updateNWarpOctaves(value)"
                />

                <NumberSingleSelect
                    :text="domain_transform.startsWith('Warp') ? 'Main octaves' : 'Octaves'"
                    name="n_main_octaves"
                    :options="[1, 2, 3, 4, 5]"
                    v-model="n_main_octaves"
                    @update:model-value="(value) => scene.updateNMainOctaves(value)"
                />

                <template
                    v-if="
                        n_main_octaves > 1 ||
                        (domain_transform.startsWith('Warp') && n_warp_octaves > 1)
                    "
                >
                    <p>Persistence: {{ persistence }}</p>
                    <RangeInput
                        :min="0"
                        :max="1"
                        :step="0.01"
                        v-model="persistence"
                        @animation="(value) => scene.updatePersistence(value)"
                    />
                </template>
            </template>
            <template v-else>
                <ColorPanel v-model="color_points" />
            </template>
        </VBox>
    </SidePanelCanvas>
</template>

<style scoped>
.field {
    width: 100%;
}
</style>
