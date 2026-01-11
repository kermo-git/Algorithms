<script setup lang="ts">
import { useAttrs } from 'vue'
import Canvas from './Canvas.vue'
import TabControl from './TabControl.vue'

interface Props {
    tabCaptions: string[]
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
        <Canvas v-bind="attrs" />
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
