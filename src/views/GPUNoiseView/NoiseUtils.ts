export interface NoiseUniforms {
    n_grid_columns: number | null
    z_coord: number | null
}

export function shaderHashTable(n: number = 256) {
    const hash_table = new Int32Array(2 * n)

    for (let i = 0; i < n; i++) {
        hash_table[i] = i
    }
    for (let i = 0; i < 256; i++) {
        const temp = hash_table[i]
        const swap_index = Math.floor(Math.random() * n)
        hash_table[i] = hash_table[swap_index]
        hash_table[swap_index] = temp
    }
    for (let i = 0; i < n; i++) {
        hash_table[n + i] = hash_table[i]
    }
    return hash_table
}

export function shaderRandomPoints2D(n: number = 256) {
    const array = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const offset = 2 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
    }
    return array
}

export function shaderRandomPoints3D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const offset = 4 * i
        array[offset] = Math.random()
        array[offset + 1] = Math.random()
        array[offset + 2] = Math.random()
    }
    return array
}

export function shaderUnitVectors2D(n: number = 256) {
    const array = new Float32Array(2 * n)

    for (let i = 0; i < n; i++) {
        const phi = (2 * Math.PI * i) / n
        const x = Math.cos(phi)
        const y = Math.sin(phi)

        const offset = 2 * i
        array[offset] = x
        array[offset + 1] = y
    }
    return array
}

export function shaderUnitVectors3D(n: number = 256) {
    const array = new Float32Array(4 * n)

    for (let i = 0; i < n; i++) {
        const phi = 2 * Math.PI * Math.random()
        const theta = Math.PI * Math.random()

        const sin_phi = Math.sin(phi)
        const cos_phi = Math.cos(phi)
        const sin_theta = Math.sin(theta)
        const cos_theta = Math.cos(theta)

        const x = sin_theta * cos_phi
        const y = sin_theta * sin_phi
        const z = cos_theta

        const offset = 4 * i
        array[offset] = x
        array[offset + 1] = y
        array[offset + 2] = z
    }
    return array
}

export function noiseShader(
    is_3D: boolean,
    color_format: string = 'rgba8unorm',
    wg_x: number = 8,
    wg_y: number = 8,
): string {
    const only_2D = is_3D ? '//' : ''
    const only_3D = is_3D ? '' : '//'

    return /* wgsl */ `
        @group(0) @binding(0) var texture: texture_storage_2d<${color_format}, write>;
        @group(1) @binding(0) var<uniform> n_grid_columns: f32;
        ${only_3D} @group(1) @binding(1) var<uniform> z_coordinate: f32;

        @compute @workgroup_size(${wg_x}, ${wg_y})
        fn main(
            @builtin(global_invocation_id) gid: vec3u
        ) {
            let dims = textureDimensions(texture);

            if (gid.x >= dims.x || gid.y >= dims.y) {
                return;
            }
            let dims_f = vec2f(dims);
            let n_grid_cells = vec2f(n_grid_columns, n_grid_columns * dims_f.y / dims_f.x);
            ${only_2D} let noise_pos = n_grid_cells * vec2f(gid.xy) / dims_f;
            ${only_3D} let noise_pos_2d = n_grid_cells * vec2f(gid.xy) / dims_f;
            ${only_3D} let noise_pos = vec3f(noise_pos_2d, z_coordinate);
            let noise_value = (noise(noise_pos) + 1.0) * 0.5;

            textureStore(
                texture, gid.xy, 
                vec4f(noise_value, noise_value, noise_value, 1)
            );
        }
    `
}
