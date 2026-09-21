import { StaticResource } from './LinkedModules'

export function createLayoutEntry(
    resource: StaticResource,
    bind_index: number,
    visibility: GPUFlagsConstant
): GPUBindGroupLayoutEntry {
    const common = {
        binding: bind_index,
        visibility: visibility
    }

    switch (resource.kind) {
        case 'Uniform':
            return {
                ...common,
                buffer: {
                    type: 'uniform'
                }
            }
        case 'StorageBufferView':
            switch (resource.accessMode) {
                case 'read':
                    return {
                        ...common,
                        buffer: {
                            type: 'read-only-storage'
                        }
                    }
                case 'read_write':
                    return {
                        ...common,
                        buffer: {
                            type: 'storage'
                        }
                    }
            }
    }
}

export function createPingPongLayoutEntries(bind_index: number) {
    const entry1: GPUBindGroupLayoutEntry = {
        binding: bind_index,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: 'read-only-storage'
        }
    }
    const entry2: GPUBindGroupLayoutEntry = {
        binding: bind_index + 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
            type: 'storage'
        }
    }
    return { entry1, entry2 }
}

export function createCanvasLayout(
    device: GPUDevice,
    color_format: GPUTextureFormat
): GPUBindGroupLayout {
    return device.createBindGroupLayout({
        label: 'canvas',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                storageTexture: {
                    format: color_format
                }
            }
        ]
    })
}
