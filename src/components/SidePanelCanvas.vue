<script setup lang="ts">
import { useAttrs } from 'vue'

import type { ShaderIssue } from '@/WebGPU/Engine'
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
            <template #no-padding>
                <slot name="no-padding" />
            </template>
            <template #default>
                <slot name="default" />
            </template>
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
