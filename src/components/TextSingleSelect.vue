<script setup lang="ts">
import HBox from './HBox.vue'
import PanelButton from './PanelButton.vue'

interface Props {
    text: string
    options: string[]
}
const props = defineProps<Props>()
const model = defineModel<string>()
</script>

<template>
    <p>{{ props.text }}</p>
    <HBox class="options" role="radiogroup" :aria-label="props.text">
        <PanelButton
            v-for="value in props.options"
            :key="value"
            role="radio"
            :aria-checked="model == value"
            :text="value"
            @click="model = value"
        />
    </HBox>
</template>

<style scoped>
.caption {
    width: 100%;
    margin: 0;
}

.options > button {
    flex-basis: 0;
    flex-grow: 1;
}
</style>
