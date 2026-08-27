import {
    generateUnitVectors2D,
    generateUnitVectors3D,
    generateUnitVectors4D,
    Gradients2D,
    Gradients3D,
    Gradients4D
} from '../UnitVectors'
import {
    type NoiseShaderFactory,
    type Config,
    type VecType,
    NoiseModule
} from '../Types'
import {
    createModule,
    fade_2d,
    fade_3d,
    fade_4d,
    hash_2u_1u,
    hash_3u_1u,
    hash_4u_1u,
    seed_2d,
    seed_3d,
    seed_4d
} from './Common'

export class Perlin2DModule implements NoiseModule {
    name = 'perlin_2d'
    secondParamType = 'u32'
    posType: VecType = 'vec2f'
    resources = [Gradients2D]
    imports = [
        createModule('seed_2d'),
        createModule('hash_2u_1u'),
        createModule('fade_2d')
    ]
    // https://milesoetzel.substack.com/p/introducing-quadratic-noise-a-better
    quadratic: boolean

    constructor(quadratic?: boolean) {
        this.quadratic = quadratic || false
    }

    emitShaderCode(): string {
        // https://digitalfreepen.com/2017/06/20/range-perlin-noise.html
        const norm_factor = this.quadratic ? 1.35 : 1.6

        return /* wgsl */ `
            fn perlin_2d_corner(grid_corner: vec2u, vec_to_sample_pos: vec2f) -> f32 {
                let hash = hash_2u_1u(grid_corner);
                let gradient = gradients_2D[hash >> 28];
                let result = dot(gradient, vec_to_sample_pos);
                ${gradientCalculation(this.quadratic)}
            }

            fn perlin_2d(pos: vec2f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = seed_2d(vec2i(floor_pos), seed);
                let p1 = p0 + 1u;
                
                let a = perlin_2d_corner(p0, u0);
                let b = perlin_2d_corner(vec2u(p1.x, p0.y), vec2f(u1.x, u0.y));
                let c = perlin_2d_corner(vec2u(p0.x, p1.y), vec2f(u0.x, u1.y));
                let d = perlin_2d_corner(p1, u1);

                let s = fade_2d(u0);
                let n = mix(mix(a, b, s.x), mix(c, d, s.x), s.y);

                return clamp(${norm_factor} * n, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}

export class Perlin3DModule implements NoiseModule {
    name = 'perlin_3d'
    secondParamType = 'u32'
    posType: VecType = 'vec3f'
    resources = [Gradients3D]
    imports = [
        createModule('seed_3d'),
        createModule('hash_3u_1u'),
        createModule('fade_3d')
    ]
    quadratic: boolean

    constructor(quadratic: boolean) {
        this.quadratic = quadratic
    }

    emitShaderCode(): string {
        const norm_factor = this.quadratic ? 1.5 : 1.7

        return /* wgsl */ `
            fn perlin_3d_corner(grid_corner: vec3u, vec_to_sample_pos: vec3f) -> f32 {
                let hash = hash_3u_1u(grid_corner);
                let gradient = gradients_3D[hash >> 26];
                let result = dot(gradient, vec_to_sample_pos);
                ${gradientCalculation(this.quadratic)}
            }

            fn perlin_3d(pos: vec3f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = seed_3d(vec3i(floor_pos), seed);
                let p1 = p0 + 1u;
                
                let a = perlin_3d_corner(p0, u0);
                let b = perlin_3d_corner(vec3u(p1.x, p0.y, p0.z), vec3f(u1.x, u0.y, u0.z));
                let c = perlin_3d_corner(vec3u(p0.x, p1.y, p0.z), vec3f(u0.x, u1.y, u0.z));
                let d = perlin_3d_corner(vec3u(p1.x, p1.y, p0.z), vec3f(u1.x, u1.y, u0.z));
                let e = perlin_3d_corner(vec3u(p0.x, p0.y, p1.z), vec3f(u0.x, u0.y, u1.z));
                let f = perlin_3d_corner(vec3u(p1.x, p0.y, p1.z), vec3f(u1.x, u0.y, u1.z));
                let g = perlin_3d_corner(vec3u(p0.x, p1.y, p1.z), vec3f(u0.x, u1.y, u1.z));
                let h = perlin_3d_corner(p1, u1);

                let s = fade_3d(u0);
                
                let n = mix(
                    mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
                    mix(mix(e, f, s.x), mix(g, h, s.x), s.y),
                    s.z
                );
                return clamp(${norm_factor} * n, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}

export class Perlin4DModule implements NoiseModule {
    name = 'perlin_4d'
    secondParamType = 'u32'
    posType: VecType = 'vec4f'
    resources = [Gradients4D]
    imports = [
        createModule('seed_4d'),
        createModule('hash_4u_1u'),
        createModule('fade_4d')
    ]
    quadratic: boolean

    constructor(quadratic: boolean) {
        this.quadratic = quadratic
    }

    emitShaderCode(): string {
        const norm_factor = this.quadratic ? 1.5 : 1.7

        return /* wgsl */ `
            fn perlin_4d_corner(grid_corner: vec4u, vec_to_sample_pos: vec4f) -> f32 {
                let hash = hash_4u_1u(grid_corner);
                let gradient = gradients_4D[hash >> 26];
                let result = dot(gradient, vec_to_sample_pos);
                ${gradientCalculation(this.quadratic)}
            }

            fn perlin_4d(pos: vec4f, seed: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = seed_4d(vec4i(floor_pos), seed);
                let p1 = p0 + 1u;
                
                let a = perlin_4d_corner(p0, u0);
                let b = perlin_4d_corner(vec4u(p1.x, p0.y, p0.z, p0.w), vec4f(u1.x, u0.y, u0.z, u0.w));
                let c = perlin_4d_corner(vec4u(p0.x, p1.y, p0.z, p0.w), vec4f(u0.x, u1.y, u0.z, u0.w));
                let d = perlin_4d_corner(vec4u(p1.x, p1.y, p0.z, p0.w), vec4f(u1.x, u1.y, u0.z, u0.w));
                let e = perlin_4d_corner(vec4u(p0.x, p0.y, p1.z, p0.w), vec4f(u0.x, u0.y, u1.z, u0.w));
                let f = perlin_4d_corner(vec4u(p1.x, p0.y, p1.z, p0.w), vec4f(u1.x, u0.y, u1.z, u0.w));
                let g = perlin_4d_corner(vec4u(p0.x, p1.y, p1.z, p0.w), vec4f(u0.x, u1.y, u1.z, u0.w));
                let h = perlin_4d_corner(vec4u(p1.x, p1.y, p1.z, p0.w), vec4f(u1.x, u1.y, u1.z, u0.w));

                let i = perlin_4d_corner(vec4u(p0.x, p0.y, p0.z, p1.w), vec4f(u0.x, u0.y, u0.z, u1.w));
                let j = perlin_4d_corner(vec4u(p1.x, p0.y, p0.z, p1.w), vec4f(u1.x, u0.y, u0.z, u1.w));
                let k = perlin_4d_corner(vec4u(p0.x, p1.y, p0.z, p1.w), vec4f(u0.x, u1.y, u0.z, u1.w));
                let l = perlin_4d_corner(vec4u(p1.x, p1.y, p0.z, p1.w), vec4f(u1.x, u1.y, u0.z, u1.w));
                let m = perlin_4d_corner(vec4u(p0.x, p0.y, p1.z, p1.w), vec4f(u0.x, u0.y, u1.z, u1.w));
                let n = perlin_4d_corner(vec4u(p1.x, p0.y, p1.z, p1.w), vec4f(u1.x, u0.y, u1.z, u1.w));
                let o = perlin_4d_corner(vec4u(p0.x, p1.y, p1.z, p1.w), vec4f(u0.x, u1.y, u1.z, u1.w));
                let p = perlin_4d_corner(p1, u1);

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
                return clamp(${norm_factor} * result, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}

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

export class Perlin2D implements NoiseShaderFactory {
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
            ${seed_2d}
            ${hash_2u_1u}
            ${fade_2d}
        `
    }

    createShader({ functionName, extraBufferName }: Config) {
        // https://digitalfreepen.com/2017/06/20/range-perlin-noise.html
        const norm_constant = this.quadratic ? 1.35 : 1.6
        const contribution = `${functionName}_contribution`

        return /* wgsl */ `
            fn ${contribution}(grid_corner: vec2u, vec_corner_to_pos: vec2f) -> f32 {
                let hash = hash_2u_1u(grid_corner);
                let gradient = ${extraBufferName}[hash >> 28];
                let result = dot(gradient, vec_corner_to_pos);
                ${gradientCalculation(this.quadratic)}
            }

            fn ${functionName}(pos: vec2f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = seed_2d(vec2i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${contribution}(p0, u0);
                let b = ${contribution}(vec2u(p1.x, p0.y), vec2f(u1.x, u0.y));
                let c = ${contribution}(vec2u(p0.x, p1.y), vec2f(u0.x, u1.y));
                let d = ${contribution}(p1, u1);

                let s = fade_2d(u0);
                let n = mix(mix(a, b, s.x), mix(c, d, s.x), s.y);

                return clamp(${norm_constant} * n, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}

export class Perlin3D implements NoiseShaderFactory {
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
            ${seed_3d}
            ${hash_3u_1u}
            ${fade_3d}
        `
    }

    createShader({ functionName, extraBufferName }: Config) {
        const norm_constant = this.quadratic ? 1.5 : 1.7
        const contribution = `${functionName}_contribution`

        return /* wgsl */ `
            fn ${contribution}(grid_corner: vec3u, vec_corner_to_pos: vec3f) -> f32 {
                let hash = hash_3u_1u(grid_corner);
                let gradient = ${extraBufferName}[hash >> 26];
                let result = dot(gradient, vec_corner_to_pos);
                ${gradientCalculation(this.quadratic)}
            }

            fn ${functionName}(pos: vec3f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = seed_3d(vec3i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${contribution}(p0, u0);
                let b = ${contribution}(vec3u(p1.x, p0.y, p0.z), vec3f(u1.x, u0.y, u0.z));
                let c = ${contribution}(vec3u(p0.x, p1.y, p0.z), vec3f(u0.x, u1.y, u0.z));
                let d = ${contribution}(vec3u(p1.x, p1.y, p0.z), vec3f(u1.x, u1.y, u0.z));
                let e = ${contribution}(vec3u(p0.x, p0.y, p1.z), vec3f(u0.x, u0.y, u1.z));
                let f = ${contribution}(vec3u(p1.x, p0.y, p1.z), vec3f(u1.x, u0.y, u1.z));
                let g = ${contribution}(vec3u(p0.x, p1.y, p1.z), vec3f(u0.x, u1.y, u1.z));
                let h = ${contribution}(p1, u1);

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

export class Perlin4D implements NoiseShaderFactory {
    pos_type: VecType = 'vec4f'
    extra_data_type = 'array<vec4f>'
    quadratic: boolean

    constructor(quadratic?: boolean) {
        this.quadratic = quadratic || false
    }

    generateExtraData() {
        return generateUnitVectors4D(64)
    }

    createShaderDependencies() {
        return `
            ${seed_4d}
            ${hash_4u_1u}
            ${fade_4d}
        `
    }

    createShader({ functionName, extraBufferName }: Config) {
        const norm_constant = this.quadratic ? 1.5 : 1.7
        const contribution = `${functionName}_contribution`

        return /* wgsl */ `
            fn ${contribution}(grid_corner: vec4u, vec_corner_to_pos: vec4f) -> f32 {
                let hash = hash_4u_1u(grid_corner);
                let gradient = ${extraBufferName}[hash >> 26];
                let result = dot(gradient, vec_corner_to_pos);
                ${gradientCalculation(this.quadratic)}
            }

            fn ${functionName}(pos: vec4f, channel: u32) -> f32 {
                let floor_pos = floor(pos);
                let u0 = pos - floor_pos;
                let u1 = u0 - 1;

                let p0 = seed_4d(vec4i(floor_pos), channel);
                let p1 = p0 + 1u;
                
                let a = ${contribution}(p0, u0);
                let b = ${contribution}(vec4u(p1.x, p0.y, p0.z, p0.w), vec4f(u1.x, u0.y, u0.z, u0.w));
                let c = ${contribution}(vec4u(p0.x, p1.y, p0.z, p0.w), vec4f(u0.x, u1.y, u0.z, u0.w));
                let d = ${contribution}(vec4u(p1.x, p1.y, p0.z, p0.w), vec4f(u1.x, u1.y, u0.z, u0.w));
                let e = ${contribution}(vec4u(p0.x, p0.y, p1.z, p0.w), vec4f(u0.x, u0.y, u1.z, u0.w));
                let f = ${contribution}(vec4u(p1.x, p0.y, p1.z, p0.w), vec4f(u1.x, u0.y, u1.z, u0.w));
                let g = ${contribution}(vec4u(p0.x, p1.y, p1.z, p0.w), vec4f(u0.x, u1.y, u1.z, u0.w));
                let h = ${contribution}(vec4u(p1.x, p1.y, p1.z, p0.w), vec4f(u1.x, u1.y, u1.z, u0.w));

                let i = ${contribution}(vec4u(p0.x, p0.y, p0.z, p1.w), vec4f(u0.x, u0.y, u0.z, u1.w));
                let j = ${contribution}(vec4u(p1.x, p0.y, p0.z, p1.w), vec4f(u1.x, u0.y, u0.z, u1.w));
                let k = ${contribution}(vec4u(p0.x, p1.y, p0.z, p1.w), vec4f(u0.x, u1.y, u0.z, u1.w));
                let l = ${contribution}(vec4u(p1.x, p1.y, p0.z, p1.w), vec4f(u1.x, u1.y, u0.z, u1.w));
                let m = ${contribution}(vec4u(p0.x, p0.y, p1.z, p1.w), vec4f(u0.x, u0.y, u1.z, u1.w));
                let n = ${contribution}(vec4u(p1.x, p0.y, p1.z, p1.w), vec4f(u1.x, u0.y, u1.z, u1.w));
                let o = ${contribution}(vec4u(p0.x, p1.y, p1.z, p1.w), vec4f(u0.x, u1.y, u1.z, u1.w));
                let p = ${contribution}(p1, u1);

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
