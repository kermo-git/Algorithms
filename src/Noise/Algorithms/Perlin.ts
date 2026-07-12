import { generateUnitVectors2D, generateUnitVectors3D, generateUnitVectors4D } from '../UnitVectors'
import { type NoiseAlgorithm, type Config, type VecType } from '../Types'
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

function gradientCalculation(quadratic: boolean) {
    if (quadratic) {
        return /* wgsl */ `
                const float_factor = 3.0 / f32(0xFFFFFFFFu);
                let c = f32(hash) * float_factor - 1.5;
                return result + result * result * c;
            `
    } else {
        return 'return result;'
    }
}

export class Perlin2D implements NoiseAlgorithm {
    pos_type: VecType = 'vec2f'
    extra_data_type = 'array<vec2f>'
    // https://milesoetzel.substack.com/p/introducing-quadratic-noise-a-better
    quadratic: boolean

    constructor(quadratic?: boolean) {
        this.quadratic = quadratic || false
    }

    generateExtraData() {
        return generateUnitVectors2D(16)
    }

    createShaderDependencies() {
        return `
            ${scramble_2d}
            ${pcd2d_1u}
            ${fade_2d}
        `
    }

    createShader({ name, extraBufferName }: Config) {
        // https://digitalfreepen.com/2017/06/20/range-perlin-noise.html
        const norm_constant = this.quadratic ? 1.2 : Math.sqrt(2)

        return /* wgsl */ `
            fn ${name}_gradient(grid_pos: vec2u, local_vec: vec2f) -> f32 {
                let hash = pcd2d_1u(grid_pos);
                let result = dot(${extraBufferName}[hash >> 28], local_vec);
                ${gradientCalculation(this.quadratic)}
            }

            fn ${name}(pos: vec2f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = scramble_2d(vec2i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${name}_gradient(p0, u0);
                let b = ${name}_gradient(
                    vec2u(p1.x, p0.y), 
                    vec2f(u1.x, u0.y)
                );
                let c = ${name}_gradient(
                    vec2u(p0.x, p1.y),
                    vec2f(u0.x, u1.y)
                );
                let d = ${name}_gradient(p1, u1);

                let s = fade_2d(u0);
                let n = mix(mix(a, b, s.x), mix(c, d, s.x), s.y);

                return clamp(${norm_constant} * n, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}

export class Perlin3D implements NoiseAlgorithm {
    pos_type: VecType = 'vec3f'
    extra_data_type = 'array<vec3f>'
    quadratic: boolean

    constructor(quadratic?: boolean) {
        this.quadratic = quadratic || false
    }

    generateExtraData() {
        return generateUnitVectors3D(64)
    }

    createShaderDependencies() {
        return `
            ${scramble_3d}
            ${pcd3d_1u}
            ${fade_3d}
        `
    }

    createShader({ name, extraBufferName }: Config) {
        const norm_constant = this.quadratic ? 1.3 : 1.55

        return /* wgsl */ `
            fn ${name}_gradient(grid_pos: vec3u, local_vec: vec3f) -> f32 {
                let hash = pcd3d_1u(grid_pos);
                let result = dot(${extraBufferName}[hash >> 26], local_vec);
                ${gradientCalculation(this.quadratic)}
            }

            fn ${name}(pos: vec3f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = scramble_3d(vec3i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${name}_gradient(p0, u0);
                let b = ${name}_gradient(
                    vec3u(p1.x, p0.yz), 
                    vec3f(u1.x, u0.yz)
                );
                let c = ${name}_gradient(
                    vec3u(p0.x, p1.y, p0.z), 
                    vec3f(u0.x, u1.y, u0.z)
                );
                let d = ${name}_gradient(
                    vec3u(p1.xy, p0.z), 
                    vec3f(u1.xy, u0.z)
                );
                let e = ${name}_gradient(
                    vec3u(p0.xy, p1.z), 
                    vec3f(u0.xy, u1.z)
                );
                let f = ${name}_gradient(
                    vec3u(p1.x, p0.y, p1.z), 
                    vec3f(u1.x, u0.y, u1.z)
                );
                let g = ${name}_gradient(
                    vec3u(p0.x, p1.yz), 
                    vec3f(u0.x, u1.yz)
                );
                let h = ${name}_gradient(p1, u1);

                let s = fade_3d(u0);
                
                let n = mix(
                    mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
                    mix(mix(e, f, s.x), mix(g, h, s.x), s.y),
                    s.z
                );
                return clamp(${norm_constant} * n, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}

export class Perlin4D implements NoiseAlgorithm {
    pos_type: VecType = 'vec4f'
    extra_data_type = 'array<vec4f>'
    quadratic: boolean

    constructor(quadratic?: boolean) {
        this.quadratic = quadratic || false
    }

    generateExtraData() {
        return generateUnitVectors4D(256)
    }

    createShaderDependencies() {
        return `
            ${scramble_4d}
            ${pcd4d_1u}
            ${fade_4d}
        `
    }

    createShader({ name, extraBufferName }: Config) {
        const norm_constant = this.quadratic ? 1 : 1.57

        return /* wgsl */ `
            fn ${name}_gradient(grid_pos: vec4u, local_vec: vec4f) -> f32 {
                let hash = pcd4d_1u(grid_pos);
                let result = dot(${extraBufferName}[hash >> 24], local_vec);
                ${gradientCalculation(this.quadratic)}
            }

            fn ${name}(pos: vec4f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = scramble_4d(vec4i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${name}_gradient(p0, u0);
                let b = ${name}_gradient(vec4u(p1.x, p0.y, p0.z, p0.w), vec4f(u1.x, u0.y, u0.z, u0.w));
                let c = ${name}_gradient(vec4u(p0.x, p1.y, p0.z, p0.w), vec4f(u0.x, u1.y, u0.z, u0.w));
                let d = ${name}_gradient(vec4u(p1.x, p1.y, p0.z, p0.w), vec4f(u1.x, u1.y, u0.z, u0.w));
                let e = ${name}_gradient(vec4u(p0.x, p0.y, p1.z, p0.w), vec4f(u0.x, u0.y, u1.z, u0.w));
                let f = ${name}_gradient(vec4u(p1.x, p0.y, p1.z, p0.w), vec4f(u1.x, u0.y, u1.z, u0.w));
                let g = ${name}_gradient(vec4u(p0.x, p1.y, p1.z, p0.w), vec4f(u0.x, u1.y, u1.z, u0.w));
                let h = ${name}_gradient(vec4u(p1.x, p1.y, p1.z, p0.w), vec4f(u1.x, u1.y, u1.z, u0.w));

                let i = ${name}_gradient(vec4u(p0.x, p0.y, p0.z, p1.w), vec4f(u0.x, u0.y, u0.z, u1.w));
                let j = ${name}_gradient(vec4u(p1.x, p0.y, p0.z, p1.w), vec4f(u1.x, u0.y, u0.z, u1.w));
                let k = ${name}_gradient(vec4u(p0.x, p1.y, p0.z, p1.w), vec4f(u0.x, u1.y, u0.z, u1.w));
                let l = ${name}_gradient(vec4u(p1.x, p1.y, p0.z, p1.w), vec4f(u1.x, u1.y, u0.z, u1.w));
                let m = ${name}_gradient(vec4u(p0.x, p0.y, p1.z, p1.w), vec4f(u0.x, u0.y, u1.z, u1.w));
                let n = ${name}_gradient(vec4u(p1.x, p0.y, p1.z, p1.w), vec4f(u1.x, u0.y, u1.z, u1.w));
                let o = ${name}_gradient(vec4u(p0.x, p1.y, p1.z, p1.w), vec4f(u0.x, u1.y, u1.z, u1.w));
                let p = ${name}_gradient(p1, u1);

                let s = fade_4d(u0);
                
                let result = mix(
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
                return clamp(${norm_constant} * result, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}
