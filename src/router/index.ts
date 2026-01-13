import { createRouter, createWebHistory } from 'vue-router'
import Automata1DView from '@/views/Automata1D/Automata1DView.vue'
import NeuralAutomataView from '@/views/NeuralAutomata/NeuralAutomataView.vue'
import NoiseView from '@/views/Noise/NoiseView.vue'
import VoronoiView from '@/views/VoronoiCells/VoronoiView.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            redirect: '/ca1d',
        },
        {
            path: '/ca1d',
            name: 'ca1d',
            component: Automata1DView,
        },
        {
            path: '/nca',
            name: 'nca',
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
