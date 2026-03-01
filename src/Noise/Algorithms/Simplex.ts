// https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf

import type { NoiseAlgorithm, Config } from '../Types'
import { generateUnitVectors2D, generateUnitVectors3D, generateUnitVectors4D } from '../UnitVectors'
import { pcd2d_1u, pcd3d_1u, pcd4d_1u, scramble_2d, scramble_3d, scramble_4d } from './Common'

function get_skew_constant(n_dimensions: number) {
    return (Math.sqrt(n_dimensions + 1) - 1) / n_dimensions
}

function get_unskew_constant(n_dimensions: number) {
    return (1 - 1 / Math.sqrt(n_dimensions + 1)) / n_dimensions
}

export const Simplex2D: NoiseAlgorithm = {
    pos_type: 'vec2f',
    extra_data_type: 'array<vec2f>',

    generateExtraData() {
        return generateUnitVectors2D(16)
    },

    createShaderDependencies: function (): string {
        return `
            ${scramble_2d}
            ${pcd2d_1u}
        `
    },

    createShader({ name, extraBufferName }: Config) {
        const influence = `${name}_influence`
        const skew = `${name}_skew`
        const unskew = `${name}_unskew`

        const SKEW_CONST = get_skew_constant(2)
        const UNSKEW_CONST = get_unskew_constant(2)

        return /* wgsl */ `
            fn ${influence}(skew_c: vec2u, c_pos: vec2f) -> f32 {
                let t = 0.5 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let hash = pcd2d_1u(skew_c) >> 28;
                let gradient = ${extraBufferName}[hash];
                return t * t * t * t * dot(gradient, c_pos);
            }
            
            fn ${skew}(v: vec2f) -> vec2f {
                return v + (v.x + v.y) * ${SKEW_CONST};
            }

            fn ${unskew}(v: vec2f) -> vec2f {
                return v - (v.x + v.y) * ${UNSKEW_CONST};
            }

            fn ${name}(pos: vec2f, channel: u32) -> f32 {
                let f_skew_c0 = floor(${skew}(pos));
                let c0_pos = pos - ${unskew}(f_skew_c0);

                let skew_c0_c1 = select(
                    /* false */ vec2u(0, 1), 
                    /* true */ vec2u(1, 0), 
                    /* condition */ c0_pos.x >= c0_pos.y
                );
                const skew_c0_c2 = vec2u(1, 1);

                let c0_c1 = ${unskew}(vec2f(skew_c0_c1));
                const c0_c2 = vec2f(1, 1) - 2 * ${UNSKEW_CONST};

                let c1_pos = c0_pos - c0_c1;
                let c2_pos = c0_pos - c0_c2;

                let skew_c0 = scramble_2d(vec2i(f_skew_c0), channel);
                let skew_c1 = skew_c0 + skew_c0_c1;
                let skew_c2 = skew_c0 + skew_c0_c2;

                let i0 = ${influence}(skew_c0, c0_pos);
                let i1 = ${influence}(skew_c1, c1_pos);
                let i2 = ${influence}(skew_c2, c2_pos);

                let n = 99 * (i0 + i1 + i2);
                return clamp(n, -1, 1) * 0.5 + 0.5;
            }
        `
    },
}

