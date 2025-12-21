export async function logCompilationMessages(module: GPUShaderModule) {
    const info = await module.getCompilationInfo()
    if (info.messages.length > 0) {
        for (const m in info.messages) {
            console.log(info.messages[m].message)
        }
    }
}

export async function webGPUComputeDemo() {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
        throw Error('WebGPU not supported!')
    }
    const device = await adapter.requestDevice()

    const NUM_ELEMENTS = 1000
    const BUFFER_SIZE = NUM_ELEMENTS * 4

    const shader_module = device.createShaderModule({
        code: /* wgsl */ `
            @group(0) @binding(0)
            var<storage, read_write> output: array<f32>;

            @compute @workgroup_size(64)
            fn main(
                @builtin(global_invocation_id)
                global_id: vec3u,
                
                @builtin(local_invocation_id)
                local_id: vec3u
            ) {
                if (global_id.x > ${NUM_ELEMENTS}) {
                    return;
                }
                output[global_id.x] = f32(global_id.x) * 1000 + f32(local_id.x);
            }
        `,
    })

    const output = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    })

    const staging = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    })

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage',
                },
            },
        ],
    })

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: output,
                },
            },
        ],
    })

    const computePipeLine = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        }),
        compute: {
            module: shader_module,
            entryPoint: 'main',
        },
    })

    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginComputePass()

    passEncoder.setPipeline(computePipeLine)
    passEncoder.setBindGroup(0, bindGroup)
    passEncoder.dispatchWorkgroups(Math.ceil(NUM_ELEMENTS / 64))
    passEncoder.end()

    commandEncoder.copyBufferToBuffer(output, 0, staging, 0, BUFFER_SIZE)
    device.queue.submit([commandEncoder.finish()])

    await staging.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE)
    const copyArrayBuffer = staging.getMappedRange(0, BUFFER_SIZE)
    const data = new Float32Array(copyArrayBuffer.slice())
    staging.unmap()

    return data
}

export async function webGPUComputeTextureDemo(context: GPUCanvasContext) {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
        throw Error('WebGPU not supported!')
    }
    const has_bgra8unorm_storage = adapter.features.has('bgra8unorm-storage')
    const device = await adapter.requestDevice({
        requiredFeatures: has_bgra8unorm_storage ? ['bgra8unorm-storage'] : [],
    })
    const color_format = has_bgra8unorm_storage
        ? navigator.gpu.getPreferredCanvasFormat()
        : 'rgba8unorm'

    context.configure({
        device: device,
        format: color_format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING,
    })
    const texture = context.getCurrentTexture()

    const shader_module = device.createShaderModule({
        code: /* wgsl */ `
            @group(0) @binding(0)
            var out_texture: texture_storage_2d<${color_format}, write>;

            @compute @workgroup_size(1)
            fn main(
                @builtin(global_invocation_id)
                id: vec3u
            ) {
                let pos = id.xy;
                let dims = textureDimensions(out_texture);
                let uv = vec2f(pos) / vec2f(dims);
                let color = vec4f(uv, 0, 1);
                textureStore(out_texture, pos, color);
            }
        `,
    })

    const pipeline = device.createComputePipeline({
        layout: 'auto',
        compute: {
            module: shader_module,
            entryPoint: 'main',
        },
    })

    const bindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: texture.createView(),
            },
        ],
    })

    const cmd_encoder = device.createCommandEncoder()
    const pass_encoder = cmd_encoder.beginComputePass()

    pass_encoder.setPipeline(pipeline)
    pass_encoder.setBindGroup(0, bindGroup)
    pass_encoder.dispatchWorkgroups(texture.width, texture.height)
    pass_encoder.end()

    device.queue.submit([cmd_encoder.finish()])
}
