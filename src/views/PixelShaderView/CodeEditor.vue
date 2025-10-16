<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

interface Props {
    modelValue: string
}
const props = defineProps<Props>()

interface Emits {
    (e: 'update:modelValue', value: string): void
}
const emit = defineEmits<Emits>()

const input_layer = useTemplateRef('input-layer')
const highlight_layer = useTemplateRef('highlight-layer')

function applySyntaxHighlight(code: string) {
    return code
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;')
        .replace(/\n/g, '<br>')
        .replace(/\s/g, '&nbsp;')
        .replace(/\/\/.*?<br>/g, (match) => `<span style="color: green;">${match}</span>`)
        .replace(/\/\*.*?\*\//g, (match) => `<span style="color: green;">${match}</span>`)
        .replace(
            /const|let|var|return/g,
            (match) => `<span style="color: hotpink;">${match}</span>`,
        )
        .replace(
            /([=*+-;,&<>()])(\d+\.?\d*)([=*+-;,&<>()])/g,
            `$1<span style="color: cyan;">$2</span>$3`,
        )
}

onMounted(() => {
    if (input_layer.value && highlight_layer.value) {
        input_layer.value.value = props.modelValue
        highlight_layer.value.innerHTML = applySyntaxHighlight(props.modelValue)
    }
})

function onInput() {
    if (input_layer.value && highlight_layer.value) {
        const text = input_layer.value.value
        highlight_layer.value.innerHTML = applySyntaxHighlight(text)
        emit('update:modelValue', text)
    }
}
</script>

<template>
    <div class="code-editor">
        <textarea ref="input-layer" class="input-layer" :rows="30" :cols="50" @input="onInput" />
        <div ref="highlight-layer" class="highlight-layer"></div>
    </div>
</template>

<style scoped>
.code-editor {
    position: relative;
    width: 100%;
    height: 20em;
    overflow: auto;
    border: var(--border);
    background-color: var(--bg-color);
    border-radius: 1em;
}

.input-layer,
.highlight-layer {
    position: absolute;
    top: 0;
    left: 0;

    box-sizing: content-box;
    border: none;
    outline: none;
    background-color: transparent;
    padding: 0.5em;
    margin: 0;
    font-family: monospace;
}

.input-layer {
    z-index: 0;
    resize: none;
    font-size: inherit;
    color: gold;
}

.highlight-layer {
    z-index: 1;
    color: transparent;
    pointer-events: none;
}
</style>
