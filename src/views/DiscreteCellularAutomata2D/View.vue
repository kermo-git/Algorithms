<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import CACodeEditor from '@/components/CACodeEditor.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import RangeInput from '@/components/RangeInput.vue'
import ColorPalette from '@/components/ColorPalette.vue'
import MenuItem from '@/components/MenuItem.vue'
import VBox from '@/components/VBox.vue'

import { lerpColorArray, shaderColorArray } from '@/utils/Colors'
import { type ShaderIssue } from '@/WebGPU/Engine'

import { AutomatonScene } from './Scene'
import { examples, type Example } from './Examples'

const default_example = examples[0]

const activeTab = ref('Configuration')
const grid_size = ref(256)
const colors = ref(default_example.colors)
const n_states = ref(default_example.nStates)

const update_shader = ref<string>(default_example.updateShader)
const editor_code = ref(default_example.updateShader)
const is_running = ref(false)
const skip_frames = ref(false)
const interval_ref = ref<number | null>(null)

const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)

const scene = shallowRef(
    new AutomatonScene({
        n_states: n_states.value,
        update_shader: update_shader.value,
        canvas_dims: [grid_size.value, grid_size.value],
    }),
)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    const shader_colors = shaderColorArray(lerpColorArray(colors.value, n_states.value))
    shader_issues.value = await scene.value.init(shader_colors, canvas)
}

function setExample(example: Example) {
    colors.value = example.colors
    n_states.value = example.nStates
    update_shader.value = example.updateShader
    editor_code.value = example.updateShader
}

function reset() {
    if (editor_code.value != update_shader.value) {
        update_shader.value = editor_code.value
    } else {
        scene.value.reset()
    }
}

function step() {
    scene.value.step(skip_frames.value ? 2 : 1)
}

function run() {
    const fps = 60
    interval_ref.value = setInterval(step, 1000 / fps)
}

function pause() {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
    }
    interval_ref.value = null
}

watch(colors, (new_colors) => {
    const lerp_colors = lerpColorArray(new_colors, n_states.value)
    scene.value.updateColors(shaderColorArray(lerp_colors))
})

watch([grid_size, n_states, update_shader], ([new_grid_size, new_n_states, new_update_shader]) => {
    pause()
    scene.value.cleanup()

    scene.value = new AutomatonScene({
        n_states: new_n_states,
        update_shader: new_update_shader,
        canvas_dims: [new_grid_size, new_grid_size],
    })

    if (canvasRef.value) {
        initScene(canvasRef.value)
    }

    if (is_running.value) {
        run()
    }
})

onBeforeUnmount(() => {
    pause()
    scene.value.cleanup()
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
            v-model:code="editor_code"
            v-model:is_running="is_running"
            v-model:skip-frames="skip_frames"
            @reset="reset"
            @step="step"
            @update:is_running="
                (value) => {
                    if (value) {
                        run()
                    } else {
                        pause()
                    }
                }
            "
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
                    @click="setExample(example)"
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
