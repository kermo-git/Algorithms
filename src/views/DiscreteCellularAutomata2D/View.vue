<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'

import { ShaderIssue } from '@/WebGPU/ShaderModuleSystem/Compiler'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import Checkbox from '@/components/Checkbox.vue'
import SimulationButtons from '@/components/SimulationButtons.vue'
import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import ColorPalette from '@/components/ColorPalette.vue'
import Menu from '@/components/Menu.vue'
import MenuItem from '@/components/MenuItem.vue'
import VBox from '@/components/VBox.vue'
import HBox from '@/components/HBox.vue'
import IntegerField from '@/components/IntegerField.vue'

import { Controller } from './Controller'
import { examples, type Example } from './Examples'

const default_example = examples[0]
const editor_code = ref(default_example.update_shader)
const n_states = ref(default_example.n_states)
const max_n_states = 32
const hex_colors = ref(default_example.hex_colors())
const skip_frames = ref(false)
const grid_size = ref(256)

const active_tab = ref('Configuration')
const is_running = ref(false)
const interval_ref = ref<number | null>(null)
const shader_issues = ref<ShaderIssue[]>([])
const canvasRef = ref<HTMLCanvasElement | null>(null)
const controller = shallowRef(new Controller())

let update_shader = default_example.update_shader

async function applyChanges() {
    if (editor_code.value != update_shader) {
        update_shader = editor_code.value
        shader_issues.value = await controller.value.setUpdateRule(
            editor_code.value
        )
    }
    const no_issues = shader_issues.value.length === 0
    if (!no_issues) {
        pause()
    }
    return no_issues
}

async function initScene() {
    if (canvasRef.value) {
        update_shader = editor_code.value

        controller.value.destroy()
        await controller.value.init(
            {
                update_shader: update_shader,
                n_states: n_states.value,
                max_n_states: 32,
                hex_colors: hex_colors.value,
                canvas_width: grid_size.value
            },
            canvasRef.value
        )
    }
}

async function onCanvasReady(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    initScene()
}

async function setExample(example: Example) {
    editor_code.value = example.update_shader
    n_states.value = example.n_states
    hex_colors.value = example.hex_colors()
    skip_frames.value = example.skip_frames
    await initScene()
}

async function resizeCanvas(new_grid_size: number) {
    const no_issues = await applyChanges()
    controller.value.resizeCanvas(new_grid_size, no_issues && !is_running.value)
}

async function reset() {
    if (await applyChanges()) {
        controller.value.reset(!is_running.value)
    }
}

async function step() {
    if (await applyChanges()) {
        controller.value.step(skip_frames.value ? 2 : 1)
    }
}

async function run() {
    if (await applyChanges()) {
        const fps = 60
        interval_ref.value = setInterval(
            () => controller.value.step(skip_frames.value ? 2 : 1),
            1000 / fps
        )
    }
}

function pause() {
    if (interval_ref.value) {
        clearInterval(interval_ref.value)
    }
    interval_ref.value = null
    is_running.value = false
}

onBeforeUnmount(() => {
    pause()
    controller.value.destroy()
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors', 'Examples']"
        :issues="shader_issues"
        v-model="active_tab"
        @canvas-ready="onCanvasReady"
    >
        <template v-slot:tabs>
            <template v-if="active_tab === 'Configuration'">
                <CodeEditor class="code-editor" v-model="editor_code" />
                <VBox>
                    <Checkbox name="skip_frames" v-model="skip_frames">
                        Skip every second frame
                    </Checkbox>
                    <HBox>
                        <p style="flex-grow: 1">
                            Number of states (2 - {{ max_n_states }})
                        </p>
                        <IntegerField
                            :min="2"
                            :max="max_n_states"
                            width="7rem"
                            v-model="n_states"
                            @update:model-value="
                                (new_n_states: number) => {
                                    controller.setNStates(
                                        new_n_states,
                                        !is_running
                                    )
                                }
                            "
                        />
                    </HBox>
                </VBox>
            </template>
            <VBox>
                <ColorPalette
                    v-if="active_tab === 'Colors'"
                    v-model="hex_colors"
                    @change-all-colors="
                        (new_colors) =>
                            controller.updateAllColors(new_colors, !is_running)
                    "
                    @change-single-color="
                        (index, value: string) =>
                            controller.updateSingleColor(
                                index,
                                value,
                                !is_running
                            )
                    "
                />
                <Menu v-if="active_tab === 'Examples'">
                    <MenuItem
                        v-for="example in examples"
                        :key="example.name"
                        :text="example.name"
                        @click="setExample(example)"
                    />
                </Menu>
            </VBox>
        </template>
        <template v-slot:pinned>
            <SimulationButtons
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
                <NumberSingleSelect
                    text="Grid size"
                    :options="[256, 512, 1024]"
                    v-model="grid_size"
                    @update:model-value="resizeCanvas"
                />
            </VBox>
        </template>
    </SidePanelCanvas>
</template>

<style scoped>
.code-editor {
    border-bottom: var(--border);
    width: 100%;
}
</style>
