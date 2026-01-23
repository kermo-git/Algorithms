<script setup lang="ts">
import { ref } from 'vue'
import { mdiPlay } from '@mdi/js'
import PanelButton from './PanelButton.vue'

const code = defineModel<string>()
const editor_code = ref<string>(code.value || '')

function syntaxHighlight(text: string) {
    return text.replace(/\n/g, '<br/>').replace(/fn/g, '<span style="color: magenta">fn</span>')
}

function getCaretOffset(el: HTMLElement): number {
    const selection = window.getSelection()!
    const range = selection.getRangeAt(0)
    let offset = 0

    function walk(node: Node) {
        if (node.nodeName === 'BR' || node.nodeName === 'DIV') {
            offset += 1
        }
        if (node === range.endContainer) {
            offset += range.endOffset
            return true
        } else if (node.nodeType === Node.TEXT_NODE) {
            offset += (node as Text).length
        }
        for (const child of node.childNodes) {
            if (walk(child)) {
                return true
            }
        }
        return false
    }
    walk(el)
    return offset
}

function setCaretOffset(el: HTMLElement, offset: number) {
    const range = document.createRange()
    let current_offset = 0

    function walk(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const next_offset = current_offset + (node as Text).length

            if (offset <= next_offset) {
                range.setStart(node, offset - current_offset)
                range.collapse(true)
                return true
            }
            current_offset = next_offset
        } else if (node.nodeName === 'BR' || node.nodeName === 'DIV') {
            current_offset += 1
            if (offset === current_offset) {
                range.setStartAfter(node)
                range.collapse(true)
                return true
            }
        }
        for (const child of node.childNodes) {
            if (walk(child)) {
                return true
            }
        }
        return false
    }
    walk(el)

    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
}

function onInput(ev: InputEvent) {
    const el = ev.target as HTMLTextAreaElement
    const text = el.innerText

    const caret_offset = getCaretOffset(el)
    el.innerHTML = syntaxHighlight(text)
    setCaretOffset(el, caret_offset)
    editor_code.value = text
}
</script>

<template>
    <div class="container">
        <PanelButton
            text="Run"
            :mdi-path="mdiPlay"
            @click="
                () => {
                    code = editor_code
                    console.log(editor_code)
                }
            "
        />
        <div class="code-editor" contenteditable="true" @input="onInput" />
    </div>
</template>

<style scoped>
.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--small-gap);
}

.code-editor {
    resize: none;
    font-size: inherit;
    color: inherit;
    padding: var(--small-gap);
    background-color: var(--background-color);
    border-radius: var(--border-radius);
    border: var(--border);
    width: 100%;
    box-sizing: border-box;
}

.code-editor:focus {
    outline: none;
    border: var(--accent-border);
}
</style>
