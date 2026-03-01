export const NOISE_GROUP = 0

export function createNoiseLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0, // n_grid_columns
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'uniform',
                },
            },
            {
                binding: 1, // unit_vectors_2D
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 2, // unit_vectors_3D
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
        ],
    })
}

export const TERRAIN_GROUP = 1

export function createTerrainLayout(device: GPUDevice): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        entries: [
            {
                binding: 0, // terrain A/B
                visibility: GPUShaderStage.COMPUTE,
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

export const CANVAS_GROUP = 2

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
