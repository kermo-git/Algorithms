import type { NoiseAlgorithm, Config } from '../Types'
import {
    fade_2d,
    fade_3d,
    fade_4d,
    pcd2d_1f,
    pcd3d_1f,
    pcd4d_1f,
    scramble_2d,
    scramble_3d,
    scramble_4d,
} from './Common'

export const Value2D: NoiseAlgorithm = {
    pos_type: 'vec2f',

    createShaderDependencies() {
        return `
            ${scramble_2d}
            ${pcd2d_1f}
            ${fade_2d}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
            fn ${name}(pos: vec2f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let p0 = scramble_2d(vec2i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = pcd2d_1f(p0);
                let b = pcd2d_1f(vec2u(p1.x, p0.y));
                let c = pcd2d_1f(vec2u(p0.x, p1.y));
                let d = pcd2d_1f(p1);
                
                let local_pos = pos - floor_pos;
                let s = fade_2d(local_pos);

                return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
            }
        `
    },
}

export const Value3D: NoiseAlgorithm = {
    pos_type: 'vec3f',

    createShaderDependencies() {
        return `
            ${scramble_3d}
            ${pcd3d_1f}
            ${fade_3d}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
            fn ${name}(pos: vec3f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let p0 = scramble_3d(vec3i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = pcd3d_1f(p0);
                let b = pcd3d_1f(vec3u(p1.x, p0.y, p0.z));
                let c = pcd3d_1f(vec3u(p0.x, p1.y, p0.z));
                let d = pcd3d_1f(vec3u(p1.x, p1.y, p0.z));
                let e = pcd3d_1f(vec3u(p0.x, p0.y, p1.z));
                let f = pcd3d_1f(vec3u(p1.x, p0.y, p1.z));
                let g = pcd3d_1f(vec3u(p0.x, p1.y, p1.z));
                let h = pcd3d_1f(p1);
                
                let local_pos = pos - floor_pos;
                let s = fade_3d(local_pos);
                
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

    createShaderDependencies() {
        return `
            ${scramble_4d}
            ${pcd4d_1f}
            ${fade_4d}
        `
    },

    createShader({ name }: Config) {
        return /* wgsl */ `
            fn ${name}(pos: vec4f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let p0 = scramble_4d(vec4i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = pcd4d_1f(p0);
                let b = pcd4d_1f(vec4u(p1.x, p0.y, p0.z, p0.w));
                let c = pcd4d_1f(vec4u(p0.x, p1.y, p0.z, p0.w));
                let d = pcd4d_1f(vec4u(p1.x, p1.y, p0.z, p0.w));
                let e = pcd4d_1f(vec4u(p0.x, p0.y, p1.z, p0.w));
                let f = pcd4d_1f(vec4u(p1.x, p0.y, p1.z, p0.w));
                let g = pcd4d_1f(vec4u(p0.x, p1.y, p1.z, p0.w));
                let h = pcd4d_1f(vec4u(p1.x, p1.y, p1.z, p0.w));

                let i = pcd4d_1f(vec4u(p0.x, p0.y, p0.z, p1.w));
                let j = pcd4d_1f(vec4u(p1.x, p0.y, p0.z, p1.w));
                let k = pcd4d_1f(vec4u(p0.x, p1.y, p0.z, p1.w));
                let l = pcd4d_1f(vec4u(p1.x, p1.y, p0.z, p1.w));
                let m = pcd4d_1f(vec4u(p0.x, p0.y, p1.z, p1.w));
                let n = pcd4d_1f(vec4u(p1.x, p0.y, p1.z, p1.w));
                let o = pcd4d_1f(vec4u(p0.x, p1.y, p1.z, p1.w));
                let p = pcd4d_1f(p1);
                
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
    },
}
