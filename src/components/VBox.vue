<script setup lang="ts"></script>

<template>
    <div class="vbox"><slot /></div>
</template>

<style>
.vbox {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    gap: 1rem;
}

.vbox > p,
.vbox > h1,
.vbox > h2,
.vbox > h3,
.vbox > label {
    text-align: left;
    width: 100%;
    margin: 0;
}
</style>