export const Simplex3D: NoiseAlgorithm = {
    pos_type: 'vec3f',
    extra_data_type: 'array<vec3f>',

    generateExtraData() {
        return generateUnitVectors3D(64)
    },

    createShaderDependencies() {
        return `
            ${scramble_3d}
            ${pcd3d_1u}
        `
    },

    createShader({ name, extraBufferName }: Config) {
        const influence = `${name}_influence`
        const skew = `${name}_skew`
        const unskew = `${name}_unskew`

        const SKEW_CONST = get_skew_constant(3)
        const UNSKEW_CONST = get_unskew_constant(3)

        return /* wgsl */ `
            fn ${influence}(skew_c: vec3u, c_pos: vec3f) -> f32 {
                let t = 0.6 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let hash = pcd3d_1u(skew_c) >> 26;
                let gradient = ${extraBufferName}[hash];
                return t * t * t * t * dot(gradient, c_pos);
            }
            
            fn ${skew}(v: vec3f) -> vec3f {
                return v + (v.x + v.y + v.z) * ${SKEW_CONST};
            }

            fn ${unskew}(v: vec3f) -> vec3f {
                return v - (v.x + v.y + v.z) * ${UNSKEW_CONST};
            }

            fn ${name}(pos: vec3f, channel: u32) -> f32 {
                let f_skew_c0 = floor(${skew}(pos));

                let c0 = ${unskew}(f_skew_c0);
                let c0_pos = pos - c0;

                var skew_c0_c1: vec3u;
                var skew_c0_c2: vec3u;
                const skew_c0_c3 = vec3u(1, 1, 1);

                if (c0_pos.x >= c0_pos.y) {
                    if (c0_pos.y >= c0_pos.z) {
                        skew_c0_c1 = vec3u(1, 0, 0);
                        skew_c0_c2 = vec3u(1, 1, 0);
                    } else if (c0_pos.x >= c0_pos.z) {
                        skew_c0_c1 = vec3u(1, 0, 0);
                        skew_c0_c2 = vec3u(1, 0, 1);
                    } else {
                        skew_c0_c1 = vec3u(0, 0, 1);
                        skew_c0_c2 = vec3u(1, 0, 1);
                    }
                } else {
                    if (c0_pos.y < c0_pos.z) {
                        skew_c0_c1 = vec3u(0, 0, 1);
                        skew_c0_c2 = vec3u(0, 1, 1);
                    } else if (c0_pos.x < c0_pos.z) {
                        skew_c0_c1 = vec3u(0, 1, 0);
                        skew_c0_c2 = vec3u(0, 1, 1);
                    } else {
                        skew_c0_c1 = vec3u(0, 1, 0);
                        skew_c0_c2 = vec3u(1, 1, 0);
                    }
                }
                let c0_c1 = ${unskew}(vec3f(skew_c0_c1));
                let c0_c2 = ${unskew}(vec3f(skew_c0_c2));
                const c0_c3 = vec3f(1, 1, 1) - 3 * ${UNSKEW_CONST};

                let c1_pos = c0_pos - c0_c1;
                let c2_pos = c0_pos - c0_c2;
                let c3_pos = c0_pos - c0_c3;

                let skew_c0 = scramble_3d(vec3i(f_skew_c0), channel);
                let skew_c1 = skew_c0 + skew_c0_c1;
                let skew_c2 = skew_c0 + skew_c0_c2;
                let skew_c3 = skew_c0 + skew_c0_c3;

                let i0 = ${influence}(skew_c0, c0_pos);
                let i1 = ${influence}(skew_c1, c1_pos);
                let i2 = ${influence}(skew_c2, c2_pos);
                let i3 = ${influence}(skew_c3, c3_pos);

                let n = 40 * (i0 + i1 + i2 + i3);
                return clamp(n, -1, 1) * 0.5 + 0.5;
            }
        `
    },
}

