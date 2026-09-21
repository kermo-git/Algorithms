import { LinkedBuffer } from './LinkedModules'

export async function requestDevice(features: GPUFeatureName[] = []) {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
        throw Error('WebGPU adapter not found!')
    }
    const supportedFeatures = features.filter((f) => adapter.features.has(f))
    const device = await adapter.requestDevice({
        requiredFeatures: supportedFeatures
    })
    return { device, supportedFeatures }
}

export function createBuffer(device: GPUDevice, descriptor: LinkedBuffer) {
    const buffer = device.createBuffer({
        label: descriptor.name,
        size: descriptor.byteLength,
        usage: descriptor.usage
    })
    if (descriptor.data) {
        device.queue.writeBuffer(
            buffer,
            0,
            descriptor.data,
            0,
            descriptor.data.byteLength
        )
    }
    return buffer
}

export function createDepthStencilState(): GPUDepthStencilState {
    return {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus-stencil8'
    }
}

export function createDepthTexture(
    device: GPUDevice,
    width: number,
    height: number
): GPUTexture {
    return device.createTexture({
        size: { width, height },
        dimension: '2d',
        format: 'depth24plus-stencil8',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    })
}

export function createDepthStencilAttachment(
    depth_texture: GPUTexture
): GPURenderPassDepthStencilAttachment {
    return {
        view: depth_texture.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: 'load',
        stencilStoreOp: 'store'
    }
}
