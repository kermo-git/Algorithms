import { ShaderModule } from '@/WebGPU/ShaderModuleSystem/Modules'

function create_fade_fn(d: 2 | 3 | 4) {
    const name = `fade_${d}d`
    const vec_type = `vec${d}f`

    return /* wgsl */ `
        fn ${name}(t: ${vec_type}) -> ${vec_type} {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }
    `
}

function create_seed_fn(d: 2 | 3 | 4) {
    const name = `seed_${d}d`
    const vec_i = `vec${d}i`
    const vec_u = `vec${d}u`

    return /* wgsl */ `
        fn ${name}(coords: ${vec_i}, seed: u32) -> ${vec_u} {
            return bitcast<${vec_u}>(coords) + seed * 0x9E3779B9;
        }
    `
}

// https://www.shadertoy.com/view/XlGcRh
// https://www.jcgt.org/published/0009/03/02/

const float_factor = /* wgsl */ `(1.0 / f32(0xFFFFFFFFu))`

const pcg2d_scramble = /* wgsl */ `
    var h = v * 1664525u + 1013904223u;

    h.x += h.y * 1664525u;
    h.y += h.x * 1664525u;

    h = h ^ (h >> vec2u(16u));
`

const pcg2d_x = /* wgsl */ `
    ${pcg2d_scramble}

    h.x += h.y * 1664525u;
    h.x ^= h.x >> 16u;
`

const pcg2d_xy = /* wgsl */ `
    ${pcg2d_scramble}

    h.x += h.y * 1664525u;
    h.y += h.x * 1664525u;
    h = h ^ (h >> vec2u(16u));
`

const pcg3d_x = /* wgsl */ `
    var h = v * 1664525u + 1013904223u;

    h.x += h.y*h.z;
    h.y += h.z*h.x;
    h.z += h.x*h.y;

    h ^= h >> vec3u(16u);

    h.x += h.y*h.z;
`

const pcg3d_xyz = /* wgsl */ `
    ${pcg3d_x}
    h.y += h.z*h.x;
    h.z += h.x*h.y;
`

const pcg4d_x = /* wgsl */ `
    var h = v * 1664525u + 1013904223u;
    
    h.x += h.y*h.w;
    h.y += h.z*h.x;
    h.z += h.x*h.y;
    h.w += h.y*h.z;
    
    h ^= h >> vec4u(16u);

    h.x += h.y*h.w;
`

const pcg4d_xyzw = /* wgsl */ `
    ${pcg4d_x}
    h.y += h.z*h.x;
    h.z += h.x*h.y;
    h.w += h.y*h.z;
`

const shader_functions = new Map<string, string>([
    [
        'rotate_3d',
        /* wgsl */ `
        fn rotate_3d(pos: vec3f) -> vec3f {
            let xz = pos.x + pos.z;
            let s2 = xz * -0.211324865405187;
            let yy = pos.y * 0.577350269189626;
            let xr = pos.x + (s2 + yy);
            let zr = pos.z + (s2 + yy);
            let yr = xz * -0.577350269189626 + yy;
            return vec3f(xr, yr, zr);
        }`
    ],
    [
        'rotate_4d',
        /* wgsl */ `
        fn rotate_4d(pos: vec4f) -> vec4f {
            let xyz = pos.x + pos.y + pos.z;
            let s3 = xyz * (-1.0 / 6.0);
            let ww = pos.w * 0.5;

            let xr = pos.x + s3 + ww;
            let yr = pos.y + s3 + ww;
            let zr = pos.z + s3 + ww;
            let wr = xyz * -0.5 + ww;

            return vec4f(xr, yr, zr, wr);
        }`
    ],
    [
        'unit_vector_2d',
        /* wgsl */ `
        fn unit_vector_2d(noise_value: f32) -> vec2f {
            const full_circle = 2 * radians(180.0);
            let phi = full_circle * noise_value;
            return vec2f(cos(phi), sin(phi));
        }`
    ],
    [
        'unit_vector_3d',
        /* wgsl */ `
        fn unit_vector_3d(phi_noise: f32, theta_noise: f32) -> vec3f {
            const PI = radians(180.0);
            const full_circle = 2 * PI;

            let phi = full_circle * phi_noise;
            let theta = PI * theta_noise;
            let sin_theta = sin(theta);

            return vec3f(
                sin_theta * cos(phi),
                sin_theta * sin(phi),
                cos(theta)
            );
        }`
    ],
    ['fade_2d', create_fade_fn(2)],
    ['fade_3d', create_fade_fn(3)],
    ['fade_4d', create_fade_fn(4)],
    ['seed_2d', create_seed_fn(2)],
    ['seed_3d', create_seed_fn(3)],
    ['seed_4d', create_seed_fn(4)],
    [
        'cubic_interpolation',
        /* wgsl */ `
        fn cubic_interpolation(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
            let p = d - c - (a - b);
            return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
        }`
    ],
    [
        'hash_2u_1f',
        /* wgsl */ `
        fn hash_2u_1f(v: vec2u) -> f32 {
            ${pcg2d_x}
            return f32(h.x) * ${float_factor};
        }`
    ],
    [
        'hash_2u_2f',
        /* wgsl */ `
        fn hash_2u_2f(v: vec2u) -> vec2f {
            ${pcg2d_xy}
            return vec2f(h.xy) * ${float_factor};
        }`
    ],
    [
        'hash_2u_1u',
        /* wgsl */ `
        fn hash_2u_1u(v: vec2u) -> u32 {
            ${pcg2d_x}
            return h.x;
        }`
    ],
    [
        'hash_3u_1f',
        /* wgsl */ `
        fn hash_3u_1f(v: vec3u) -> f32 {
            ${pcg3d_x}
            return f32(h.x) * ${float_factor};
        }`
    ],
    [
        'hash_3u_3f',
        /* wgsl */ `
        fn hash_3u_3f(v: vec3u) -> vec3f {
            ${pcg3d_xyz}
            return vec3f(h.xyz) * ${float_factor};
        }`
    ],
    [
        'hash_3u_1u',
        /* wgsl */ `
        fn hash_3u_1u(v: vec3u) -> u32 {
            ${pcg3d_x}
            return h.x;
        }`
    ],
    [
        'hash_4u_1f',
        /* wgsl */ `
        fn hash_4u_1f(v: vec4u) -> f32 {
            ${pcg4d_x}
            return f32(h.x) * ${float_factor};
        }`
    ],
    [
        'hash_4u_4f',
        /* wgsl */ `
        fn hash_4u_4f(v: vec4u) -> vec4f {
            ${pcg4d_xyzw}
            return vec4f(h.xyzw) * ${float_factor};
        }`
    ],
    [
        'hash_4u_1u',
        /* wgsl */ `
        fn hash_4u_1u(v: vec4u) -> u32 {
            ${pcg4d_x}
            return h.x;
        }`
    ]
])

