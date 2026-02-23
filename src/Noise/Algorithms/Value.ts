import type { NoiseAlgorithm, Config } from '../Types'

export const Value2D: NoiseAlgorithm = {
    pos_type: 'vec2f',
    createShader({ name, hash_table_size, n_channels }: Config) {
        const get_value = `${name}_value`
        const fade = `${name}_fade`

        return /* wgsl */ `
        fn ${get_value}(x: i32, y: i32, offset: i32) -> f32 {
            let hash = hash_table[offset + hash_table[offset + x] + y];
            return noise_features[hash].rand_point.x;
        }

        fn ${fade}(t: vec2f) -> vec2f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn ${name}(global_pos: vec2f, channel: i32) -> f32 {
            const HASH_MASK = vec2i(${hash_table_size - 1});
            let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});

            let floor_pos = floor(global_pos);
            let p0 = vec2i(floor_pos) & HASH_MASK;
            let p1 = (p0 + 1i) & HASH_MASK;
            
            let a = ${get_value}(p0.x, p0.y, hash_offset);
            let b = ${get_value}(p1.x, p0.y, hash_offset);
            let c = ${get_value}(p0.x, p1.y, hash_offset);
            let d = ${get_value}(p1.x, p1.y, hash_offset);
            
            let local_pos = global_pos - floor_pos;
            let s = ${fade}(local_pos);

            return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
        }
    `
    },
}

export const Value3D: NoiseAlgorithm = {
    pos_type: 'vec3f',
    createShader({ name, hash_table_size, n_channels }: Config) {
        const get_value = `${name}_value`
        const fade = `${name}_fade`

        return /* wgsl */ `
            fn ${get_value}(x: i32, y: i32, z: i32, offset: i32) -> f32 {
                let hash_x = hash_table[offset + x];
                let hash_y = hash_table[offset + hash_x + y];
                let hash_z = hash_table[offset + hash_y + z];
                return noise_features[hash_z].rand_point.x;
            }

            fn ${fade}(t: vec3f) -> vec3f {
                return t * t * t * (t * (t * 6 - 15) + 10);
            }

            fn ${name}(global_pos: vec3f, channel: i32) -> f32 {
                const HASH_MASK = vec3i(${hash_table_size - 1});
                let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});

                let floor_pos = floor(global_pos);
                let p0 = vec3i(floor_pos) & HASH_MASK;
                let p1 = (p0 + 1i) & HASH_MASK;
                
                let a = ${get_value}(p0.x, p0.y, p0.z, hash_offset);
                let b = ${get_value}(p1.x, p0.y, p0.z, hash_offset);
                let c = ${get_value}(p0.x, p1.y, p0.z, hash_offset);
                let d = ${get_value}(p1.x, p1.y, p0.z, hash_offset);
                let e = ${get_value}(p0.x, p0.y, p1.z, hash_offset);
                let f = ${get_value}(p1.x, p0.y, p1.z, hash_offset);
                let g = ${get_value}(p0.x, p1.y, p1.z, hash_offset);
                let h = ${get_value}(p1.x, p1.y, p1.z, hash_offset);
                
                let local_pos = global_pos - floor_pos;
                let s = ${fade}(local_pos);
                
                return mix(
                    mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
                    mix(mix(e, f, s.x), mix(g, h, s.x), s.y),
                    s.z
                );
            }
        `
    },
}

export const Value4D: NoiseAlgorithm = {
    pos_type: 'vec4f',
    createShader({ name, hash_table_size, n_channels }: Config) {
        const get_value = `${name}_value`
        const fade = `${name}_fade`

        return /* wgsl */ `
            fn ${get_value}(x: i32, y: i32, z: i32, w: i32, offset: i32) -> f32 {
                let hash_x = hash_table[offset + x];
                let hash_y = hash_table[offset + hash_x + y];
                let hash_z = hash_table[offset + hash_y + z];
                let hash_w = hash_table[offset + hash_z + w];
                return noise_features[hash_w].rand_point.x;
            }

            fn ${fade}(t: vec4f) -> vec4f {
                return t * t * t * (t * (t * 6 - 15) + 10);
            }

            fn ${name}(global_pos: vec4f, channel: i32) -> f32 {
                const HASH_MASK = vec4i(${hash_table_size - 1});
                let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});
                
                let floor_pos = floor(global_pos);
                let p0 = vec4i(floor_pos) & HASH_MASK;
                let p1 = (p0 + 1i) & HASH_MASK;
                
                let a = ${get_value}(p0.x, p0.y, p0.z, p0.w, hash_offset);
                let b = ${get_value}(p1.x, p0.y, p0.z, p0.w, hash_offset);
                let c = ${get_value}(p0.x, p1.y, p0.z, p0.w, hash_offset);
                let d = ${get_value}(p1.x, p1.y, p0.z, p0.w, hash_offset);
                let e = ${get_value}(p0.x, p0.y, p1.z, p0.w, hash_offset);
                let f = ${get_value}(p1.x, p0.y, p1.z, p0.w, hash_offset);
                let g = ${get_value}(p0.x, p1.y, p1.z, p0.w, hash_offset);
                let h = ${get_value}(p1.x, p1.y, p1.z, p0.w, hash_offset);

                let i = ${get_value}(p0.x, p0.y, p0.z, p1.w, hash_offset);
                let j = ${get_value}(p1.x, p0.y, p0.z, p1.w, hash_offset);
                let k = ${get_value}(p0.x, p1.y, p0.z, p1.w, hash_offset);
                let l = ${get_value}(p1.x, p1.y, p0.z, p1.w, hash_offset);
                let m = ${get_value}(p0.x, p0.y, p1.z, p1.w, hash_offset);
                let n = ${get_value}(p1.x, p0.y, p1.z, p1.w, hash_offset);
                let o = ${get_value}(p0.x, p1.y, p1.z, p1.w, hash_offset);
                let p = ${get_value}(p1.x, p1.y, p1.z, p1.w, hash_offset);
                
                let local_pos = global_pos - floor_pos;
                let s = ${fade}(local_pos);
                
                return mix(
                    mix(
                        mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
                        mix(mix(e, f, s.x), mix(g, h, s.x), s.y),
                        s.z
                    ),
                    mix(
                        mix(mix(i, j, s.x), mix(k, l, s.x), s.y),
                        mix(mix(m, n, s.x), mix(o, p, s.x), s.y),
                        s.z
                    ),
                    s.w
                );
            }
        `
    },
}
