export function createNoiseLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0, // unit_vectors_2D
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 1, // unit_vectors_3D
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
        ],
    })
}

export function createIndexBufferLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0, // vertex_index
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage',
                },
            },
        ],
    })
}

export function createTerrainLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0, // terrain A/B
                visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 1, // terrain A/B
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage',
                },
            },
        ],
    })
}

export function createUniformsLayout(device: GPUDevice) {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0, // struct Light: ambient_intensity, dir
                visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX,
                buffer: {
                    type: 'uniform',
                },
            },
            {
                binding: 1, // struct Camera: pos, projection_view
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: 'uniform',
                },
            },
        ],
    })
}

export function createCanvasLayout(device: GPUDevice, color_format: GPUTextureFormat) {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    format: color_format,
                },
            },
        ],
    })
}
