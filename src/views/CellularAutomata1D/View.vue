<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import HBox from '@/components/HBox.vue'
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

const active_tab = ref('Configuration')
const n_states = ref(2)
const neighborhood_radius = ref(1)
const first_gen_init = ref<FirstGenType>('Random')
const rule_number = ref('30')
const lambda = ref(0)
const hex_colors = ref(['#323232', '#FECB3E', '#FF87FD', '#009200'])
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
    const aspect_ratio = canvas.clientHeight / canvas.clientWidth
    canvas.width = grid_size.value
    canvas.height = Math.floor(grid_size.value * aspect_ratio)

    canvas_ref.value = canvas
    generatePattern(canvas, first_gen.value, hex_colors.value, rule.value)
}

watch(
    [rule, grid_size, first_gen],
    ([new_rule, new_grid_size, new_first_gen]) => {
        if (canvas_ref.value) {
            const canvas = canvas_ref.value
            const aspect_ratio = canvas.clientHeight / canvas.clientWidth

            canvas.width = new_grid_size
            canvas.height = Math.floor(new_grid_size * aspect_ratio)
            generatePattern(canvas, new_first_gen, hex_colors.value, new_rule)
        }
    }
)

watch(hex_colors, (new_colors) => {
    if (canvas_ref.value) {
        const canvas = canvas_ref.value
        const aspect_ratio = canvas.clientHeight / canvas.clientWidth

        canvas.width = grid_size.value
        canvas.height = Math.floor(grid_size.value * aspect_ratio)
        generatePattern(canvas, first_gen.value, new_colors, rule.value)
    }
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Examples']"
        v-model="active_tab"
        @canvas-ready="onCanvasReady"
    >
        <VBox>
            <template v-if="active_tab === 'Configuration'">
                <NumberSingleSelect
                    text="Grid size"
                    :options="[64, 128, 256, 512]"
                    v-model="grid_size"
                />

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
                    container-style="width: 100%"
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

                <p>Colors</p>

                <ColorPalette v-model="hex_colors" />
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
                                neighborhood_radius = example.neighborhoodRadius
                                hex_colors = example.hexColors
                            }
                        "
                    />
                </Menu>
            </template>
        </VBox>
    </SidePanelCanvas>
</template>

<style scoped>
#rule {
    flex-grow: 1;
}
</style>
