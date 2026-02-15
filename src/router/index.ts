import { createRouter, createWebHistory } from 'vue-router'
import Automata1DView from '@/views/CellularAutomata1D/View.vue'
import DiscreteAutomataView from '@/views/DiscreteCellularAutomata2D/View.vue'
import NeuralAutomataView from '@/views/NeuralCellularAutomata2D/View.vue'
import NoiseView from '@/views/Noise/View.vue'
import TerrainView from '@/views/Terrain/View.vue'
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
            path: '/2d-ca',
            name: '2d-ca',
            component: DiscreteAutomataView,
        },
        {
            path: '/neural-ca',
            name: 'neural-ca',
            component: NeuralAutomataView,
        },
        {
            path: '/noise',
            name: 'noise',
            component: NoiseView,
        },
        {
            path: '/terrain',
            name: 'terrain',
            component: TerrainView,
        },
        {
            path: '/voronoi',
            name: 'voronoi',
            component: VoronoiView,
        },
    ],
})

export default router
