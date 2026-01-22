export type FloatArray = Float32Array<ArrayBuffer>
export type IntArray = Int32Array<ArrayBuffer>
export type UIntArray = Uint32Array<ArrayBuffer>
type BufferData = IntArray | UIntArray | FloatArray

export function createFloatUniform(value: number, device: GPUDevice): GPUBuffer {
    return createUniformBuffer(new Float32Array([value]), device)
}

export function updateFloatUniform(buffer: GPUBuffer, value: number, device: GPUDevice) {
    updateBuffer(buffer, new Float32Array([value]), device)
}

export function createIntUniform(value: number, device: GPUDevice): GPUBuffer {
    return createUniformBuffer(new Uint32Array([value]), device)
}

export function updateIntUniform(buffer: GPUBuffer, value: number, device: GPUDevice) {
    updateBuffer(buffer, new Uint32Array([value]), device)
}

export function createUniformBuffer(
    data: BufferData,
    device: GPUDevice,
    size: number = 0,
): GPUBuffer {
    return createBuffer(data, device, size, GPUBufferUsage.UNIFORM)
}

export function createStorageBuffer(
    data: BufferData,
    device: GPUDevice,
    size: number = 0,
): GPUBuffer {
    return createBuffer(data, device, size, GPUBufferUsage.STORAGE)
}

export function createBuffer(
    data: BufferData,
    device: GPUDevice,
    size: number = 0,
    usage: GPUFlagsConstant,
): GPUBuffer {
    const buffer = device.createBuffer({
        size: size || data.byteLength,
        usage: usage | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(buffer, 0, data, 0, data.length)
    return buffer
}

export function updateBuffer(buffer: GPUBuffer, data: BufferData, device: GPUDevice) {
    device.queue.writeBuffer(buffer, 0, data, 0, data.length)
}
