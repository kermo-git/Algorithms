import {
    shaderUnitVectors2D,
    shaderUnitVectors3D,
    shaderUnitVectors4D,
} from '../NoiseUtils/Buffers'
import { NoiseScene, type DomainTransform } from '../NoiseUtils/NoiseScene'

// https://digitalfreepen.com/2017/06/20/range-perlin-noise.html
function perlinNormalizingFactor(n_dimensions: number) {
    return Math.sqrt(4 / n_dimensions)
}

export function perlin2DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> gradients: array<vec2f>;

        const normalizing_factor = ${perlinNormalizingFactor(2)};

        fn get_gradient(x: i32, y: i32) -> vec2f {
            let hash = hash_table[hash_table[x] + y];
            return gradients[hash];
        }

        fn fade(t: vec2f) -> vec2f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn noise(global_pos: vec2f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec2i(floor_pos) & vec2i(255, 255);
            let p1 = (p0 + 1i) & vec2i(255, 255);
            
            let grad_00 = get_gradient(p0.x, p0.y);
            let grad_10 = get_gradient(p1.x, p0.y);
            let grad_01 = get_gradient(p0.x, p1.y);
            let grad_11 = get_gradient(p1.x, p1.y);
            
            let local = global_pos - floor_pos;

            let a = dot(grad_00, local);
            let b = dot(grad_10, vec2f(local.x - 1, local.y));
            let c = dot(grad_01, vec2f(local.x, local.y - 1));
            let d = dot(grad_11, vec2f(local.x - 1, local.y - 1));

            let s = fade(local);
            let n = normalizing_factor * mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
            return (n + 1)*0.5;
        }
    `
}

export class Perlin2D extends NoiseScene {
    constructor(transform: DomainTransform = 'None') {
        super(perlin2DShader(), '2D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderUnitVectors2D(n)
    }
}

export function perlin3DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> gradients: array<vec3f>;

        const normalizing_factor = ${perlinNormalizingFactor(3)};

        fn get_gradient(x: i32, y: i32, z: i32) -> vec3f {
            let hash = hash_table[hash_table[hash_table[x] + y] + z];
            return gradients[hash];
        }

        fn fade(t: vec3f) -> vec3f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn noise(global_pos: vec3f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec3i(floor_pos) & vec3i(255, 255, 255);
            let p1 = (p0 + 1i) & vec3i(255, 255, 255);
            
            let grad_000 = get_gradient(p0.x, p0.y, p0.z);
            let grad_100 = get_gradient(p1.x, p0.y, p0.z);
            let grad_010 = get_gradient(p0.x, p1.y, p0.z);
            let grad_110 = get_gradient(p1.x, p1.y, p0.z);
            let grad_001 = get_gradient(p0.x, p0.y, p1.z);
            let grad_101 = get_gradient(p1.x, p0.y, p1.z);
            let grad_011 = get_gradient(p0.x, p1.y, p1.z);
            let grad_111 = get_gradient(p1.x, p1.y, p1.z);
            
            let local = global_pos - floor_pos;

            let a = dot(grad_000, local);
            let b = dot(grad_100, vec3f(local.x - 1, local.yz));
            let c = dot(grad_010, vec3f(local.x, local.y - 1, local.z));
            let d = dot(grad_110, vec3f(local.x - 1, local.y - 1, local.z));
            let e = dot(grad_001, vec3f(local.xy, local.z - 1));
            let f = dot(grad_101, vec3f(local.x - 1, local.y, local.z - 1));
            let g = dot(grad_011, vec3f(local.x, local.y - 1, local.z - 1));
            let h = dot(grad_111, vec3f(local.x - 1, local.y - 1, local.z - 1));

            let s = fade(local);
            
            let n = normalizing_factor * mix(
                mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
                mix(mix(e, f, s.x), mix(g, h, s.x), s.y),
                s.z
            );
            return (n + 1)*0.5;
        }
    `
}

