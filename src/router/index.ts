import { createRouter, createWebHistory } from 'vue-router'
import Automata1DView from '@/views/Automata1DView/Automata1DView.vue'
import NeuralAutomataView from '@/views/NeuralAutomataView/NeuralAutomataView.vue'
import NoiseView from '@/views/NoiseView/NoiseView.vue'
import GPUNoiseView from '@/views/GPUNoiseView/GPUNoiseView.vue'

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
            path: '/gpu-noise',
            name: 'gpu-noise',
            component: GPUNoiseView,
        },
    ],
})

export default router
