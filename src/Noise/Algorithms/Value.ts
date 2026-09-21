import { importFn } from '../HelperFunctions'
import { NoiseModule } from '../Modules'

export function Value2D(): NoiseModule {
    return {
        name: 'value_2d',
        posType: 'vec2f',
        imports: [
            importFn('seed_2d'),
            importFn('hash_2u_1f'),
            importFn('fade_2d')
        ],
        code: /* wgsl */ `
            fn value_2d(pos: vec2f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let p0 = seed_2d(vec2i(floor_pos), seed);
                let p1 = p0 + 1u;
                
                let a = hash_2u_1f(p0);
                let b = hash_2u_1f(vec2u(p1.x, p0.y));
                let c = hash_2u_1f(vec2u(p0.x, p1.y));
                let d = hash_2u_1f(p1);
                
                let local_pos = pos - floor_pos;
                let s = fade_2d(local_pos);

                return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
            }
        `
    }
}

export function Value3D(): NoiseModule {
    return {
        name: 'value_3d',
        posType: 'vec3f',
        imports: [
            importFn('seed_3d'),
            importFn('hash_3u_1f'),
            importFn('fade_3d')
        ],
        code: /* wgsl */ `
            fn value_3d(pos: vec3f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let p0 = seed_3d(vec3i(floor_pos), seed);
                let p1 = p0 + 1u;
                
                let a = hash_3u_1f(p0);
                let b = hash_3u_1f(vec3u(p1.x, p0.y, p0.z));
                let c = hash_3u_1f(vec3u(p0.x, p1.y, p0.z));
                let d = hash_3u_1f(vec3u(p1.x, p1.y, p0.z));
                let e = hash_3u_1f(vec3u(p0.x, p0.y, p1.z));
                let f = hash_3u_1f(vec3u(p1.x, p0.y, p1.z));
                let g = hash_3u_1f(vec3u(p0.x, p1.y, p1.z));
                let h = hash_3u_1f(p1);
                
                let local_pos = pos - floor_pos;
                let s = fade_3d(local_pos);
                
                return mix(
                    mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
                    mix(mix(e, f, s.x), mix(g, h, s.x), s.y),
                    s.z
                );
            }
        `
    }
}

export function Value4D(): NoiseModule {
    return {
        name: 'value_4d',
        posType: 'vec4f',
        imports: [
            importFn('seed_4d'),
            importFn('hash_4u_1f'),
            importFn('fade_4d')
        ],
        code: /* wgsl */ `
            fn value_4d(pos: vec4f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let p0 = seed_4d(vec4i(floor_pos), seed);
                let p1 = p0 + 1u;
                
                let a = hash_4u_1f(p0);
                let b = hash_4u_1f(vec4u(p1.x, p0.y, p0.z, p0.w));
                let c = hash_4u_1f(vec4u(p0.x, p1.y, p0.z, p0.w));
                let d = hash_4u_1f(vec4u(p1.x, p1.y, p0.z, p0.w));
                let e = hash_4u_1f(vec4u(p0.x, p0.y, p1.z, p0.w));
                let f = hash_4u_1f(vec4u(p1.x, p0.y, p1.z, p0.w));
                let g = hash_4u_1f(vec4u(p0.x, p1.y, p1.z, p0.w));
                let h = hash_4u_1f(vec4u(p1.x, p1.y, p1.z, p0.w));

                let i = hash_4u_1f(vec4u(p0.x, p0.y, p0.z, p1.w));
                let j = hash_4u_1f(vec4u(p1.x, p0.y, p0.z, p1.w));
                let k = hash_4u_1f(vec4u(p0.x, p1.y, p0.z, p1.w));
                let l = hash_4u_1f(vec4u(p1.x, p1.y, p0.z, p1.w));
                let m = hash_4u_1f(vec4u(p0.x, p0.y, p1.z, p1.w));
                let n = hash_4u_1f(vec4u(p1.x, p0.y, p1.z, p1.w));
                let o = hash_4u_1f(vec4u(p0.x, p1.y, p1.z, p1.w));
                let p = hash_4u_1f(p1);
                
                let local_pos = pos - floor_pos;
                let s = fade_4d(local_pos);
                
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
    }
}
