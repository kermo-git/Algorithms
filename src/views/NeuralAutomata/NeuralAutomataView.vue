<script setup lang="ts">
import { markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { mdiPause, mdiPlay, mdiReload, mdiStepForward } from '@mdi/js'

import NumberSingleSelect from '@/components/NumberSingleSelect.vue'
import PanelButton from '@/components/PanelButton.vue'
import PanelSection from '@/components/PanelSection.vue'
import TextSingleSelect from '@/components/TextSingleSelect.vue'
import MatrixEditor from '@/views/NeuralAutomata/MatrixEditor.vue'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'

import MenuItem from '@/components/MenuItem.vue'
import ColorInput from '@/components/ColorInput.vue'
import type { FloatArray } from '@/WebGPU/ShaderDataUtils'
import { NeuralScene } from './NeuralScene'
import type { Activation } from './NeuralShader'
import ComputeRenderer from '@/WebGPU/ComputeRenderer'
import { shaderColorArray } from '@/utils/Colors'

import { examples, normalizeKernel, type Example } from './Examples'

const default_example = examples[0]

const activeTab = ref('Configuration')
const grid_size = ref(256)
const color_0 = ref(default_example.color_0)
const color_1 = ref(default_example.color_1)
const kernel_size = ref(default_example.kernel_size)
const kernel = ref<FloatArray>(default_example.get_kernel())
const activation = ref<Activation>(default_example.activation)
const FPS = ref<number>(60)

const scene = shallowRef(markRaw(new NeuralScene(activation.value)))
const renderer = shallowRef(markRaw(new ComputeRenderer()))
const canvasRef = ref<HTMLCanvasElement | null>(null)

async function initScene(canvas: HTMLCanvasElement) {
    canvasRef.value = canvas
    canvas.width = grid_size.value
    canvas.height = grid_size.value

    const init_info = await renderer.value.init(canvas)
    await scene.value.init(
        {
            grid_size: grid_size.value,
            kernel_size: kernel_size.value,
            kernel: kernel.value,
            colors: shaderColorArray([color_0.value, color_1.value]),
        },
        init_info,
    )
    renderer.value.render(scene.value)
}

function setExample(example: Example) {
    color_0.value = example.color_0
    color_1.value = example.color_1
    kernel_size.value = example.kernel_size
    kernel.value = example.get_kernel()
    activation.value = example.activation
}

function onKernelSizeChange(new_value: number) {
    const data_length = new_value * new_value
    kernel.value = new Float32Array(data_length)
}

function reset() {
    const device = renderer.value.device
    scene.value.initGrid(grid_size.value, device)
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

watch(grid_size, (new_grid_size) => {
    const canvas = canvasRef.value
    if (canvas) {
        canvas.width = new_grid_size
        canvas.height = new_grid_size
        reset()
    }
})

watch(kernel, (new_kernel) => {
    const device = renderer.value.device
    scene.value.updateKernel(kernel_size.value, new_kernel, device)
})

watch([color_0, color_1], ([new_color_0, new_color_1]) => {
    const device = renderer.value.device
    scene.value.updateColors(shaderColorArray([new_color_0, new_color_1]), device)
    renderer.value.render(scene.value)
})

watch(activation, (new_activation) => {
    renderer.value.cleanup()
    scene.value.cleanup()
    scene.value = new NeuralScene(new_activation)

    if (canvasRef.value) {
        initScene(canvasRef.value)
    }
})
</script>

<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Run']"
        v-model="activeTab"
        @canvas-ready="initScene"
    >
        <template v-if="activeTab === 'Configuration'">
            <TextSingleSelect
                text="Activation"
                name="activation"
                :options="['Discrete', 'Sigmoid', 'Inverted Gaussian']"
                v-model="activation"
            />

            <NumberSingleSelect
                text="Kernel size"
                name="radius"
                :options="[3, 5, 7, 9, 11]"
                v-model="kernel_size"
                @update:model-value="onKernelSizeChange"
            />

            <PanelSection>
                <PanelButton
                    text="Normalize kernel"
                    @click="
                        () => {
                            kernel = normalizeKernel(kernel)
                        }
                    "
                />
            </PanelSection>
            <MatrixEditor :matrix-size="kernel_size" v-model:matrix="kernel" />
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
            <PanelSection>
                <ColorInput v-model="color_0" />
                <p>Select colors</p>
                <ColorInput v-model="color_1" />
            </PanelSection>
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
