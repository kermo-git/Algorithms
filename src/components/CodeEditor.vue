<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

interface Props {
    code: string
}
const props = defineProps<Props>()
const changed = defineModel<boolean>()
const editor_ref = useTemplateRef('editor')

onMounted(() => {
    if (editor_ref.value) {
        const editor_code = props.code?.replace(/\u{20}/gu, '\u{A0}') || ''
        editor_ref.value.innerHTML = syntaxHighlight(editor_code)
    }
})

function getCode() {
    const text = editor_ref.value?.innerText || ''
    return text.replace(/\u{A0}/gu, '\u{20}')
}

defineExpose({ getCode })

function onInput(ev: InputEvent) {
    const el = ev.target as HTMLTextAreaElement
    const text = el.innerText

    const caret_offset = getCaretOffset(el)
    el.innerHTML = syntaxHighlight(text)
    setCaretOffset(el, caret_offset)
    changed.value = true
}

const KEYWORDS = [
    'fn',
    'var',
    'let',
    'const',
    'bool',
    'true',
    'false',
    'u32',
    'i32',
    'f32',
    'vec2',
    'vec3',
    'vec4',
    'vec2u',
    'vec2i',
    'vec2f',
    'vec3u',
    'vec3i',
    'vec3f',
    'vec4u',
    'vec4i',
    'vec4f',
    'array',
    'struct',
    'if',
    'else',
    'switch',
    'case',
    'for',
    'while',
    'loop',
    'break',
    'continue',
    'continuing',
    'return',
]

const SEP_REGEX = '[\\s=/+*\\(\\)\\{\\},;\\<\\>&]|^|$'
const SEP_BEFORE = `(?<=${SEP_REGEX})`
const SEP_AFTER = `(?=${SEP_REGEX})`

const LINE_COMMENT_REGEX = /(\/\/.*?)(?=<br>|$)/g
const MULTILINE_COMMENT_REGEX = /(\/\*.*?\*\/)/g
const KEYWORD_REGEX = new RegExp(`${SEP_BEFORE}(${KEYWORDS.join('|')})${SEP_AFTER}`, 'g')
const NUMBER_REGEX = new RegExp(`${SEP_BEFORE}(-?\\d+\\.?\\d*[iuf]?)${SEP_AFTER}`, 'g')
const FUNCTION_REGEX = new RegExp(`${SEP_BEFORE}([\\w]+)(?=\\s*\\()`, 'g')

function syntaxHighlight(text: string) {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(LINE_COMMENT_REGEX, '<span class="code-comment">$1</span>')
        .replace(MULTILINE_COMMENT_REGEX, '<span class="code-comment">$1</span>')
        .replace(KEYWORD_REGEX, '<span class="code-keyword">$1</span>')
        .replace(NUMBER_REGEX, '<span class="code-number">$1</span>')
        .replace(FUNCTION_REGEX, '<span class="code-function">$1</span>')
}

function getCaretOffset(el: HTMLElement): number {
    const selection = window.getSelection()!
    const range = selection.getRangeAt(0)
    let offset = 0

    function walk(node: Node, is_root = false) {
        if (!is_root) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node === range.endContainer) {
                    offset += range.endOffset
                    return true
                }
                offset += (node as Text).length
            } else if (node.nodeName === 'BR' || node.nodeName === 'DIV') {
                offset += 1
                if (node === range.endContainer) {
                    return true
                }
            }
        }
        for (const child of node.childNodes) {
            if (walk(child)) {
                return true
            }
        }
        return false
    }
    walk(el, true)
    return offset
}

function setCaretOffset(el: HTMLElement, offset: number) {
    const range = document.createRange()
    let current_offset = 0

    function walk(node: Node, is_root = false) {
        if (!is_root) {
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
        }
        for (const child of node.childNodes) {
            if (walk(child)) {
                return true
            }
        }
        return false
    }
    walk(el, true)

    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
}
</script>

<template>
    <div ref="editor" class="code-editor" contenteditable="true" @input="onInput" />
</template>

<style>
.code-editor {
    font-size: inherit;
    font-family: monospace;
    padding: var(--small-gap);
    box-sizing: border-box;
    overflow-y: scroll;

    background-color: var(--code-bg-color);
    color: var(--code-text-color);
}

.code-editor:focus {
    outline: none;
}

.code-keyword {
    color: var(--code-keyword-color);
}

.code-function {
    color: var(--code-function-color);
}

.code-number {
    color: var(--code-number-color);
}

.code-comment,
.code-comment * {
    color: var(--code-comment-color);
}
</style>
