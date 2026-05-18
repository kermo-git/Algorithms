<script setup lang="ts">
interface Props {
    justify?: string
}
defineProps<Props>()
</script>

<template>
    <div class="hbox">
        <slot />
    </div>
</template>

<style scoped>
.hbox {
    display: flex;
    width: 100%;
    gap: var(--small-gap);
    justify-content: v-bind("justify || 'space-around'");
    align-items: center;
    flex-wrap: wrap;
}
</style>
