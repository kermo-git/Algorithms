import { generateUnitVectors2D, generateUnitVectors3D, generateUnitVectors4D } from '../UnitVectors'
import { type NoiseAlgorithm, type Config } from '../Types'
import {
    fade_2d,
    fade_3d,
    fade_4d,
    pcd2d_1u,
    pcd3d_1u,
    pcd4d_1u,
    scramble_2d,
    scramble_3d,
    scramble_4d,
} from './Common'

export const Perlin2D: NoiseAlgorithm = {
    pos_type: 'vec2f',
    extra_data_type: 'array<vec2f>',

    generateExtraData() {
        return generateUnitVectors2D(16)
    },

    createShaderDependencies() {
        return `
            ${scramble_2d}
            ${pcd2d_1u}
            ${fade_2d}
        `
    },

    createShader({ name, extraBufferName }: Config) {
        const influence = `${name}_gradient`

        return /* wgsl */ `
            fn ${influence}(grid_pos: vec2u, local_vec: vec2f) -> f32 {
                let hash = pcd2d_1u(grid_pos) >> 28;
                return dot(${extraBufferName}[hash], local_vec);
            }

            fn ${name}(pos: vec2f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = scramble_2d(vec2i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${influence}(p0, u0);
                let b = ${influence}(
                    vec2u(p1.x, p0.y), 
                    vec2f(u1.x, u0.y)
                );
                let c = ${influence}(
                    vec2u(p0.x, p1.y),
                    vec2f(u0.x, u1.y)
                );
                let d = ${influence}(p1, u1);

                let s = fade_2d(u0);
                let n = mix(mix(a, b, s.x), mix(c, d, s.x), s.y);

                // https://digitalfreepen.com/2017/06/20/range-perlin-noise.html
                const norm_factor = 1 / sqrt(2);
                return clamp(norm_factor * n + 0.5, 0, 1);
            }
        `
    },
}

export const Perlin3D: NoiseAlgorithm = {
    pos_type: 'vec3f',
    extra_data_type: 'array<vec3f>',

    generateExtraData() {
        return generateUnitVectors3D(64)
    },

    createShaderDependencies() {
        return `
            ${scramble_3d}
            ${pcd3d_1u}
            ${fade_3d}
        `
    },

    createShader({ name, extraBufferName }: Config) {
        const influence = `${name}_influence`

        return /* wgsl */ `
            fn ${influence}(grid_pos: vec3u, local_vec: vec3f) -> f32 {
                let hash = pcd3d_1u(grid_pos) >> 26;
                return dot(${extraBufferName}[hash], local_vec);
            }

            fn ${name}(pos: vec3f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = scramble_3d(vec3i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${influence}(p0, u0);
                let b = ${influence}(
                    vec3u(p1.x, p0.yz), 
                    vec3f(u1.x, u0.yz)
                );
                let c = ${influence}(
                    vec3u(p0.x, p1.y, p0.z), 
                    vec3f(u0.x, u1.y, u0.z)
                );
                let d = ${influence}(
                    vec3u(p1.xy, p0.z), 
                    vec3f(u1.xy, u0.z)
                );
                let e = ${influence}(
                    vec3u(p0.xy, p1.z), 
                    vec3f(u0.xy, u1.z)
                );
                let f = ${influence}(
                    vec3u(p1.x, p0.y, p1.z), 
                    vec3f(u1.x, u0.y, u1.z)
                );
                let g = ${influence}(
                    vec3u(p0.x, p1.yz), 
                    vec3f(u0.x, u1.yz)
                );
                let h = ${influence}(p1, u1);

                let s = fade_3d(u0);
                
                let n = 1.55 * mix(
                    mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
                    mix(mix(e, f, s.x), mix(g, h, s.x), s.y),
                    s.z
                );
                return clamp(n, -1, 1) * 0.5 + 0.5;
            }
        `
    },
}

export const Perlin4D: NoiseAlgorithm = {
    pos_type: 'vec4f',
    extra_data_type: 'array<vec4f>',

    generateExtraData() {
        return generateUnitVectors4D(256)
    },

    createShaderDependencies() {
        return `
            ${scramble_4d}
            ${pcd4d_1u}
            ${fade_4d}
        `
    },

    createShader({ name, extraBufferName }: Config) {
        const influence = `${name}_influence`

        return /* wgsl */ `
            fn ${influence}(grid_pos: vec4u, local_vec: vec4f) -> f32 {
                let hash = pcd4d_1u(grid_pos) >> 24;
                return dot(${extraBufferName}[hash], local_vec);
            }

            fn ${name}(pos: vec4f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = scramble_4d(vec4i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${influence}(p0, u0);
                let b = ${influence}(vec4u(p1.x, p0.y, p0.z, p0.w), vec4f(u1.x, u0.y, u0.z, u0.w));
                let c = ${influence}(vec4u(p0.x, p1.y, p0.z, p0.w), vec4f(u0.x, u1.y, u0.z, u0.w));
                let d = ${influence}(vec4u(p1.x, p1.y, p0.z, p0.w), vec4f(u1.x, u1.y, u0.z, u0.w));
                let e = ${influence}(vec4u(p0.x, p0.y, p1.z, p0.w), vec4f(u0.x, u0.y, u1.z, u0.w));
                let f = ${influence}(vec4u(p1.x, p0.y, p1.z, p0.w), vec4f(u1.x, u0.y, u1.z, u0.w));
                let g = ${influence}(vec4u(p0.x, p1.y, p1.z, p0.w), vec4f(u0.x, u1.y, u1.z, u0.w));
                let h = ${influence}(vec4u(p1.x, p1.y, p1.z, p0.w), vec4f(u1.x, u1.y, u1.z, u0.w));

                let i = ${influence}(vec4u(p0.x, p0.y, p0.z, p1.w), vec4f(u0.x, u0.y, u0.z, u1.w));
                let j = ${influence}(vec4u(p1.x, p0.y, p0.z, p1.w), vec4f(u1.x, u0.y, u0.z, u1.w));
                let k = ${influence}(vec4u(p0.x, p1.y, p0.z, p1.w), vec4f(u0.x, u1.y, u0.z, u1.w));
                let l = ${influence}(vec4u(p1.x, p1.y, p0.z, p1.w), vec4f(u1.x, u1.y, u0.z, u1.w));
                let m = ${influence}(vec4u(p0.x, p0.y, p1.z, p1.w), vec4f(u0.x, u0.y, u1.z, u1.w));
                let n = ${influence}(vec4u(p1.x, p0.y, p1.z, p1.w), vec4f(u1.x, u0.y, u1.z, u1.w));
                let o = ${influence}(vec4u(p0.x, p1.y, p1.z, p1.w), vec4f(u0.x, u1.y, u1.z, u1.w));
                let p = ${influence}(p1, u1);

                let s = fade_4d(u0);
                
                let result = 1.57 * mix(
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
                return clamp(result, -1, 1) * 0.5 + 0.5;
            }
        `
    },
}
