<script setup lang="ts">
import SvgIcon from '@jamescoyle/vue-icon'

interface Props {
    text?: string
    mdiPath?: string
}
const props = defineProps<Props>()
</script>

<template>
    <button>
        <span v-if="props.mdiPath">
            <svg-icon type="mdi" :path="props.mdiPath" />
        </span>
        <span class="button-text" v-if="props.text">{{ props.text }}</span>
    </button>
</template>

<style scoped>
button {
    border: var(--border);
    background-color: var(--secondary-color);
    border-radius: var(--border-radius);
    height: var(--button-height);
    min-width: var(--button-height);
    font-size: inherit;
    color: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
}

.button-text {
    margin-left: var(--button-gap);
    margin-right: var(--button-gap);
}

button:hover {
    border: var(--accent-border);
    cursor: pointer;
}

button:active {
    border: var(--accent-border);
    background-color: var(--accent-color);
    color: var(--bg-color);
}

button svg {
    font-size: 10pt;
}
</style>
