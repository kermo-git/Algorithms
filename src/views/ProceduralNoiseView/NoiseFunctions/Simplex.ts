// https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf

import {
    shaderUnitVectors2D,
    shaderUnitVectors3D,
    shaderUnitVectors4D,
} from '../NoiseUtils/Buffers'
import { NoiseScene, type DomainTransform } from '../NoiseUtils/NoiseScene'

function skew_constant(n_dimensions: number) {
    return (Math.sqrt(n_dimensions + 1) - 1) / n_dimensions
}

function unskew_constant(n_dimensions: number) {
    return (1 - 1 / Math.sqrt(n_dimensions + 1)) / n_dimensions
}

export function simplex2DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> gradients: array<vec2f>;

        fn influence(skew_c: vec2i, c_pos: vec2f) -> f32 {
            let t = 0.5 - dot(c_pos, c_pos);

            if (t < 0) {
                return 0;
            }
            let hash = hash_table[
                hash_table[skew_c.x & 255] + (skew_c.y & 255)
            ];
            return t * t * t * t * dot(gradients[hash], c_pos);
        }

        const SKEW_CONSTANT = ${skew_constant(2)};
        const UNSKEW_CONSTANT = ${unskew_constant(2)};
        
        fn skew(v: vec2f) -> vec2f {
            return v + (v.x + v.y) * SKEW_CONSTANT;
        }

        fn unskew(v: vec2f) -> vec2f {
            return v - (v.x + v.y) * UNSKEW_CONSTANT;
        }

        const skew_c0_c2 = vec2i(1, 1);
        const c0_c2 = vec2f(1, 1) - 2 * UNSKEW_CONSTANT; // unskew(vec2f(1, 1))

        fn noise(pos: vec2f) -> f32 {
            let f_skew_c0 = floor(skew(pos));
            let c0_pos = pos - unskew(f_skew_c0);

            let skew_c0_c1 = select(
                /* false */ vec2i(0, 1), 
                /* true */ vec2i(1, 0), 
                /* condition */ c0_pos.x >= c0_pos.y
            );
            let c0_c1 = unskew(vec2f(skew_c0_c1));
            let c1_pos = c0_pos - c0_c1;
            let c2_pos = c0_pos - c0_c2;

            let skew_c0 = vec2i(f_skew_c0);
            let skew_c1 = skew_c0 + skew_c0_c1;
            let skew_c2 = skew_c0 + skew_c0_c2;

            let i0 = influence(skew_c0, c0_pos);
            let i1 = influence(skew_c1, c1_pos);
            let i2 = influence(skew_c2, c2_pos);

            let n = 70 * (i0 + i1 + i2);
            return (clamp(n, -1, 1) + 1) * 0.5;
        }
    `
}

export class Simplex2D extends NoiseScene {
    constructor(transform: DomainTransform = 'None') {
        super(simplex2DShader(), '2D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderUnitVectors2D(n)
    }
}

export function simplex3DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> gradients: array<vec3f>;

        fn influence(skew_c: vec3i, c_pos: vec3f) -> f32 {
            let t = 0.6 - dot(c_pos, c_pos);

            if (t < 0) {
                return 0;
            }
            let mask_c = skew_c & vec3i(255);
            let hash = hash_table[
                hash_table[hash_table[mask_c.x] + mask_c.y] + mask_c.z
            ];
            return t * t * t * t * dot(gradients[hash], c_pos);
        }

        const SKEW_CONSTANT = ${skew_constant(3)};
        const UNSKEW_CONSTANT = ${unskew_constant(3)};
        
        fn skew(v: vec3f) -> vec3f {
            return v + (v.x + v.y + v.z) * SKEW_CONSTANT;
        }

        fn unskew(v: vec3f) -> vec3f {
            return v - (v.x + v.y + v.z) * UNSKEW_CONSTANT;
        }

        const skew_c0_c3 = vec3i(1, 1, 1);
        const c0_c3 = vec3f(1, 1, 1) - 3 * UNSKEW_CONSTANT; // unskew(vec3f(1, 1, 1))

        fn noise(pos: vec3f) -> f32 {
            let f_skew_c0 = floor(skew(pos));

            let c0 = unskew(f_skew_c0);
            let c0_pos = pos - c0;

            var skew_c0_c1: vec3i;
            var skew_c0_c2: vec3i;

            if (c0_pos.x >= c0_pos.y) {
                if (c0_pos.y >= c0_pos.z) {
                    skew_c0_c1 = vec3i(1, 0, 0);
                    skew_c0_c2 = vec3i(1, 1, 0);
                } else if (c0_pos.x >= c0_pos.z) {
                    skew_c0_c1 = vec3i(1, 0, 0);
                    skew_c0_c2 = vec3i(1, 0, 1);
                } else {
                    skew_c0_c1 = vec3i(0, 0, 1);
                    skew_c0_c2 = vec3i(1, 0, 1);
                }
            } else {
                if (c0_pos.y < c0_pos.z) {
                    skew_c0_c1 = vec3i(0, 0, 1);
                    skew_c0_c2 = vec3i(0, 1, 1);
                } else if (c0_pos.x < c0_pos.z) {
                    skew_c0_c1 = vec3i(0, 1, 0);
                    skew_c0_c2 = vec3i(0, 1, 1);
                } else {
                    skew_c0_c1 = vec3i(0, 1, 0);
                    skew_c0_c2 = vec3i(1, 1, 0);
                }
            }
            let c0_c1 = unskew(vec3f(skew_c0_c1));
            let c0_c2 = unskew(vec3f(skew_c0_c2));

            let c1_pos = c0_pos - c0_c1;
            let c2_pos = c0_pos - c0_c2;
            let c3_pos = c0_pos - c0_c3;

            let skew_c0 = vec3i(f_skew_c0);
            let skew_c1 = skew_c0 + skew_c0_c1;
            let skew_c2 = skew_c0 + skew_c0_c2;
            let skew_c3 = skew_c0 + skew_c0_c3;

            let i0 = influence(skew_c0, c0_pos);
            let i1 = influence(skew_c1, c1_pos);
            let i2 = influence(skew_c2, c2_pos);
            let i3 = influence(skew_c3, c3_pos);

            let n = 32 * (i0 + i1 + i2 + i3);
            return (clamp(n, -1, 1) + 1) * 0.5;
        }
    `
}

