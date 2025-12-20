<script setup lang="ts">
import { ref } from 'vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelSection from '@/components/PanelSection.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import TabControl from '@/components/TabControl.vue'
import RangeInput from '@/components/RangeInput.vue'

import type { ColorPoint } from './types'
import ColorPanel from './ColorPanel.vue'
import Display from './Display.vue'

const colors = ref<ColorPoint[]>([
    { color: '#FFFFFF', point: 0 },
    { color: '#000000', point: 1 },
])
const color_type = ref('Continuous')
const algorithm = ref('Worley')
const dimension = ref('2D')
const domain_transform = ref('None')
const domain_warp_strength = ref(2)
const z_coord = ref(0)
const grid_size = ref(16)
const n_octaves = ref(1)
const persistence = ref(0.5)
const activeTab = ref('Configuration')
</script>

<template>
    <div class="container">
        <TabControl :captions="['Configuration', 'Colors']" v-model="activeTab">
            <template v-if="activeTab === 'Configuration'">
                <TextSingleSelect
                    text="Noise algorithm"
                    name="algorithm"
                    :options="[
                        'Worley',
                        'Worley (2nd closest)',
                        'Perlin',
                        'Simplex',
                        'Cubic',
                        'Value',
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
        <Display class="canvas" vertex-shader="" fragment-shader="" />
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
