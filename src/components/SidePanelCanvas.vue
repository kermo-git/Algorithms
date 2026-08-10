<script setup lang="ts">
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
</script>

<template>
    <div class="container">
        <div class="side-panel">
            <TabControl
                style="flex-grow: 1"
                class="tab-control"
                :captions="props.tabCaptions"
                v-model="active_tab"
            >
                <slot />
            </TabControl>
            <div class="pinned-content" v-if="$slots.pinned">
                <slot name="pinned" />
            </div>
        </div>
        <Canvas :issues="props.issues" v-bind="$attrs" />
    </div>
</template>

<style scoped>
.container {
    display: grid;
    grid-template-columns: 30% 70%;
    flex-grow: 1;
    overflow-y: scroll;
}

.side-panel {
    border-right: var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.pinned-content {
    border-top: var(--border);
    flex: none;

    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}
</style>
