<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import PanelField from '@/components/PanelField.vue'
import RangeInput from '@/components/RangeInput.vue'
import Menu from '@/components/Menu.vue'
import MenuItem from '@/components/MenuItem.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import VBox from '@/components/VBox.vue'

import {
    generatePattern,
    createRule,
    type FirstGenType,
    getNumRules,
    generateRandomRow,
    initializeCenter
} from './Automaton1D'
import ColorPalette from './ColorPalette.vue'
import { examples } from './Examples'

const default_example = examples[0]

const active_tab = ref('Configuration')
const n_states = ref(default_example.nStates)
const neighborhood_radius = ref(default_example.neighborhoodRadius)
const first_gen_init = ref<FirstGenType>('Random')
const rule_number = ref(String(default_example.ruleNumber))
const lambda = ref(0)
const hex_colors = ref(default_example.hexColors())
const grid_size = ref(128)

const rule = computed(() => {
    return createRule(
        BigInt(rule_number.value),
        n_states.value,
        neighborhood_radius.value
    )
})

const first_gen = computed(() => {
    return first_gen_init.value === 'Random'
        ? generateRandomRow(grid_size.value, n_states.value)
        : initializeCenter(grid_size.value)
})

function copyRuleNumber() {
    navigator.clipboard.writeText(rule_number.value)
}

function randomizeRule() {
    rule.value.randomize(lambda.value)
    rule_number.value = String(rule.value.getRuleNumber())
}

const ruleNumberLabel = computed(() => {
    const strValue = String(
        getNumRules(n_states.value, neighborhood_radius.value) - 1n
    )

    if (
        (n_states.value == 2 && neighborhood_radius.value < 3) ||
        (n_states.value == 3 && neighborhood_radius.value == 1)
    ) {
        return `Rule number (0 - ${strValue})`
    }
    return `Rule number (up to ${strValue.length} digits)`
})

const canvas_ref = ref<HTMLCanvasElement | null>(null)

function onCanvasReady(canvas: HTMLCanvasElement) {
    canvas_ref.value = canvas
    generatePattern(canvas, first_gen.value, hex_colors.value, rule.value)
}

watch(
    [rule, first_gen, hex_colors],
    ([new_rule, new_first_gen, new_colors]) => {
        if (canvas_ref.value) {
            generatePattern(
                canvas_ref.value,
                new_first_gen,
                new_colors,
                new_rule
            )
        }
    }
)
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Examples']"
        v-model="active_tab"
        @canvas-ready="onCanvasReady"
    >
        <template v-slot:tabs>
            <VBox>
                <template v-if="active_tab === 'Configuration'">
                    <NumberSingleSelect
                        text="Number of states"
                        :options="[2, 3, 4]"
                        v-model="n_states"
                    />

                    <NumberSingleSelect
                        text="Neighborhood radius"
                        :options="[1, 2, 3]"
                        v-model="neighborhood_radius"
                    />

                    <TextSingleSelect
                        v-if="n_states == 2"
                        text="First generation initialization"
                        :options="['Random', 'Center']"
                        v-model="first_gen_init"
                    />

                    <label for="rule">{{ ruleNumberLabel }}</label>
                    <PanelField
                        container-width="100%"
                        id="rule"
                        type="text"
                        inputmode="numeric"
                        v-model="rule_number"
                        right-button-mdi-icon="content-copy"
                        @right-button-click="copyRuleNumber"
                    />

                    <p>Lambda: {{ lambda }}</p>

                    <RangeInput :min="0" :max="1" :step="0.01" v-model="lambda">
                        <PanelButton mdi-icon="dice-5" @click="randomizeRule" />
                    </RangeInput>

                    <ColorPalette v-model="hex_colors" :n="n_states" />
                </template>
                <template v-if="active_tab === 'Examples'">
                    <Menu>
                        <MenuItem
                            v-for="example in examples"
                            :text="example.name"
                            @click="
                                () => {
                                    rule_number = String(example.ruleNumber)
                                    n_states = example.nStates
                                    neighborhood_radius =
                                        example.neighborhoodRadius
                                    hex_colors = example.hexColors()
                                }
                            "
                        />
                    </Menu>
                </template>
            </VBox>
        </template>
        <template v-slot:pinned>
            <VBox>
                <NumberSingleSelect
                    text="Grid size"
                    :options="[64, 128, 256, 512]"
                    v-model="grid_size"
                />
            </VBox>
        </template>
    </SidePanelCanvas>
</template>
