<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import TabControl from '@/components/TabControl.vue'
import RangeInput from '@/components/RangeInput.vue'

import {
    type NoiseAlgorithm,
    type NoiseDimension,
    type DomainTransform,
    type NoiseUniforms,
} from './NoiseUtils/NoiseScene'

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

watch(grid_size, (new_grid_size) => {})

watch(n_main_octaves, (new_n_octaves) => {})

watch(persistence, (new_persistence) => {})

watch(z_coord, (new_z_coord) => {})

watch(w_coord, (new_w_coord) => {})

watch(n_warp_octaves, (new_n_octaves) => {})

watch(warp_strength, (new_warp_strength) => {})

watch(dimension, (new_dimension) => {})

watch(
    [algorithm, dimension, domain_transform],
    ([new_algorithm, new_dimension, new_domain_transform]) => {},
)

const available_transforms = computed(() =>
    dimension.value === '2D'
        ? ['None', 'Warp', 'Warp 2X']
        : dimension.value === '3D'
          ? ['None', 'Rotate', 'Warp', 'Warp 2X']
          : ['None', 'Rotate'],
)
</script>

<template>
    <div class="container">
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
            v-if="n_main_octaves > 1 || (domain_transform.startsWith('Warp') && n_warp_octaves > 1)"
        >
            <p>Persistence: {{ persistence }}</p>
            <RangeInput :min="0" :max="1" :step="0.01" v-model="persistence" />
        </template>
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
