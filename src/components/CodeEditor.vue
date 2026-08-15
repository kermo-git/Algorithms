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

const bracket_map = new Map([
    ['(', ')'],
    ['{', '}']
])

const INDENT_REGEX = /^\s+/g
const OPEN_PAREN_REGEX = /(\()[^){]*$/g
const OPEN_CURLY_REGEX = /({)[^}(]*$/g
const CLOSE_PAREN_REGEX = /^[^}(]*(\))/g
const CLOSE_CURLY_REGEX = /^[^){]*(})/g

function onBeforeInput(ev: InputEvent) {
    const selection = window.getSelection()!
    const range = selection.getRangeAt(0)

    const caret_info = getCaretInfo(ev.target as HTMLDivElement, range)
    caret_offset = caret_info.offset

    if (ev.inputType === 'insertText' && ev.data) {
        caret_offset += 1
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
    } else if (ev.inputType === 'insertFromPaste') {
        const measure_div = document.createElement('div')
        measure_div.innerHTML = ev.dataTransfer?.getData('text/html') || ''
        const paste_text = measure_div.innerText
        caret_offset += paste_text.length
    } else if (ev.inputType === 'deleteContentBackward') {
        caret_offset -= Math.max(1, selection.toString().length)
    } else if (ev.inputType === 'insertParagraph') {
        ev.preventDefault()

        const { before, after } = caret_info

        const indent_match = before.match(INDENT_REGEX)
        let current_indentation = ''
        if (indent_match) {
            current_indentation = indent_match[0].replace(/\u{20}/gu, '\u{A0}')
        }
        let open_paren = !!before.match(OPEN_PAREN_REGEX)
        let open_curly = !!before.match(OPEN_CURLY_REGEX)
        let close_paren = !!after.match(CLOSE_PAREN_REGEX)
        let close_curly = !!after.match(CLOSE_CURLY_REGEX)

        let open_block = open_paren || open_curly
        let close_block =
            (open_paren && close_paren) || (open_curly && close_curly)

        let new_line_indentation = new Text(
            current_indentation + (open_block ? '\u{A0}\u{A0}\u{A0}\u{A0}' : '')
        )

        range.deleteContents()

        if (close_block) {
            range.insertNode(new Text(current_indentation))
            range.insertNode(document.createElement('br'))
        }

        range.insertNode(new_line_indentation)
        range.insertNode(document.createElement('br'))

        range.setStartAfter(new_line_indentation)
        range.setEndAfter(new_line_indentation)

        selection.removeAllRanges()
        selection.addRange(range)
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

function getCaretInfo(el: HTMLDivElement, range: Range) {
    let offset = 0
    let line_offset = 0
    let caret_found = false
    let text_line = ''

    function walk(node: Node, is_root = false) {
        if (!is_root) {
            if (node.nodeType === Node.TEXT_NODE) {
                const node_text = node.textContent || ''
                text_line += node_text

                if (node === range.endContainer) {
                    caret_found = true
                    offset += range.endOffset
                    line_offset += range.endOffset
                } else if (!caret_found) {
                    offset += node_text.length
                    line_offset += node_text.length
                }
            } else if (node.nodeName === 'BR') {
                if (node === range.endContainer || !caret_found) {
                    offset += 1
                    line_offset = 0
                    text_line = ''
                }
                if (node === range.endContainer || caret_found) {
                    return true
                }
            }
        }

        if (
            node === range.endContainer &&
            ['DIV', 'SPAN'].includes(node.nodeName)
        ) {
            // When a DIV node is the selection range endContainer, the endOffset
            // attribute tells the number of child nodes before the text caret,
            // not the number of characters inside a text node.
            caret_found = true

            for (let i = 0; i < node.childNodes.length; i++) {
                const child = node.childNodes[i]
                if (child.nodeName === 'BR') {
                    if (i < range.endOffset) {
                        text_line = ''
                        line_offset = 0
                        offset += 1
                    } else {
                        return true
                    }
                } else {
                    const node_text = child.textContent || ''
                    text_line += node_text

                    if (i < range.endOffset) {
                        line_offset += node_text.length
                        offset += node_text.length
                    }
                }
            }
        } else {
            for (const child of node.childNodes) {
                if (walk(child)) {
                    return true
                }
            }
        }
        return false
    }

    walk(el, true)

    return {
        offset,
        before: text_line.slice(0, line_offset),
        after: text_line.slice(line_offset)
    }
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