export class Perlin3D extends NoiseScene {
    constructor(transform: DomainTransform = 'None') {
        super(perlin3DShader(), '3D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderUnitVectors3D(n)
    }
}

export function perlin4DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> gradients: array<vec4f>;

        const normalizing_factor = ${perlinNormalizingFactor(3)};

        fn get_gradient(x: i32, y: i32, z: i32, w: i32) -> vec4f {
            let hash = hash_table[hash_table[hash_table[hash_table[x] + y] + z] + w];
            return gradients[hash];
        }

        fn fade(t: vec4f) -> vec4f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn noise(global_pos: vec4f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec4i(floor_pos) & vec4i(255, 255, 255, 255);
            let p1 = (p0 + 1i) & vec4i(255, 255, 255, 255);
            
            let grad_0000 = get_gradient(p0.x, p0.y, p0.z, p0.w);
            let grad_1000 = get_gradient(p1.x, p0.y, p0.z, p0.w);
            let grad_0100 = get_gradient(p0.x, p1.y, p0.z, p0.w);
            let grad_1100 = get_gradient(p1.x, p1.y, p0.z, p0.w);
            let grad_0010 = get_gradient(p0.x, p0.y, p1.z, p0.w);
            let grad_1010 = get_gradient(p1.x, p0.y, p1.z, p0.w);
            let grad_0110 = get_gradient(p0.x, p1.y, p1.z, p0.w);
            let grad_1110 = get_gradient(p1.x, p1.y, p1.z, p0.w);

            let grad_0001 = get_gradient(p0.x, p0.y, p0.z, p1.w);
            let grad_1001 = get_gradient(p1.x, p0.y, p0.z, p1.w);
            let grad_0101 = get_gradient(p0.x, p1.y, p0.z, p1.w);
            let grad_1101 = get_gradient(p1.x, p1.y, p0.z, p1.w);
            let grad_0011 = get_gradient(p0.x, p0.y, p1.z, p1.w);
            let grad_1011 = get_gradient(p1.x, p0.y, p1.z, p1.w);
            let grad_0111 = get_gradient(p0.x, p1.y, p1.z, p1.w);
            let grad_1111 = get_gradient(p1.x, p1.y, p1.z, p1.w);
            
            let local = global_pos - floor_pos;
            let minus = local - 1;

            let a = dot(grad_0000, local);
            let b = dot(grad_1000, vec4f(minus.x, local.y, local.z, local.w));
            let c = dot(grad_0100, vec4f(local.x, minus.y, local.z, local.w));
            let d = dot(grad_1100, vec4f(minus.x, minus.y, local.z, local.w));
            let e = dot(grad_0010, vec4f(local.x, local.y, minus.z, local.w));
            let f = dot(grad_1010, vec4f(minus.x, local.y, minus.z, local.w));
            let g = dot(grad_0110, vec4f(local.x, minus.y, minus.z, local.w));
            let h = dot(grad_1110, vec4f(minus.x, minus.y, minus.z, local.w));

            let i = dot(grad_0001, vec4f(local.x, local.y, local.z, minus.w));
            let j = dot(grad_1001, vec4f(minus.x, local.y, local.z, minus.w));
            let k = dot(grad_0101, vec4f(local.x, minus.y, local.z, minus.w));
            let l = dot(grad_1101, vec4f(minus.x, minus.y, local.z, minus.w));
            let m = dot(grad_0011, vec4f(local.x, local.y, minus.z, minus.w));
            let n = dot(grad_1011, vec4f(minus.x, local.y, minus.z, minus.w));
            let o = dot(grad_0111, vec4f(local.x, minus.y, minus.z, minus.w));
            let p = dot(grad_1111, vec4f(minus.x, minus.y, minus.z, minus.w));

            let s = fade(local);
            
            let result = normalizing_factor * mix(
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
            return (result + 1)*0.5;
        }
    `
}

export class Perlin4D extends NoiseScene {
    constructor(transform: DomainTransform = 'None') {
        super(perlin4DShader(), '4D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderUnitVectors4D(n)
    }
}
