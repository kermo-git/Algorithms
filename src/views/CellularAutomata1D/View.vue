<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import HBox from '@/components/HBox.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import PanelField from '@/components/PanelField.vue'
import RangeInput from '@/components/RangeInput.vue'
import MenuItem from '@/components/MenuItem.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import VBox from '@/components/VBox.vue'

import {
    generatePattern,
    createRule,
    type FirstGenType,
    getNumRules
} from './Automaton1D'
import ColorPalette from './ColorPalette.vue'

const activeTab = ref('Configuration')
const numStates = ref(2)
const neighborhoodRadius = ref(1)
const firstGen = ref<FirstGenType>('Random')
const ruleNumber = ref('30')
const lambda = ref(0)
const colors = ref(['#323232', '#FECB3E', '#FF87FD', '#009200'])
const grid_size = ref(128)

function copyRuleNumber() {
    navigator.clipboard.writeText(ruleNumber.value)
}

function randomizeRule() {
    rule.value.randomize(lambda.value)
    ruleNumber.value = String(rule.value.getRuleNumber())
}

const rule = computed(() => {
    return createRule(
        BigInt(ruleNumber.value),
        numStates.value,
        neighborhoodRadius.value
    )
})

const ruleNumberLabel = computed(() => {
    const strValue = String(
        getNumRules(numStates.value, neighborhoodRadius.value) - 1n
    )

    if (
        (numStates.value == 2 && neighborhoodRadius.value < 3) ||
        (numStates.value == 3 && neighborhoodRadius.value == 1)
    ) {
        return `Rule number (0 - ${strValue})`
    }
    return `Rule number (up to ${strValue.length} digits)`
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

function onCanvasReady(canvas: HTMLCanvasElement) {
    const aspect_ratio = canvas.clientHeight / canvas.clientWidth
    canvas.width = grid_size.value
    canvas.height = Math.floor(grid_size.value * aspect_ratio)

    canvasRef.value = canvas
    generatePattern(canvas, firstGen.value, colors.value, rule.value)
}

watch(
    [rule, grid_size, firstGen, colors],
    ([new_rule, new_grid_size, new_first_gen, new_colors]) => {
        if (canvasRef.value) {
            const canvas = canvasRef.value
            const aspect_ratio = canvas.clientHeight / canvas.clientWidth

            canvas.width = new_grid_size
            canvas.height = Math.floor(new_grid_size * aspect_ratio)
            generatePattern(canvas, new_first_gen, new_colors, new_rule)
        }
    }
)
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Examples', 'Style']"
        v-model="activeTab"
        @canvas-ready="onCanvasReady"
    >
        <VBox>
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
                <HBox>
                    <PanelField
                        id="rule"
                        type="text"
                        inputmode="numeric"
                        v-model="ruleNumber"
                    />
                    <PanelButton
                        mdi-icon="content-copy"
                        @click="copyRuleNumber"
                    />
                </HBox>

                <p>Lambda: {{ lambda }}</p>

                <RangeInput :min="0" :max="1" :step="0.01" v-model="lambda">
                    <PanelButton mdi-icon="dice-5" @click="randomizeRule" />
                </RangeInput>
            </template>
            <template v-if="activeTab === 'Examples'">
                <MenuItem
                    text="Rule 30"
                    @click="
                        () => {
                            ruleNumber = '30'
                            numStates = 2
                            neighborhoodRadius = 1
                            colors = [
                                '#323232',
                                '#FECB3E',
                                '#FF87FD',
                                '#009200'
                            ]
                        }
                    "
                />
                <MenuItem
                    text="Triangles"
                    @click="
                        () => {
                            ruleNumber = '6637593129346'
                            numStates = 3
                            neighborhoodRadius = 1
                            colors = [
                                '#DAFFC1',
                                '#91DB76',
                                '#689C56',
                                '#FFFFFF'
                            ]
                        }
                    "
                />
                <MenuItem
                    text="Sharp corners"
                    @click="
                        () => {
                            ruleNumber = '4234215280010'
                            numStates = 3
                            neighborhoodRadius = 1
                            colors = [
                                '#E6ABFF',
                                '#AC51E4',
                                '#5F158B',
                                '#FAF2FA'
                            ]
                        }
                    "
                />
                <MenuItem
                    text="Vines"
                    @click="
                        () => {
                            ruleNumber =
                                '135497638344673206598927780380850347174'
                            numStates = 4
                            neighborhoodRadius = 1
                            colors = [
                                '#FF87FD',
                                '#323232',
                                '#009200',
                                '#FECB3E'
                            ]
                        }
                    "
                />
                <MenuItem
                    text="Electrical circuit board"
                    @click="
                        () => {
                            ruleNumber = '609058266'
                            numStates = 2
                            neighborhoodRadius = 2
                            colors = [
                                '#FECB3E',
                                '#007628',
                                '#000000',
                                '#FFFFFF'
                            ]
                        }
                    "
                />
                <MenuItem
                    text="Tall buildings"
                    @click="
                        () => {
                            ruleNumber = '2939828314'
                            numStates = 2
                            neighborhoodRadius = 2
                            colors = [
                                '#F5CB6E',
                                '#323232',
                                '#000000',
                                '#FFFFFF'
                            ]
                        }
                    "
                />
                <MenuItem
                    text="City"
                    @click="
                        () => {
                            ruleNumber = '9548131633201461177601464909579195651'
                            numStates = 2
                            neighborhoodRadius = 3
                            colors = [
                                '#F7F6CF',
                                '#7A7A7A',
                                '#000000',
                                '#FFFFFF'
                            ]
                        }
                    "
                />
            </template>
            <template v-if="activeTab === 'Style'">
                <p>Colors</p>

                <ColorPalette v-model="colors" />

                <NumberSingleSelect
                    text="Grid size"
                    name="gird-size"
                    :options="[64, 128, 256, 512]"
                    v-model="grid_size"
                />
            </template>
        </VBox>
    </SidePanelCanvas>
</template>

<style scoped>
#rule {
    flex-grow: 1;
}
</style>
