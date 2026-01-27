import { createRouter, createWebHistory } from 'vue-router'
import Automata1DView from '@/views/CellularAutomata1D/View.vue'
import NeuralAutomataView from '@/views/NeuralCellularAutomata2D/View.vue'
import NoiseView from '@/views/Noise/View.vue'
import VoronoiView from '@/views/VoronoiCells/View.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/1d-ca',
        },
        {
            path: '/1d-ca',
            name: '1d-ca',
            component: Automata1DView,
        },
        {
            path: '/2d-neural-ca',
            name: '2d-neural-ca',
            component: NeuralAutomataView,
        },
        {
            path: '/noise',
            name: 'noise',
            component: NoiseView,
        },
        {
            path: '/voronoi',
            name: 'voronoi',
            component: VoronoiView,
        },
    ],
})

export default router