export function importFn(name: string): ShaderModule {
    return {
        name: name,
        code: shader_functions.get(name)!
    }
}

export function constSeed(name: string): ShaderModule {
    return {
        name: name,
        code: `const ${name} = bitcast<u32>(i32(${Date.now() >> 0}));`
    }
}

export const fade_2d = /* wgsl */ `
    fn fade_2d(t: vec2f) -> vec2f {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
`

export const fade_3d = /* wgsl */ `
    fn fade_3d(t: vec3f) -> vec3f {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
`

export const fade_4d = /* wgsl */ `
    fn fade_4d(t: vec4f) -> vec4f {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
`

export const cubic_interpolation = /* wgsl */ `
    fn cubic_interpolation(a: f32, b: f32, c: f32, d: f32, t: f32) -> f32 {
        let p = d - c - (a - b);
        return t * (t * (t * p + (a - b - p)) + (c - a)) + b;
    }
`

// https://softwareengineering.stackexchange.com/questions/402542/where-do-magic-hashing-constants-like-0x9e3779b9-and-0x9e3779b1-come-from

export const seed_2d = /* wgsl */ `
    fn seed_2d(coords: vec2i, seed: u32) -> vec2u {
        return bitcast<vec2u>(coords) + seed * 0x9E3779B9;
    }
`

export const seed_3d = /* wgsl */ `
    fn seed_3d(coords: vec3i, seed: u32) -> vec3u {
        return bitcast<vec3u>(coords) + seed * 0x9E3779B9;
    }
`

export const seed_4d = /* wgsl */ `
    fn seed_4d(coords: vec4i, seed: u32) -> vec4u {
        return bitcast<vec4u>(coords) + seed * 0x9E3779B9;
    }
`

export const hash_2u_1f = /* wgsl */ `
    fn hash_2u_1f(v: vec2u) -> f32 {
        ${pcg2d_x}
        return f32(h.x) * ${float_factor};
    }
`

export const hash_2u_2f = /* wgsl */ `
    fn hash_2u_2f(v: vec2u) -> vec2f {
        ${pcg2d_xy}
        return vec2f(h.xy) * ${float_factor};
    }
`

export const hash_2u_1u = /* wgsl */ `
    fn hash_2u_1u(v: vec2u) -> u32 {
        ${pcg2d_x}
        return h.x;
    }
`

export const hash_3u_1f = /* wgsl */ `
    fn hash_3u_1f(v: vec3u) -> f32 {
        ${pcg3d_x}
        return f32(h.x) * ${float_factor};
    }
`

export const hash_3u_3f = /* wgsl */ `
    fn hash_3u_3f(v: vec3u) -> vec3f {
        ${pcg3d_xyz}
        return vec3f(h.xyz) * ${float_factor};
    }
`

export const hash_3u_1u = /* wgsl */ `
    fn hash_3u_1u(v: vec3u) -> u32 {
        ${pcg3d_x}
        return h.x;
    }
`

export const hash_4u_1f = /* wgsl */ `
    fn hash_4u_1f(v: vec4u) -> f32 {
        ${pcg4d_x}
        return f32(h.x) * ${float_factor};
    }
`

export const hash_4u_4f = /* wgsl */ `
    fn hash_4u_4f(v: vec4u) -> vec4f {
        ${pcg4d_xyzw}
        return vec4f(h.xyzw) * ${float_factor};
    }
`

export const hash_4u_1u = /* wgsl */ `
    fn hash_4u_1u(v: vec4u) -> u32 {
        ${pcg4d_x}
        return h.x;
    }
`

export const allFunctions = `
    ${fade_2d}
    ${fade_3d}
    ${fade_4d}
    ${cubic_interpolation}
    ${seed_2d}
    ${seed_3d}
    ${seed_4d}
    ${hash_2u_1u}
    ${hash_2u_1f}
    ${hash_2u_2f}
    ${hash_3u_1u}
    ${hash_3u_1f}
    ${hash_3u_3f}
    ${hash_4u_1u}
    ${hash_4u_1f}
    ${hash_4u_4f}
`
