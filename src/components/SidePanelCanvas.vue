<script setup lang="ts">
import { useAttrs } from 'vue'

import type { ShaderIssue } from '@/WebGPU/ComputeRenderer'
import Canvas from './Canvas.vue'
import TabControl from './TabControl.vue'

interface Props {
    tabCaptions: string[]
    issues?: ShaderIssue[]
}
const props = defineProps<Props>()
const active_tab = defineModel<string>()

defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
</script>

<template>
    <div class="container">
        <TabControl :captions="props.tabCaptions" v-model="active_tab">
            <slot />
        </TabControl>
        <Canvas :issues="props.issues" v-bind="attrs" />
    </div>
</template>

<style scoped>
.container {
    display: grid;
    grid-template-columns: 30% 70%;
    flex-grow: 1;
    overflow-y: scroll;
}
</style>
