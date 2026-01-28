<script setup lang="ts">
import { markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { mdiPause, mdiPlay, mdiReload, mdiStepForward } from '@mdi/js'

import { lerpColorArray, shaderColorArray } from '@/utils/Colors'
import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import ComputeRenderer, { type ShaderIssue } from '@/WebGPU/ComputeRenderer'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import PanelSection from '@/components/PanelSection.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import MenuItem from '@/components/MenuItem.vue'
import ColorInput from '@/components/ColorInput.vue'
import CodeEditor from '@/components/CodeEditor.vue'

import { AutomatonScene } from './Scene'
import { examples, type Example } from './Examples'
import RangeInput from '@/components/RangeInput.vue'
import ColorPalette from '@/components/ColorPalette.vue'

const default_example = examples[0]

const activeTab = ref('Configuration')
const grid_size = ref(256)
const colors = ref(default_example.colors)
const n_states = ref(default_example.nStates)
const update_shader = ref<string>(default_example.updateRuleShader)
const FPS = ref<number>(60)

const scene = shallowRef(
    markRaw(
        new AutomatonScene({
            nStates: n_states.value,
            updateRuleShader: update_shader.value,
            nGridRows: grid_size.value,
            nGridCols: grid_size.value,
        }),
    ),
)
const renderer = shallowRef(markRaw(new ComputeRenderer()))
const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    canvas.width = grid_size.value
    canvas.height = grid_size.value

    const shader_colors = shaderColorArray(lerpColorArray(colors.value, n_states.value))

    const init_info = await renderer.value.init(canvas)
    shader_issues.value = await scene.value.init(shader_colors, init_info)
    renderer.value.render(scene.value)
}

function setExample(example: Example) {
    colors.value = example.colors
    n_states.value = example.nStates
    update_shader.value = example.updateRuleShader
}

function reset() {
    const device = renderer.value.device
    scene.value.initGrid(device)
    renderer.value.render(scene.value)
}

function automatonStep() {
    const device = renderer.value.device
    scene.value.switchGenerations(device)
    renderer.value.render(scene.value)
}

const intervalRef = ref<number | null>(null)

function startAnimation(fps: number) {
    intervalRef.value = setInterval(automatonStep, 1000 / fps)
}

function pauseAnimation() {
    if (intervalRef.value) {
        clearInterval(intervalRef.value)
    }
    intervalRef.value = null
}

watch(FPS, (new_FPS) => {
    pauseAnimation()
    startAnimation(new_FPS)
})

onBeforeUnmount(() => {
    pauseAnimation()
    renderer.value.cleanup()
    scene.value.cleanup()
})

watch(colors, (new_colors) => {
    const lerp_colors = lerpColorArray(new_colors, n_states.value)
    const device = renderer.value.device
    scene.value.updateColors(shaderColorArray(lerp_colors), device)
    renderer.value.render(scene.value)
})

watch([grid_size, n_states, update_shader], ([new_grid_size, new_n_states, new_update_shader]) => {
    renderer.value.cleanup()
    scene.value.cleanup()

    scene.value = new AutomatonScene({
        nStates: new_n_states,
        updateRuleShader: new_update_shader,
        nGridRows: new_grid_size,
        nGridCols: new_grid_size,
    })

    if (canvasRef.value) {
        initScene(canvasRef.value)
    }
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors', 'Run']"
        :issues="shader_issues"
        v-model="activeTab"
        @canvas-ready="initScene"
    >
        <template v-if="activeTab === 'Configuration'">
            <p>Number of states: {{ n_states }}</p>
            <RangeInput :min="2" :max="32" :step="1" v-model="n_states" />
            <CodeEditor
                caption="Update rule (WGSL)"
                button-text="Compile"
                height="27rem"
                v-model="update_shader"
            />
        </template>
        <template v-else-if="activeTab === 'Colors'">
            <ColorPalette v-model="colors" />
        </template>
        <template v-else>
            <PanelSection>
                <PanelButton :mdi-path="mdiReload" text="Reset" @click="reset" />
                <PanelButton :mdi-path="mdiStepForward" text="Step" @click="automatonStep()" />
                <PanelButton
                    v-if="!intervalRef"
                    :mdi-path="mdiPlay"
                    text="Run"
                    @click="() => startAnimation(FPS)"
                />
                <PanelButton v-else :mdi-path="mdiPause" text="Pause" @click="pauseAnimation" />
            </PanelSection>
            <NumberSingleSelect text="FPS" name="fps" :options="[15, 30, 60]" v-model="FPS" />
            <NumberSingleSelect
                text="Grid size"
                name="grid-size"
                :options="[256, 512, 1024]"
                v-model="grid_size"
            />
            <p>Load example</p>
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
