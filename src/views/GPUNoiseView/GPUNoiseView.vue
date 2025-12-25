<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelSection from '@/components/PanelSection.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import TabControl from '@/components/TabControl.vue'
import RangeInput from '@/components/RangeInput.vue'

import ColorPanel from './ColorPanel.vue'
import Display from './Display.vue'
import NoiseRenderer from './NoiseRenderer'
import { perlin2DShader, perlin3DShader } from './Perlin'

const colors = ref([
    { color: '#FFFFFF', point: 0 },
    { color: '#000000', point: 1 },
])
const color_type = ref('Continuous')
const algorithm = ref('Perlin')
const dimension = ref<'2D' | '3D'>('2D')
const domain_transform = ref('None')
const domain_warp_strength = ref(2)
const z_coord = ref(0)
const grid_size = ref(16)
const n_octaves = ref(1)
const persistence = ref(0.5)
const activeTab = ref('Configuration')

const renderer = new NoiseRenderer(perlin2DShader(), grid_size.value)

watch(grid_size, (new_grid_size) => {
    renderer.setGridSize(new_grid_size)
})

watch(z_coord, (new_z_coord) => {
    if (dimension.value == '3D') {
        renderer.setZCoordinate(new_z_coord)
    }
})
</script>

<template>
    <div class="container">
        <TabControl :captions="['Configuration', 'Colors']" v-model="activeTab">
            <template v-if="activeTab === 'Configuration'">
                <TextSingleSelect
                    text="Noise algorithm"
                    name="algorithm"
                    :options="[
                        'Perlin',
                        'Simplex',
                        'Cubic',
                        'Value',
                        'Worley',
                        'Worley (2nd closest)',
                    ]"
                    v-model="algorithm"
                />

                <TextSingleSelect
                    text="Noise dimension"
                    name="dimension"
                    :options="['2D', '3D']"
                    v-model="dimension"
                />

                <template v-if="dimension === '3D'">
                    <p>Z coordinate: {{ z_coord }}</p>

                    <PanelSection>
                        <p>0</p>
                        <RangeInput
                            class="label-field"
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="z_coord"
                        />
                        <p>1</p>
                    </PanelSection>

                    <TextSingleSelect
                        text="Domain transformation"
                        name="domain_transform"
                        :options="['None', 'Rotate', 'Warp']"
                        v-model="domain_transform"
                    />

                    <template v-if="domain_transform === 'Warp'">
                        <p>Warp strength: {{ domain_warp_strength }}</p>
                        <PanelSection>
                            <p>1</p>
                            <RangeInput
                                class="label-field"
                                :min="1"
                                :max="10"
                                :step="0.5"
                                v-model="domain_warp_strength"
                            />
                            <p>10</p>
                        </PanelSection>
                    </template>
                </template>

                <NumberSingleSelect
                    text="Grid size"
                    name="grid_size"
                    :options="[4, 8, 16, 32, 64]"
                    v-model="grid_size"
                />

                <NumberSingleSelect
                    text="Octaves"
                    name="n_octaves"
                    :options="[1, 2, 3, 4, 5]"
                    v-model="n_octaves"
                />

                <template v-if="n_octaves > 1">
                    <p>Persistence: {{ persistence }}</p>

                    <PanelSection>
                        <p>0</p>
                        <RangeInput
                            class="label-field"
                            :min="0"
                            :max="1"
                            :step="0.01"
                            v-model="persistence"
                        />
                        <p>1</p>
                    </PanelSection>
                </template>
            </template>
            <template v-else>
                <TextSingleSelect
                    text="Continuous colors"
                    name="dimension"
                    :options="['Discrete', 'Continuous']"
                    v-model="color_type"
                />
                <ColorPanel v-model="colors" />
            </template>
        </TabControl>
        <Display class="canvas" :renderer="renderer" />
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

.label-field {
    flex-grow: 1;
}
</style>
