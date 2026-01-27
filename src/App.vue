<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
    <div class="app">
        <nav>
            <RouterLink class="router-link" to="/1d-ca">1D cellular automata</RouterLink>
            <RouterLink class="router-link" to="/2d-neural-ca"
                >2D neural cellular automata</RouterLink
            >
            <RouterLink class="router-link" to="/noise">Procedural noise</RouterLink>
            <RouterLink class="router-link" to="/voronoi">Voronoi cells</RouterLink>
        </nav>
        <RouterView />
    </div>
</template>

<style scoped>
.app {
    width: 100%;
    height: 100%;

    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;

    --button-height: 2.8rem;
    --label-height: 2.5rem; /* Just to get HTML label elements the same height as --button-height makes HTML button elements. */
    --border-radius: 0.7rem;
    --small-gap: 0.5rem;
    --bg-color: rgb(50, 50, 50);
    --secondary-color: rgb(100, 100, 100);
    --accent-color: rgb(255, 57, 156);
    --text-color: rgb(210, 210, 210);
    --border: 2pt solid var(--secondary-color);
    --accent-border: 2pt solid var(--accent-color);

    background-color: var(--bg-color);
    color: var(--text-color);
}

nav {
    flex-grow: 0;
    display: flex;
    flex-direction: row;
    justify-content: end;
    border-bottom: var(--border);
    padding: 0.5em;
    gap: 0.5em;
}

.router-link {
    color: var(--accent-color);
    font-weight: bold;
    padding: 0.5em;
    text-decoration: none;
    position: relative;
}

.router-link:hover {
    border-radius: 1em;
    background-color: var(--secondary-color);
}

.router-link-active {
    outline: var(--border);
    border-radius: 1em;
}
</style>
