<template>
    <div class="panel-section">
        <slot />
    </div>
</template>

<style scoped>
.panel-section {
    display: flex;
    width: 100%;
    gap: 1em;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap;
}
</style>
