<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'

const code = defineModel<string>()
const editor_ref = useTemplateRef('editor')
let caret_offset = 0

onMounted(() => {
    if (editor_ref.value) {
        const editor_code = code.value?.replace(/\u{20}/gu, '\u{A0}') || ''
        editor_ref.value.innerHTML = syntaxHighlight(editor_code)
    }
})

function onBeforeInput(ev: InputEvent) {
    const bracket_map = new Map([
        ['(', ')'],
        ['{', '}']
    ])

    const selection = window.getSelection()!
    const range = selection.getRangeAt(0)

    caret_offset = getCaretOffset(ev.target as HTMLDivElement)

    if (['insertText', 'insertParagraph'].includes(ev.inputType)) {
        caret_offset += 1
    } else if (ev.inputType === 'insertFromPaste') {
        const measure_div = document.createElement('div')
        measure_div.innerHTML = ev.dataTransfer?.getData('text/html') || ''
        const paste_text = measure_div.innerText
        caret_offset += paste_text.length
    } else if (ev.inputType === 'deleteContentBackward') {
        caret_offset -= Math.max(1, selection.toString().length)
    }

    if (ev.inputType === 'insertText' && ev.data) {
        const closing_bracket = bracket_map.get(ev.data)
        if (closing_bracket) {
            ev.preventDefault()

            const opening_bracket_node = new Text(ev.data)
            const closing_bracket_node = new Text(closing_bracket)
            const selected_text = range.cloneContents()

            range.deleteContents()
            range.insertNode(closing_bracket_node)
            range.insertNode(selected_text)
            range.insertNode(opening_bracket_node)

            range.setStartAfter(opening_bracket_node)
            range.setEndBefore(closing_bracket_node)

            selection.removeAllRanges()
            selection.addRange(range)
        }
    }
}

function onInput(ev: InputEvent) {
    const el = ev.target as HTMLTextAreaElement
    const text = el.innerText

    el.innerHTML = syntaxHighlight(text)
    setCaretOffset(el, caret_offset)
    code.value = text.replace(/\u{A0}/gu, '\u{20}')
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
    'return'
]

const SEP_REGEX = '[\\s=/+*\\(\\)\\{\\},;\\<\\>&]|^|$'
const SEP_BEFORE = `(?<=${SEP_REGEX})`
const SEP_AFTER = `(?=${SEP_REGEX})`

const LINE_COMMENT_REGEX = /(\/\/.*?)(?=<br>|$)/g
const MULTILINE_COMMENT_REGEX = /(\/\*.*?\*\/)/g
const KEYWORD_REGEX = new RegExp(
    `${SEP_BEFORE}(${KEYWORDS.join('|')})${SEP_AFTER}`,
    'g'
)
const NUMBER_REGEX = new RegExp(
    `${SEP_BEFORE}(-?\\d+\\.?\\d*[iuf]?)${SEP_AFTER}`,
    'g'
)
const FUNCTION_REGEX = new RegExp(`${SEP_BEFORE}([\\w]+)(?=\\s*\\()`, 'g')

function syntaxHighlight(text: string) {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(LINE_COMMENT_REGEX, '<span class="code-comment">$1</span>')
        .replace(
            MULTILINE_COMMENT_REGEX,
            '<span class="code-comment">$1</span>'
        )
        .replace(KEYWORD_REGEX, '<span class="code-keyword">$1</span>')
        .replace(NUMBER_REGEX, '<span class="code-number">$1</span>')
        .replace(FUNCTION_REGEX, '<span class="code-function">$1</span>')
}

function getCaretOffset(el: HTMLDivElement): number {
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
            } else if (node.nodeName === 'BR') {
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

    if (el === range.endContainer) {
        // When a DIV node is the selection range endContainer, the endOffset
        // attribute tells the number of child nodes before the text caret,
        // not the number of characters inside a text node.
        for (let i = 0; i < range.endOffset; i++) {
            const child = el.childNodes[i]

            if (child.nodeName === 'BR') {
                offset += 1
            } else {
                offset += child.textContent?.length || 0
            }
        }
    } else {
        walk(el, true)
    }
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
            } else if (node.nodeName === 'BR') {
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

    if (offset === 0 && el.childNodes[0].nodeName === 'BR') {
        range.setStartBefore(el.childNodes[0])
        range.collapse(true)
    } else {
        walk(el, true)
    }

    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
}
</script>

<template>
    <div
        ref="editor"
        class="code-editor"
        contenteditable="true"
        @input="onInput"
        @beforeinput="onBeforeInput"
    />
</template>

<style>
.code-editor {
    flex: none;
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
