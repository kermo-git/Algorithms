<script setup lang="ts">
import { computed, ref } from 'vue'
import { mdiContentCopy, mdiDice5 } from '@mdi/js'

import { generatePattern, createRule, type FirstGenType, getNumRules } from './Automaton1D'
import { Matrix } from '@/utils/Matrix'

import ColorSelector from '@/components/ColorSelector.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import PanelSection from '@/components/PanelSection.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import PixelCanvas from '@/components/PixelCanvas.vue'
import TabControl from '@/components/TabControl.vue'
import PanelField from '@/components/PanelField.vue'
import RangeInput from '@/components/RangeInput.vue'

const grid_size = ref(128)
const numStates = ref(2)
const neighborhoodRadius = ref(1)
const ruleNumber = ref('30')
const lambda = ref(0)

const colors = ref(['#323232', '#00CE00', '#DB04AA', '#0144DB'])

const rule = computed(() => {
    return createRule(BigInt(ruleNumber.value), numStates.value, neighborhoodRadius.value)
})
const ruleNumberLabel = computed(() => {
    const strValue = String(getNumRules(numStates.value, neighborhoodRadius.value) - 1n)

    if (
        (numStates.value == 2 && neighborhoodRadius.value < 3) ||
        (numStates.value == 3 && neighborhoodRadius.value == 1)
    ) {
        return `Rule number (0 - ${strValue})`
    }
    return `Rule number (up to ${strValue.length} digits)`
})

function copyRuleNumber() {
    navigator.clipboard.writeText(ruleNumber.value)
}

function randomizeRule() {
    rule.value.randomize(lambda.value)
    ruleNumber.value = String(rule.value.getRuleNumber())
}

const firstGen = ref<FirstGenType>('Random')

const matrix = computed(() => {
    const matrix = new Matrix(grid_size.value, grid_size.value, 0)

    if (numStates.value > 2) {
        generatePattern(matrix, 'Random', rule.value)
    } else {
        generatePattern(matrix, firstGen.value, rule.value)
    }
    return matrix
})

const activeTab = ref('Configuration')
</script>

<template>
    <div class="container">
        <TabControl :captions="['Configuration', 'Style']" v-model="activeTab">
            <template v-if="activeTab === 'Configuration'">
                <NumberSingleSelect
                    text="Number of states"
                    name="n-states"
                    :options="[2, 3, 4]"
                    v-model="numStates"
                />

                <NumberSingleSelect
                    text="Neighborhood radius"
                    name="radius"
                    :options="[1, 2, 3]"
                    v-model="neighborhoodRadius"
                />

                <TextSingleSelect
                    v-if="numStates == 2"
                    text="First generation initialization"
                    name="firstgen"
                    :options="['Random', 'Center']"
                    v-model="firstGen"
                />

                <label for="rule">{{ ruleNumberLabel }}</label>
                <PanelSection>
                    <PanelField id="rule" type="text" inputmode="numeric" v-model="ruleNumber" />
                    <PanelButton :mdi-path="mdiContentCopy" @click="copyRuleNumber" />
                </PanelSection>

                <p>Lambda: {{ lambda }}</p>

                <PanelSection>
                    <p>0</p>
                    <RangeInput class="lambda" :min="0" :max="1" :step="0.01" v-model="lambda" />
                    <p>1</p>
                    <PanelButton :mdi-path="mdiDice5" @click="randomizeRule" />
                </PanelSection>
            </template>
            <template v-if="activeTab === 'Style'">
                <p>Colors</p>

                <ColorSelector v-model="colors" />

                <NumberSingleSelect
                    text="Grid size"
                    name="gird-size"
                    :options="[64, 128, 256, 512]"
                    v-model="grid_size"
                />
            </template>
        </TabControl>
        <PixelCanvas class="canvas" :matrix="matrix" :colors="colors" :continuous-colors="false" />
    </div>
</template>

<style scoped>
.container {
    display: grid;
    grid-template-columns: 30% 70%;
    flex-grow: 1;
    overflow-y: scroll;
}

#rule,
.lambda {
    flex-grow: 1;
}
</style>
