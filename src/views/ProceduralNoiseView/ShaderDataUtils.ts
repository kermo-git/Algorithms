export const WG_DIM = 8

type BufferData = Float32Array<ArrayBuffer> | Int32Array<ArrayBuffer>

export function createFloatUniform(value: number, device: GPUDevice): GPUBuffer {
    const buffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    const data = new Float32Array([value])
    device.queue.writeBuffer(buffer, 0, data, 0, 1)
    return buffer
}

export function updateFloatUniform(buffer: GPUBuffer, value: number, device: GPUDevice) {
    const data = new Float32Array([value])
    device.queue.writeBuffer(buffer, 0, data, 0, 1)
}

export function createIntUniform(value: number, device: GPUDevice): GPUBuffer {
    const buffer = device.createBuffer({
        size: 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    const data = new Uint32Array([value])
    device.queue.writeBuffer(buffer, 0, data, 0, 1)
    return buffer
}

export function updateIntUniform(buffer: GPUBuffer, value: number, device: GPUDevice) {
    const data = new Uint32Array([value])
    device.queue.writeBuffer(buffer, 0, data, 0, 1)
}

export function createStorageBuffer(
    data: BufferData,
    device: GPUDevice,
    size: number = 0,
): GPUBuffer {
    const buffer = device.createBuffer({
        size: size || data.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(buffer, 0, data, 0, data.length)
    return buffer
}

export function updateStorageBuffer(buffer: GPUBuffer, data: BufferData, device: GPUDevice) {
    device.queue.writeBuffer(buffer, 0, data, 0, data.length)
}
