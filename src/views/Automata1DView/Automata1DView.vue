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
import MenuItem from '@/components/MenuItem.vue'

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

const matrix = computed(() => {
    const matrix = new Matrix(grid_size.value, grid_size.value, 0)

    if (numStates.value > 2) {
        generatePattern(matrix, 'Random', rule.value)
    } else {
        generatePattern(matrix, firstGen.value, rule.value)
    }
    return matrix
})
// 2335625556394545159395908390974093792020598956310617536703204537284159283077526769509906220196232694853225496841069271945262618237674059118535950999359291515520747361969511508433952846495024696327185136219748564982438313640404377076536547102715362507487184212333594495961217179539080063703050804379439474459864152668733013954825296032742188292370853086221824419277934507402978972470626872940351654656634205308734642121615900502584214755067646353047090799044634601799170182065292574083140423930943035533717381357818750824649697014513487559152141767556508894151140391339041503466179916933145498202993275079223632183344
</script>

<template>
    <div class="container">
        <TabControl :captions="['Configuration', 'Examples', 'Style']" v-model="activeTab">
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

                <RangeInput :min="0" :max="1" :step="0.01" v-model="lambda">
                    <PanelButton :mdi-path="mdiDice5" @click="randomizeRule" />
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
                            colors = ['#323232', '#FECB3E', '#FF87FD', '#009200']
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
                            colors = ['#DAFFC1', '#91DB76', '#689C56', '#FFFFFF']
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
                            colors = ['#E6ABFF', '#AC51E4', '#5F158B', '#FAF2FA']
                        }
                    "
                />
                <MenuItem
                    text="Vines"
                    @click="
                        () => {
                            ruleNumber = '135497638344673206598927780380850347174'
                            numStates = 4
                            neighborhoodRadius = 1
                            colors = ['#FF87FD', '#323232', '#009200', '#FECB3E']
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
                            colors = ['#FECB3E', '#007628', '#000000', '#FFFFFF']
                        }
                    "
                />
                <MenuItem
                    text="City buildings"
                    @click="
                        () => {
                            ruleNumber = '2939828314'
                            numStates = 2
                            neighborhoodRadius = 2
                            colors = ['#F5CB6E', '#323232', '#000000', '#FFFFFF']
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
                            colors = ['#F7F6CF', '#7A7A7A', '#000000', '#FFFFFF']
                        }
                    "
                />
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

#rule {
    flex-grow: 1;
}
</style>
