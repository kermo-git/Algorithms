<script setup lang="ts">
interface Props {
    captions: string[]
}
const props = defineProps<Props>()
const model = defineModel<string>()
</script>

<template>
    <div class="tab-control">
        <div v-if="props.captions.length > 0" class="tabs">
            <button
                v-for="caption in props.captions"
                :key="caption"
                @click="model = caption"
                :class="caption === model ? 'tab active' : 'tab inactive'"
            >
                {{ caption }}
            </button>
        </div>
        <div class="tab-content">
            <slot />
        </div>
    </div>
</template>

<style>
.tab-control {
    display: flex;
    flex-direction: column;
    align-items: center;
    border-right: var(--border);
    overflow: scroll;
}

.tab-control > * {
    width: 100%;
}

.tabs {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    border: none;
    height: min-content;
}

.tab {
    border: none;
    border-bottom: var(--border);
    font-size: inherit;
    color: inherit;
    background-color: inherit;
    flex-grow: 1;
    height: 3em;
}

.tab.active {
    border-bottom: var(--accent-border);
    font-weight: bold;
}

.tab.inactive:hover {
    background-color: var(--secondary-color);
}

.tab-content {
    flex-grow: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1em;
    gap: 1em;
    overflow: scroll;
}

.tab-content > p,
.tab-content > h1,
.tab-content > h2,
.tab-content > h3,
.tab-content > label {
    text-align: left;
    width: 100%;
    margin: 0;
}
</style>
