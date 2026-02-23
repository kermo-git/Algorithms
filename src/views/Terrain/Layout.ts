export const NOISE_GROUP = 1

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
                binding: 1, // hash_table
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 2, // rand_values
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 3, // rand_points_2d
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 4, // rand_points_3d
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 5, // unit_vectors_2d
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 6, // unit_vectors_3d
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
        ],
    })
}

export const TERRAIN_GROUP = 2

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

export const CANVAS_GROUP = 0

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