export class Simplex3D extends NoiseScene {
    constructor(transform: DomainTransform = 'None') {
        super(simplex3DShader(), '3D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderUnitVectors3D(n)
    }
}

export function simplex4DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> gradients: array<vec4f>;

        fn influence(skew_c: vec4i, c_pos: vec4f) -> f32 {
            let t = 0.6 - dot(c_pos, c_pos);

            if (t < 0) {
                return 0;
            }
            let mask_c = skew_c & vec4i(255);
            let hash = hash_table[
                hash_table[
                    hash_table[
                        hash_table[mask_c.x] + mask_c.y
                    ] + mask_c.z
                ] + mask_c.w
            ];
            return t * t * t * t * dot(gradients[hash], c_pos);
        }

        const SKEW_CONSTANT = ${skew_constant(4)};
        const UNSKEW_CONSTANT = ${unskew_constant(4)};
        
        fn skew(v: vec4f) -> vec4f {
            return v + (v.x + v.y + v.z + v.w) * SKEW_CONSTANT;
        }

        fn unskew(v: vec4f) -> vec4f {
            return v - (v.x + v.y + v.z + v.w) * UNSKEW_CONSTANT;
        }

        const skew_c0_c4 = vec4i(1, 1, 1, 1);
        const c0_c4 = vec4f(1, 1, 1, 1) - 4 * UNSKEW_CONSTANT; // unskew(vec4f(1, 1, 1, 1))