export const Simplex4D: NoiseAlgorithm = {
    pos_type: 'vec4f',
    extra_data_type: 'array<vec4f>',

    generateExtraData() {
        return generateUnitVectors4D(256)
    },

    createShaderDependencies() {
        return `
            ${scramble_4d}
            ${pcd4d_1u}
        `
    },

    createShader({ name, extraBufferName }: Config) {
        const influence = `${name}_influence`
        const skew = `${name}_skew`
        const unskew = `${name}_unskew`

        const SKEW_CONST = get_skew_constant(4)
        const UNSKEW_CONST = get_unskew_constant(4)

        return /* wgsl */ `
            fn ${influence}(skew_c: vec4u, c_pos: vec4f) -> f32 {
                let t = 0.6 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let hash = pcd4d_1u(skew_c) >> 24;
                let gradient = ${extraBufferName}[hash];
                return t * t * t * t * dot(gradient, c_pos);
            }
            
            fn ${skew}(v: vec4f) -> vec4f {
                return v + (v.x + v.y + v.z + v.w) * ${SKEW_CONST};
            }

            fn ${unskew}(v: vec4f) -> vec4f {
                return v - (v.x + v.y + v.z + v.w) * ${UNSKEW_CONST};
            }

            const skew_c0_c4 = vec4u(1, 1, 1, 1);
            const c0_c4 = vec4f(1, 1, 1, 1) - 4 * ${UNSKEW_CONST};

            fn ${name}(pos: vec4f, channel: u32) -> f32 {
                let skew_pos = ${skew}(pos);
                let f_skew_c0 = floor(skew_pos);

                let c0 = ${unskew}(f_skew_c0);
                let c0_pos = pos - c0;

                var skew_c0_c1: vec4u;
                var skew_c0_c2: vec4u;
                var skew_c0_c3: vec4u;

                let x = c0_pos.x;
                let y = c0_pos.y;
                let z = c0_pos.z;
                let w = c0_pos.w;

                if (x >= y) {
                    if (y >= z) { // x > y > z
                        if (z >= w) { 
                            // x > y > z > w
                            skew_c0_c1 = vec4u(1, 0, 0, 0);
                            skew_c0_c2 = vec4u(1, 1, 0, 0);
                            skew_c0_c3 = vec4u(1, 1, 1, 0);
                        } else if (y >= w) { 
                            // x > y > w > z
                            skew_c0_c1 = vec4u(1, 0, 0, 0);
                            skew_c0_c2 = vec4u(1, 1, 0, 0);
                            skew_c0_c3 = vec4u(1, 1, 0, 1);
                        } else if (x >= w) { 
                            // x > w > y > z
                            skew_c0_c1 = vec4u(1, 0, 0, 0);
                            skew_c0_c2 = vec4u(1, 0, 0, 1);
                            skew_c0_c3 = vec4u(1, 1, 0, 1);
                        } else { 
                            // w > x > y > z
                            skew_c0_c1 = vec4u(0, 0, 0, 1);
                            skew_c0_c2 = vec4u(1, 0, 0, 1);
                            skew_c0_c3 = vec4u(1, 1, 0, 1);      
                        }
                    } else if (x >= z) { // x > z > y
                        if (y >= w) { 
                            // x > z > y > w
                            skew_c0_c1 = vec4u(1, 0, 0, 0);
                            skew_c0_c2 = vec4u(1, 0, 1, 0);
                            skew_c0_c3 = vec4u(1, 1, 1, 0);
                        } else if (z >= w) { 
                            // x > z > w > y
                            skew_c0_c1 = vec4u(1, 0, 0, 0);
                            skew_c0_c2 = vec4u(1, 0, 1, 0);
                            skew_c0_c3 = vec4u(1, 0, 1, 1);
                        } else if (x >= w) { 
                            // x > w > z > y
                            skew_c0_c1 = vec4u(1, 0, 0, 0);
                            skew_c0_c2 = vec4u(1, 0, 0, 1);
                            skew_c0_c3 = vec4u(1, 0, 1, 1);
                        } else {
                            // w > x > z > y
                            skew_c0_c1 = vec4u(0, 0, 0, 1);
                            skew_c0_c2 = vec4u(1, 0, 0, 1);
                            skew_c0_c3 = vec4u(1, 0, 1, 1);      
                        }
                    } else { // z > x > y
                        if (y >= w) {
                            // z > x > y > w
                            skew_c0_c1 = vec4u(0, 0, 1, 0);
                            skew_c0_c2 = vec4u(1, 0, 1, 0);
                            skew_c0_c3 = vec4u(1, 1, 1, 0);
                        } else if (x >= w) { 
                            // z > x > w > y
                            skew_c0_c1 = vec4u(0, 0, 1, 0);
                            skew_c0_c2 = vec4u(1, 0, 1, 0);
                            skew_c0_c3 = vec4u(1, 0, 1, 1);
                        } else if (z >= w) {
                            // z > w > x > y
                            skew_c0_c1 = vec4u(0, 0, 1, 0);
                            skew_c0_c2 = vec4u(0, 0, 1, 1);
                            skew_c0_c3 = vec4u(1, 0, 1, 1);
                        } else {
                            // w > z > x > y
                            skew_c0_c1 = vec4u(0, 0, 0, 1);
                            skew_c0_c2 = vec4u(0, 0, 1, 1);
                            skew_c0_c3 = vec4u(1, 0, 1, 1); 
                        }
                    }
                } else {
                    if (x >= z) { // y > x > z
                        if (z >= w) {
                            // y > x > z > w
                            skew_c0_c1 = vec4u(0, 1, 0, 0);
                            skew_c0_c2 = vec4u(1, 1, 0, 0);
                            skew_c0_c3 = vec4u(1, 1, 1, 0); 
                        } else if (x >= w) {
                            // y > x > w > z
                            skew_c0_c1 = vec4u(0, 1, 0, 0);
                            skew_c0_c2 = vec4u(1, 1, 0, 0);
                            skew_c0_c3 = vec4u(1, 1, 0, 1); 
                        } else if (y >= w) {
                            // y > w > x > z
                            skew_c0_c1 = vec4u(0, 1, 0, 0);
                            skew_c0_c2 = vec4u(0, 1, 0, 1);
                            skew_c0_c3 = vec4u(1, 1, 0, 1); 
                        } else {
                            // w > y > x > z
                            skew_c0_c1 = vec4u(0, 0, 0, 1);
                            skew_c0_c2 = vec4u(0, 1, 0, 1);
                            skew_c0_c3 = vec4u(1, 1, 0, 1); 
                        }
                    } else if (y >= z) { // y > z > x
                        if (x >= w) {
                            // y > z > x > w
                            skew_c0_c1 = vec4u(0, 1, 0, 0);
                            skew_c0_c2 = vec4u(0, 1, 1, 0);
                            skew_c0_c3 = vec4u(1, 1, 1, 0); 
                        } else if (z >= w) {
                            // y > z > w > x
                            skew_c0_c1 = vec4u(0, 1, 0, 0);
                            skew_c0_c2 = vec4u(0, 1, 1, 0);
                            skew_c0_c3 = vec4u(0, 1, 1, 1); 
                        } else if (y >= w) {
                            // y > w > z > x
                            skew_c0_c1 = vec4u(0, 1, 0, 0);
                            skew_c0_c2 = vec4u(0, 1, 0, 1);
                            skew_c0_c3 = vec4u(0, 1, 1, 1); 
                        } else {
                            // w > y > z > x
                            skew_c0_c1 = vec4u(0, 0, 0, 1);
                            skew_c0_c2 = vec4u(0, 1, 0, 1);
                            skew_c0_c3 = vec4u(0, 1, 1, 1);
                        }
                    } else { // z > y > x
                        if (x >= w) {
                            // z > y > x > w
                            skew_c0_c1 = vec4u(0, 0, 1, 0);
                            skew_c0_c2 = vec4u(0, 1, 1, 0);
                            skew_c0_c3 = vec4u(1, 1, 1, 0); 
                        } else if (y >= w) {
                            // z > y > w > x
                            skew_c0_c1 = vec4u(0, 0, 1, 0);
                            skew_c0_c2 = vec4u(0, 1, 1, 0);
                            skew_c0_c3 = vec4u(0, 1, 1, 1); 
                        } else if (z >= w) {
                            // z > w > y > x
                            skew_c0_c1 = vec4u(0, 0, 1, 0);
                            skew_c0_c2 = vec4u(0, 0, 1, 1);
                            skew_c0_c3 = vec4u(0, 1, 1, 1); 
                        } else {
                            // w > z > y > x
                            skew_c0_c1 = vec4u(0, 0, 0, 1);
                            skew_c0_c2 = vec4u(0, 0, 1, 1);
                            skew_c0_c3 = vec4u(0, 1, 1, 1); 
                        }
                    }
                }

                let c0_c1 = ${unskew}(vec4f(skew_c0_c1));
                let c0_c2 = ${unskew}(vec4f(skew_c0_c2));
                let c0_c3 = ${unskew}(vec4f(skew_c0_c3));

                let c1_pos = c0_pos - c0_c1;
                let c2_pos = c0_pos - c0_c2;
                let c3_pos = c0_pos - c0_c3;
                let c4_pos = c0_pos - c0_c4;

                let skew_c0 = scramble_4d(vec4i(f_skew_c0), channel);
                let skew_c1 = skew_c0 + skew_c0_c1;
                let skew_c2 = skew_c0 + skew_c0_c2;
                let skew_c3 = skew_c0 + skew_c0_c3;
                let skew_c4 = skew_c0 + skew_c0_c4;

                let i0 = ${influence}(skew_c0, c0_pos);
                let i1 = ${influence}(skew_c1, c1_pos);
                let i2 = ${influence}(skew_c2, c2_pos);
                let i3 = ${influence}(skew_c3, c3_pos);
                let i4 = ${influence}(skew_c4, c4_pos);

                let n = 44 * (i0 + i1 + i2 + i3 + i4);
                return clamp(n, -1, 1) * 0.5 + 0.5;
            }
        `
    },
}
