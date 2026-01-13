<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import TextSingleSelect from '@/components/TextSingleSelect.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'

import type { DomainTransform, NoiseAlgorithm, NoiseDimension, NoiseSetup } from './Types'

interface Props {
    allowNone?: boolean
    dimensions?: NoiseDimension[]
    transforms?: DomainTransform[]
}
const props = defineProps<Props>()

let allowed_dimensions: NoiseDimension[] = ['2D', '3D', '4D']
if (props.dimensions !== undefined) {
    allowed_dimensions = props.dimensions
}
let allowed_transforms: DomainTransform[] = ['None', 'Rotate', 'Warp', 'Warp 2X']
if (props.transforms !== undefined) {
    allowed_transforms = props.transforms
}

const noise = defineModel<NoiseSetup | null>('noise', {
    default: null,
})
const z_coord = defineModel<number>('z_coord', { default: 0 })
const w_coord = defineModel<number>('w_coord', { default: 0 })
const n_main_octaves = defineModel<number>('n_main_octaves', { default: 1 })
const persistence = defineModel<number>('persistence', { default: 0.5 })
const n_warp_octaves = defineModel<number>('n_warp_octaves', { default: 1 })
const warp_strength = defineModel<number>('warp_strength', { default: 2 })

const algorithm = ref<NoiseAlgorithm | 'None'>(noise.value?.algorithm || 'None')
const dimension = ref<NoiseDimension>(noise.value?.dimension || '2D')
const transform = ref<DomainTransform>(noise.value?.transform || 'None')

watch(dimension, (new_dimension) => {
    if (new_dimension === '2D' && transform.value === 'Rotate') {
        transform.value = 'None'
    }
    if (new_dimension === '4D' && transform.value.startsWith('Warp')) {
        transform.value = 'None'
    }
})

watch([algorithm, dimension, transform], ([new_algorithm, new_dimension, new_transform]) => {
    if (new_algorithm === 'None') {
        noise.value = null
    } else {
        noise.value = {
            algorithm: new_algorithm,
            dimension: new_dimension,
            transform: new_transform,
        }
    }
})

const noise_choices = computed(() => {
    const result = ['Perlin', 'Simplex', 'Cubic', 'Value', 'Worley', 'Worley (2nd closest)']
    if (props.allowNone) {
        return ['None'].concat(result)
    }
    return result
})

const transforms_choices = computed(() => {
    let result: DomainTransform[] = []

    if (noise.value) {
        if (noise.value.dimension === '2D') {
            result = ['None', 'Warp', 'Warp 2X']
        } else if (noise.value.dimension === '3D') {
            result = ['None', 'Rotate', 'Warp', 'Warp 2X']
        } else {
            result = ['None', 'Rotate']
        }
    }
    return result.filter((value) => allowed_transforms?.includes(value))
})
</script>

<template>
    <TextSingleSelect
        text="Noise algorithm"
        name="algorithm"
        :options="noise_choices"
        v-model="algorithm"
    />

    <template v-if="algorithm !== 'None'">
        <TextSingleSelect
            v-if="allowed_dimensions.length > 0"
            text="Noise dimension"
            name="dimension"
            :options="allowed_dimensions"
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
            v-if="transforms_choices.length > 1"
            text="Domain transformation"
            name="transform"
            :options="transforms_choices"
            v-model="transform"
        />

        <template v-if="transform.startsWith('Warp')">
            <p>Warp strength: {{ warp_strength }}</p>
            <RangeInput :min="1" :max="10" :step="0.1" v-model="warp_strength" />
        </template>

        <NumberSingleSelect
            v-if="transform.startsWith('Warp')"
            text="Warp octaves"
            name="n_warp_octaves"
            :options="[1, 2, 3, 4, 5]"
            v-model="n_warp_octaves"
        />

        <NumberSingleSelect
            :text="transform.startsWith('Warp') ? 'Main octaves' : 'Octaves'"
            name="n_main_octaves"
            :options="[1, 2, 3, 4, 5]"
            v-model="n_main_octaves"
        />

        <template v-if="n_main_octaves > 1 || (transform.startsWith('Warp') && n_warp_octaves > 1)">
            <p>Persistence: {{ persistence }}</p>
            <RangeInput :min="0" :max="1" :step="0.01" v-model="persistence" />
        </template>
    </template>
</template>