        fn noise(pos: vec4f) -> f32 {
            let skew_pos = skew(pos);
            let f_skew_c0 = floor(skew_pos);

            let c0 = unskew(f_skew_c0);
            let c0_pos = pos - c0;

            var skew_c0_c1: vec4i;
            var skew_c0_c2: vec4i;
            var skew_c0_c3: vec4i;

            let x = c0_pos.x;
            let y = c0_pos.y;
            let z = c0_pos.z;
            let w = c0_pos.w;

            if (x >= y) {
                if (y >= z) { // x > y > z
                    if (z >= w) { 
                        // x > y > z > w
                        skew_c0_c1 = vec4i(1, 0, 0, 0);
                        skew_c0_c2 = vec4i(1, 1, 0, 0);
                        skew_c0_c3 = vec4i(1, 1, 1, 0);
                    } else if (y >= w) { 
                        // x > y > w > z
                        skew_c0_c1 = vec4i(1, 0, 0, 0);
                        skew_c0_c2 = vec4i(1, 1, 0, 0);
                        skew_c0_c3 = vec4i(1, 1, 0, 1);
                    } else if (x >= w) { 
                        // x > w > y > z
                        skew_c0_c1 = vec4i(1, 0, 0, 0);
                        skew_c0_c2 = vec4i(1, 0, 0, 1);
                        skew_c0_c3 = vec4i(1, 1, 0, 1);
                    } else { 
                        // w > x > y > z
                        skew_c0_c1 = vec4i(0, 0, 0, 1);
                        skew_c0_c2 = vec4i(1, 0, 0, 1);
                        skew_c0_c3 = vec4i(1, 1, 0, 1);      
                    }
                } else if (x >= z) { // x > z > y
                    if (y >= w) { 
                        // x > z > y > w
                        skew_c0_c1 = vec4i(1, 0, 0, 0);
                        skew_c0_c2 = vec4i(1, 0, 1, 0);
                        skew_c0_c3 = vec4i(1, 1, 1, 0);
                    } else if (z >= w) { 
                        // x > z > w > y
                        skew_c0_c1 = vec4i(1, 0, 0, 0);
                        skew_c0_c2 = vec4i(1, 0, 1, 0);
                        skew_c0_c3 = vec4i(1, 0, 1, 1);
                    } else if (x >= w) { 
                        // x > w > z > y
                        skew_c0_c1 = vec4i(1, 0, 0, 0);
                        skew_c0_c2 = vec4i(1, 0, 0, 1);
                        skew_c0_c3 = vec4i(1, 0, 1, 1);
                    } else {
                        // w > x > z > y
                        skew_c0_c1 = vec4i(0, 0, 0, 1);
                        skew_c0_c2 = vec4i(1, 0, 0, 1);
                        skew_c0_c3 = vec4i(1, 0, 1, 1);      
                    }
                } else { // z > x > y
                    if (y >= w) {
                        // z > x > y > w
                        skew_c0_c1 = vec4i(0, 0, 1, 0);
                        skew_c0_c2 = vec4i(1, 0, 1, 0);
                        skew_c0_c3 = vec4i(1, 1, 1, 0);
                    } else if (x >= w) { 
                        // z > x > w > y
                        skew_c0_c1 = vec4i(0, 0, 1, 0);
                        skew_c0_c2 = vec4i(1, 0, 1, 0);
                        skew_c0_c3 = vec4i(1, 0, 1, 1);
                    } else if (z >= w) {
                        // z > w > x > y
                        skew_c0_c1 = vec4i(0, 0, 1, 0);
                        skew_c0_c2 = vec4i(0, 0, 1, 1);
                        skew_c0_c3 = vec4i(1, 0, 1, 1);
                    } else {
                        // w > z > x > y
                        skew_c0_c1 = vec4i(0, 0, 0, 1);
                        skew_c0_c2 = vec4i(0, 0, 1, 1);
                        skew_c0_c3 = vec4i(1, 0, 1, 1); 
                    }
                }
            } else {
                if (x >= z) { // y > x > z
                    if (z >= w) {
                        // y > x > z > w
                        skew_c0_c1 = vec4i(0, 1, 0, 0);
                        skew_c0_c2 = vec4i(1, 1, 0, 0);
                        skew_c0_c3 = vec4i(1, 1, 1, 0); 
                    } else if (x >= w) {
                        // y > x > w > z
                        skew_c0_c1 = vec4i(0, 1, 0, 0);
                        skew_c0_c2 = vec4i(1, 1, 0, 0);
                        skew_c0_c3 = vec4i(1, 1, 0, 1); 
                    } else if (y >= w) {
                        // y > w > x > z
                        skew_c0_c1 = vec4i(0, 1, 0, 0);
                        skew_c0_c2 = vec4i(0, 1, 0, 1);
                        skew_c0_c3 = vec4i(1, 1, 0, 1); 
                    } else {
                        // w > y > x > z
                        skew_c0_c1 = vec4i(0, 0, 0, 1);
                        skew_c0_c2 = vec4i(0, 1, 0, 1);
                        skew_c0_c3 = vec4i(1, 1, 0, 1); 
                    }
                } else if (y >= z) { // y > z > x
                    if (x >= w) {
                        // y > z > x > w
                        skew_c0_c1 = vec4i(0, 1, 0, 0);
                        skew_c0_c2 = vec4i(0, 1, 1, 0);
                        skew_c0_c3 = vec4i(1, 1, 1, 0); 
                    } else if (z >= w) {
                        // y > z > w > x
                        skew_c0_c1 = vec4i(0, 1, 0, 0);
                        skew_c0_c2 = vec4i(0, 1, 1, 0);
                        skew_c0_c3 = vec4i(0, 1, 1, 1); 
                    } else if (y >= w) {
                        // y > w > z > x
                        skew_c0_c1 = vec4i(0, 1, 0, 0);
                        skew_c0_c2 = vec4i(0, 1, 0, 1);
                        skew_c0_c3 = vec4i(0, 1, 1, 1); 
                    } else {
                        // w > y > z > x
                        skew_c0_c1 = vec4i(0, 0, 0, 1);
                        skew_c0_c2 = vec4i(0, 1, 0, 1);
                        skew_c0_c3 = vec4i(0, 1, 1, 1);
                    }
                } else { // z > y > x
                    if (x >= w) {
                        // z > y > x > w
                        skew_c0_c1 = vec4i(0, 0, 1, 0);
                        skew_c0_c2 = vec4i(0, 1, 1, 0);
                        skew_c0_c3 = vec4i(1, 1, 1, 0); 
                    } else if (y >= w) {
                        // z > y > w > x
                        skew_c0_c1 = vec4i(0, 0, 1, 0);
                        skew_c0_c2 = vec4i(0, 1, 1, 0);
                        skew_c0_c3 = vec4i(0, 1, 1, 1); 
                    } else if (z >= w) {
                        // z > w > y > x
                        skew_c0_c1 = vec4i(0, 0, 1, 0);
                        skew_c0_c2 = vec4i(0, 0, 1, 1);
                        skew_c0_c3 = vec4i(0, 1, 1, 1); 
                    } else {
                        // w > z > y > x
                        skew_c0_c1 = vec4i(0, 0, 0, 1);
                        skew_c0_c2 = vec4i(0, 0, 1, 1);
                        skew_c0_c3 = vec4i(0, 1, 1, 1); 
                    }
                }
            }

            let c0_c1 = unskew(vec4f(skew_c0_c1));
            let c0_c2 = unskew(vec4f(skew_c0_c2));
            let c0_c3 = unskew(vec4f(skew_c0_c3));

            let c1_pos = c0_pos - c0_c1;
            let c2_pos = c0_pos - c0_c2;
            let c3_pos = c0_pos - c0_c3;
            let c4_pos = c0_pos - c0_c4;

            let skew_c0 = vec4i(f_skew_c0);
            let skew_c1 = skew_c0 + skew_c0_c1;
            let skew_c2 = skew_c0 + skew_c0_c2;
            let skew_c3 = skew_c0 + skew_c0_c3;
            let skew_c4 = skew_c0 + skew_c0_c4;

            let i0 = influence(skew_c0, c0_pos);
            let i1 = influence(skew_c1, c1_pos);
            let i2 = influence(skew_c2, c2_pos);
            let i3 = influence(skew_c3, c3_pos);
            let i4 = influence(skew_c4, c4_pos);

            let n = 27 * (i0 + i1 + i2 + i3 + i4);
            return (clamp(n, -1, 1) + 1) * 0.5;
        }
    `
}

export class Simplex4D extends NoiseScene {
    constructor(transform: DomainTransform = 'None') {
        super(simplex4DShader(), '4D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderUnitVectors4D(n)
    }
}
