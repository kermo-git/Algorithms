<template>
    <input type="color" :style="`background-color: ${$attrs['value']}`" />
</template>

<style scoped>
input[type='color'] {
    height: 4em;
    aspect-ratio: 1;
    border-radius: 30%;
    border: var(--border);
    cursor: pointer;
}

input[type='color']:hover {
    border: var(--accent-border);
}
</style>
