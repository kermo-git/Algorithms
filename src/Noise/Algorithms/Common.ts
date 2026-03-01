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

export const scramble_2d = /* wgsl */ `
    fn scramble_2d(coords: vec2i, seed: u32) -> vec2u {
        return bitcast<vec2u>(coords) + seed * 0x9E3779B9;
    }
`

export const scramble_3d = /* wgsl */ `
    fn scramble_3d(coords: vec3i, seed: u32) -> vec3u {
        return bitcast<vec3u>(coords) + seed * 0x9E3779B9;
    }
`

export const scramble_4d = /* wgsl */ `
    fn scramble_4d(coords: vec4i, seed: u32) -> vec4u {
        return bitcast<vec4u>(coords) + seed * 0x9E3779B9;
    }
`

// https://www.shadertoy.com/view/XlGcRh
// https://www.jcgt.org/published/0009/03/02/

const float_factor = /* wgsl */ `(1.0 / f32(0xFFFFFFFFu))`

const pcd2d_scramble = /* wgsl */ `
    var h = v * 1664525u + 1013904223u;

    h.x += h.y * 1664525u;
    h.y += h.x * 1664525u;

    h = h ^ (h >> vec2u(16u));
`

const pcd2d_x = /* wgsl */ `
    ${pcd2d_scramble}

    h.x += h.y * 1664525u;
    h.x ^= h.x >> 16u;
`

const pcd2d_xy = /* wgsl */ `
    ${pcd2d_scramble}

    h.x += h.y * 1664525u;
    h.y += h.x * 1664525u;
    h = h ^ (h >> vec2u(16u));
`

export const pcd2d_1f = /* wgsl */ `
    fn pcd2d_1f(v: vec2u) -> f32 {
        ${pcd2d_x}
        return f32(h.x) * ${float_factor};
    }
`

export const pcd2d_2f = /* wgsl */ `
    fn pcd2d_2f(v: vec2u) -> vec2f {
        ${pcd2d_xy}
        return vec2f(h.xy) * ${float_factor};
    }
`

export const pcd2d_1u = /* wgsl */ `
    fn pcd2d_1u(v: vec2u) -> u32 {
        ${pcd2d_x}
        return h.x;
    }
`

const pcd3d_x = /* wgsl */ `
    var h = v * 1664525u + 1013904223u;

    h.x += h.y*h.z;
    h.y += h.z*h.x;
    h.z += h.x*h.y;

    h ^= h >> vec3u(16u);

    h.x += h.y*h.z;
`

const pcd3d_xyz = /* wgsl */ `
    ${pcd3d_x}
    h.y += h.z*h.x;
    h.z += h.x*h.y;
`

export const pcd3d_1f = /* wgsl */ `
    fn pcd3d_1f(v: vec3u) -> f32 {
        ${pcd3d_x}
        return f32(h.x) * ${float_factor};
    }
`

export const pcd3d_3f = /* wgsl */ `
    fn pcd3d_3f(v: vec3u) -> vec3f {
        ${pcd3d_xyz}
        return vec3f(h.xyz) * ${float_factor};
    }
`

export const pcd3d_1u = /* wgsl */ `
    fn pcd3d_1u(v: vec3u) -> u32 {
        ${pcd3d_x}
        return h.x;
    }
`

const pcd4d_x = /* wgsl */ `
    var h = v * 1664525u + 1013904223u;
    
    h.x += h.y*h.w;
    h.y += h.z*h.x;
    h.z += h.x*h.y;
    h.w += h.y*h.z;
    
    h ^= h >> vec4u(16u);

    h.x += h.y*h.w;
`

const pcd4d_xyzw = /* wgsl */ `
    ${pcd4d_x}
    h.y += h.z*h.x;
    h.z += h.x*h.y;
    h.w += h.y*h.z;
`

export const pcd4d_1f = /* wgsl */ `
    fn pcd4d_1f(v: vec4u) -> f32 {
        ${pcd4d_x}
        return f32(h.x) * ${float_factor};
    }
`

export const pcd4d_4f = /* wgsl */ `
    fn pcd4d_4f(v: vec4u) -> vec4f {
        ${pcd4d_xyzw}
        return vec4f(h.xyzw) * ${float_factor};
    }
`

export const pcd4d_1u = /* wgsl */ `
    fn pcd4d_1u(v: vec4u) -> u32 {
        ${pcd4d_x}
        return h.x;
    }
`

export const allFunctions = `
    ${fade_2d}
    ${fade_3d}
    ${fade_4d}
    ${cubic_interpolation}
    ${pcd2d_1u}
    ${pcd2d_1f}
    ${pcd2d_2f}
    ${pcd3d_1u}
    ${pcd3d_1f}
    ${pcd3d_3f}
    ${pcd4d_1u}
    ${pcd4d_1f}
    ${pcd4d_4f}
`
