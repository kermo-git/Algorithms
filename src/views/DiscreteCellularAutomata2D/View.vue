<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import { lerpColorArray, shaderColorArray } from '@/utils/Colors'
import { type ShaderIssue } from '@/WebGPU/Engine'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import MenuItem from '@/components/MenuItem.vue'

import { AutomatonScene } from './Scene'
import { examples, type Example } from './Examples'
import RangeInput from '@/components/RangeInput.vue'
import ColorPalette from '@/components/ColorPalette.vue'
import CACodeEditor from '@/components/CACodeEditor.vue'
import VBox from '@/components/VBox.vue'

const default_example = examples[0]

const activeTab = ref('Configuration')
const grid_size = ref(256)
const colors = ref(default_example.colors)
const n_states = ref(default_example.nStates)
const update_shader = ref<string>(default_example.updateShader)

const scene = shallowRef(
    new AutomatonScene({
        n_states: n_states.value,
        update_shader: update_shader.value,
        n_grid_rows: grid_size.value,
        n_grid_cols: grid_size.value,
    }),
)
const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const shader_colors = shaderColorArray(lerpColorArray(colors.value, n_states.value))
    shader_issues.value = await scene.value.init(shader_colors, canvas)
}

onBeforeUnmount(() => {
    scene.value.cleanup()
})

function setExample(example: Example) {
    colors.value = example.colors
    n_states.value = example.nStates
    update_shader.value = example.updateShader
}

watch([grid_size, n_states, update_shader], ([new_grid_size, new_n_states, new_update_shader]) => {
    scene.value.cleanup()

    scene.value = new AutomatonScene({
        n_states: new_n_states,
        update_shader: new_update_shader,
        n_grid_rows: new_grid_size,
        n_grid_cols: new_grid_size,
    })

    if (canvasRef.value) {
        initScene(canvasRef.value)
    }
})

function reset() {
    scene.value.reset()
}

function step(two_frames?: boolean) {
    scene.value.step(two_frames ? 2 : 1)
}

watch(colors, (new_colors) => {
    const lerp_colors = lerpColorArray(new_colors, n_states.value)
    scene.value.updateColors(shaderColorArray(lerp_colors))
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors', 'Examples']"
        :issues="shader_issues"
        v-model="activeTab"
        @canvas-ready="initScene"
    >
        <CACodeEditor
            v-if="activeTab === 'Configuration'"
            :code="update_shader"
            @code-change="(new_update_shader) => (update_shader = new_update_shader)"
            @reset="reset"
            @step="step"
        />
        <VBox>
            <template v-if="activeTab === 'Configuration'">
                <p>Number of states: {{ n_states }}</p>
                <RangeInput :min="2" :max="32" :step="1" v-model="n_states" />
                <NumberSingleSelect
                    text="Grid size"
                    name="grid-size"
                    :options="[256, 512, 1024]"
                    v-model="grid_size"
                />
            </template>
            <template v-else-if="activeTab === 'Colors'">
                <ColorPalette v-model="colors" />
            </template>
            <template v-else>
                <MenuItem
                    v-for="example in examples"
                    :key="example.name"
                    :text="example.name"
                    @click="
                        () => {
                            setExample(example)
                        }
                    "
                />
            </template>
        </VBox>
    </SidePanelCanvas>
</template>

<style scoped>
.matrix {
    display: grid;
    border-right: var(--border);
    border-top: var(--border);
    width: 100%;
    aspect-ratio: 1 / 1;
}

.cell {
    border-left: var(--border);
    border-bottom: var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
}

.cell:hover {
    background-color: var(--accent-color) !important;
    color: var(--bg-color) !important;
}
</style>
