<template>
    <input type="color" :style="`background-color: ${$attrs['value']}`" />
</template>

<style scoped>
input[type='color'] {
    border: var(--border);
    border-radius: var(--border-radius);
    height: var(--button-height);
    width: var(--button-height);
    cursor: pointer;
}

input[type='color']:hover {
    border: var(--accent-border);
}
</style>
