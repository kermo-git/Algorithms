import { createRouter, createWebHistory } from 'vue-router'
import Automata1DView from '@/views/Automata1DView/Automata1DView.vue'
import NeuralAutomataView from '@/views/NeuralAutomataView/NeuralAutomataView.vue'
import ProceduralNoiseView from '@/views/ProceduralNoiseView/ProceduralNoiseView.vue'
import VoronoiCells from '@/views/VoronoiCells/Main.vue'

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
            component: ProceduralNoiseView,
        },
        {
            path: '/voronoi',
            name: 'voronoi',
            component: VoronoiCells,
        },
    ],
})

export default router
