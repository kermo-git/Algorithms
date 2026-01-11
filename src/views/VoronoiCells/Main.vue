<script setup lang="ts">
import { markRaw, onBeforeMount, onBeforeUnmount, ref, shallowRef } from 'vue'
import ComputeRenderer from '@/WebGPU/ComputeRenderer'
import SidePanelCanvas from '@/components/SidePanelCanvas.vue'

const active_tab = ref('Configuration')
const renderer = shallowRef(markRaw(new ComputeRenderer()))
const canvas_ref = ref<HTMLCanvasElement | null>(null)

async function onCanvasReady(canvas: HTMLCanvasElement) {
    canvas_ref.value = canvas
    const init_info = await renderer.value.init(canvas)
}

onBeforeUnmount(() => {
    renderer.value.cleanup()
})
</script>
<template>
    <SidePanelCanvas
        :tab-captions="['Configuration', 'Colors']"
        v-model="active_tab"
        @canvas-ready="onCanvasReady"
    >
        <template v-if="active_tab === 'Configuration'"> </template>
        <template v-else> </template>
    </SidePanelCanvas>
</template>
