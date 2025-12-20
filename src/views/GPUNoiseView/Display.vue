<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { mdiFloppy } from '@mdi/js'

import PanelButton from '@/components/PanelButton.vue'
import shader from './shaders/hello_world.wgsl?raw'

/* interface Props {
    shader: string
}
const props = defineProps<Props>() */
const canvasRef = ref<HTMLCanvasElement | null>(null)

onMounted(async () => {
    const canvas = canvasRef.value
    if (!canvas) {
        throw Error('HTML canvas element not found!')
    }
    const context = canvas.getContext('webgpu')
    if (!context) {
        throw Error('HTML canvas context not found!')
    }
    if (!navigator.gpu) {
        throw Error('WebGPU not supported!')
    }
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
        throw Error('WebGPU adapter not found!')
    }
    const device = await adapter.requestDevice()

    const shaderModule = device.createShaderModule({
        code: shader,
    })
    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: 'premultiplied',
    })

    const vertices = new Float32Array([
        // vertex 1 position
        0.0, 0.6, 0, 1,
        // vertex 1 color
        1, 0, 0, 1,
        // vertex 2 position
        -0.5, -0.6, 0, 1,
        // vertex 2 color
        0, 1, 0, 1,
        // vertex 3 position
        0.5, -0.6, 0, 1,
        // vertex 3 color
        0, 0, 1, 1,
    ])
    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length)

    const vertexBufferDescriptor: GPUVertexBufferLayout = {
        attributes: [
            {
                shaderLocation: 0, // Position
                offset: 0,
                format: 'float32x4',
            },
            {
                shaderLocation: 1, // Color
                offset: 16,
                format: 'float32x4',
            },
        ],
        arrayStride: 32,
        stepMode: 'vertex',
    }

    const pipelineDescriptor: GPURenderPipelineDescriptor = {
        vertex: {
            module: shaderModule,
            entryPoint: 'vertex_main',
            buffers: [vertexBufferDescriptor],
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fragment_main',
            targets: [
                {
                    format: navigator.gpu.getPreferredCanvasFormat(),
                },
            ],
        },
        primitive: {
            topology: 'triangle-list',
        },
        layout: 'auto',
    }
    const renderPipeline = device.createRenderPipeline(pipelineDescriptor)
    const commandEncoder = device.createCommandEncoder()
    const clearColor = { r: 0, g: 0.5, b: 1, a: 1 }

    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
                clearValue: clearColor,
                loadOp: 'clear',
                storeOp: 'store',
                view: context.getCurrentTexture().createView(),
            },
        ],
    }
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)

    passEncoder.setPipeline(renderPipeline)
    passEncoder.setVertexBuffer(0, vertexBuffer)
    passEncoder.draw(3)

    passEncoder.end()
    device.queue.submit([commandEncoder.finish()])
})

// watch(props, draw)

function download() {
    if (canvasRef.value) {
        const canvas = canvasRef.value
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.href = url
                link.download = 'image.png'

                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                URL.revokeObjectURL(url)
            }
        }, 'image/png')
    }
}
</script>

<template>
    <div class="main-container">
        <div class="canvas-container">
            <PanelButton class="save-button" :mdi-path="mdiFloppy" />
            <canvas width="1000" height="1000" ref="canvasRef" />
        </div>
        <PanelButton @click="download" class="save-button" :mdi-path="mdiFloppy" />
    </div>
</template>

<style scoped>
.main-container {
    position: relative;
    overflow-y: scroll;
}

.canvas-container {
    height: 100%;
    overflow-y: scroll;
}

canvas {
    width: 100%;
    image-rendering: pixelated;
}

.save-button {
    position: absolute;
    right: 2em;
    bottom: 2em;
}
</style>
