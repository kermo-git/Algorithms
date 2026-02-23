// https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf

import type { NoiseAlgorithm, Config } from '../Types'

function get_skew_constant(n_dimensions: number) {
    return (Math.sqrt(n_dimensions + 1) - 1) / n_dimensions
}

function get_unskew_constant(n_dimensions: number) {
    return (1 - 1 / Math.sqrt(n_dimensions + 1)) / n_dimensions
}

export const Simplex2D: NoiseAlgorithm = {
    pos_type: 'vec2f',
    createShader({ name, hash_table_size, n_channels }: Config) {
        const influence = `${name}_influence`
        const skew = `${name}_skew`
        const unskew = `${name}_unskew`

        const SKEW_CONST = get_skew_constant(2)
        const UNSKEW_CONST = get_unskew_constant(2)

        return /* wgsl */ `
        fn ${influence}(skew_c: vec2i, c_pos: vec2f, offset: i32) -> f32 {
            let t = 0.5 - dot(c_pos, c_pos);
            if (t < 0) {
                return 0;
            }
            const HASH_MASK = vec2i(${hash_table_size - 1});
            let mask_c = skew_c & HASH_MASK;
            
            let hash_x = hash_table[offset + mask_c.x];
            let hash_y = hash_table[offset + hash_x + mask_c.y];

            let gradient = noise_features[hash_y].unit_vector_2d;
            return t * t * t * t * dot(gradient, c_pos);
        }
        
        fn ${skew}(v: vec2f) -> vec2f {
            return v + (v.x + v.y) * ${SKEW_CONST};
        }

        fn ${unskew}(v: vec2f) -> vec2f {
            return v - (v.x + v.y) * ${UNSKEW_CONST};
        }

        fn ${name}(pos: vec2f, channel: i32) -> f32 {
            let f_skew_c0 = floor(${skew}(pos));
            let c0_pos = pos - ${unskew}(f_skew_c0);

            let skew_c0_c1 = select(
                /* false */ vec2i(0, 1), 
                /* true */ vec2i(1, 0), 
                /* condition */ c0_pos.x >= c0_pos.y
            );
            const skew_c0_c2 = vec2i(1, 1);

            let c0_c1 = ${unskew}(vec2f(skew_c0_c1));
            const c0_c2 = vec2f(1, 1) - 2 * ${UNSKEW_CONST};

            let c1_pos = c0_pos - c0_c1;
            let c2_pos = c0_pos - c0_c2;

            let skew_c0 = vec2i(f_skew_c0);
            let skew_c1 = skew_c0 + skew_c0_c1;
            let skew_c2 = skew_c0 + skew_c0_c2;

            let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});
            let i0 = ${influence}(skew_c0, c0_pos, hash_offset);
            let i1 = ${influence}(skew_c1, c1_pos, hash_offset);
            let i2 = ${influence}(skew_c2, c2_pos, hash_offset);

            let n = 99 * (i0 + i1 + i2);
            return clamp(n, -1, 1) * 0.5 + 0.5;
        }
    `
    },
}

export const Simplex3D: NoiseAlgorithm = {
    pos_type: 'vec3f',
    createShader({ name, hash_table_size, n_channels }: Config) {
        const influence = `${name}_influence`
        const skew = `${name}_skew`
        const unskew = `${name}_unskew`

        const SKEW_CONST = get_skew_constant(3)
        const UNSKEW_CONST = get_unskew_constant(3)

        return /* wgsl */ `
        fn ${influence}(skew_c: vec3i, c_pos: vec3f, offset: i32) -> f32 {
            let t = 0.6 - dot(c_pos, c_pos);
            if (t < 0) {
                return 0;
            }
            const HASH_MASK = vec3i(${hash_table_size - 1});
            let mask_c = skew_c & HASH_MASK;

            let hash_x = hash_table[offset + mask_c.x];
            let hash_y = hash_table[offset + hash_x + mask_c.y];
            let hash_z = hash_table[offset + hash_y + mask_c.z];

            let gradient = noise_features[hash_z].unit_vector_3d;
            return t * t * t * t * dot(gradient, c_pos);
        }
        
        fn ${skew}(v: vec3f) -> vec3f {
            return v + (v.x + v.y + v.z) * ${SKEW_CONST};
        }

        fn ${unskew}(v: vec3f) -> vec3f {
            return v - (v.x + v.y + v.z) * ${UNSKEW_CONST};
        }

        fn ${name}(pos: vec3f, channel: i32) -> f32 {
            let f_skew_c0 = floor(${skew}(pos));

            let c0 = ${unskew}(f_skew_c0);
            let c0_pos = pos - c0;

            var skew_c0_c1: vec3i;
            var skew_c0_c2: vec3i;
            const skew_c0_c3 = vec3i(1, 1, 1);

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
            let c0_c1 = ${unskew}(vec3f(skew_c0_c1));
            let c0_c2 = ${unskew}(vec3f(skew_c0_c2));
            const c0_c3 = vec3f(1, 1, 1) - 3 * ${UNSKEW_CONST};

            let c1_pos = c0_pos - c0_c1;
            let c2_pos = c0_pos - c0_c2;
            let c3_pos = c0_pos - c0_c3;

            let skew_c0 = vec3i(f_skew_c0);
            let skew_c1 = skew_c0 + skew_c0_c1;
            let skew_c2 = skew_c0 + skew_c0_c2;
            let skew_c3 = skew_c0 + skew_c0_c3;

            let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});
            let i0 = ${influence}(skew_c0, c0_pos, hash_offset);
            let i1 = ${influence}(skew_c1, c1_pos, hash_offset);
            let i2 = ${influence}(skew_c2, c2_pos, hash_offset);
            let i3 = ${influence}(skew_c3, c3_pos, hash_offset);

            let n = 40 * (i0 + i1 + i2 + i3);
            return clamp(n, -1, 1) * 0.5 + 0.5;
        }
    `
    },
}

export const Simplex4D: NoiseAlgorithm = {
    pos_type: 'vec4f',
    createShader({ name, hash_table_size, n_channels }: Config) {
        const influence = `${name}_influence`
        const skew = `${name}_skew`
        const unskew = `${name}_unskew`

        const SKEW_CONST = get_skew_constant(4)
        const UNSKEW_CONST = get_unskew_constant(4)

        return /* wgsl */ `
        fn ${influence}(skew_c: vec4i, c_pos: vec4f, offset: i32) -> f32 {
            let t = 0.6 - dot(c_pos, c_pos);
            if (t < 0) {
                return 0;
            }
            const HASH_MASK = vec4i(${hash_table_size - 1});
            let mask_c = skew_c & HASH_MASK;

            let hash_x = hash_table[offset + mask_c.x];
            let hash_y = hash_table[offset + hash_x + mask_c.y];
            let hash_z = hash_table[offset + hash_y + mask_c.z];
            let hash_w = hash_table[offset + hash_z + mask_c.w];

            let gradient = noise_features[hash_w].unit_vector_4d;
            return t * t * t * t * dot(gradient, c_pos);
        }
        
        fn ${skew}(v: vec4f) -> vec4f {
            return v + (v.x + v.y + v.z + v.w) * ${SKEW_CONST};
        }

        fn ${unskew}(v: vec4f) -> vec4f {
            return v - (v.x + v.y + v.z + v.w) * ${UNSKEW_CONST};
        }

        const skew_c0_c4 = vec4i(1, 1, 1, 1);
        const c0_c4 = vec4f(1, 1, 1, 1) - 4 * ${UNSKEW_CONST};

        fn ${name}(pos: vec4f, channel: i32) -> f32 {
            let skew_pos = ${skew}(pos);
            let f_skew_c0 = floor(skew_pos);

            let c0 = ${unskew}(f_skew_c0);
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

            let c0_c1 = ${unskew}(vec4f(skew_c0_c1));
            let c0_c2 = ${unskew}(vec4f(skew_c0_c2));
            let c0_c3 = ${unskew}(vec4f(skew_c0_c3));

            let c1_pos = c0_pos - c0_c1;
            let c2_pos = c0_pos - c0_c2;
            let c3_pos = c0_pos - c0_c3;
            let c4_pos = c0_pos - c0_c4;

            let skew_c0 = vec4i(f_skew_c0);
            let skew_c1 = skew_c0 + skew_c0_c1;
            let skew_c2 = skew_c0 + skew_c0_c2;
            let skew_c3 = skew_c0 + skew_c0_c3;
            let skew_c4 = skew_c0 + skew_c0_c4;

            let hash_offset = ${hash_table_size} * (channel & ${n_channels - 1});
            let i0 = ${influence}(skew_c0, c0_pos, hash_offset);
            let i1 = ${influence}(skew_c1, c1_pos, hash_offset);
            let i2 = ${influence}(skew_c2, c2_pos, hash_offset);
            let i3 = ${influence}(skew_c3, c3_pos, hash_offset);
            let i4 = ${influence}(skew_c4, c4_pos, hash_offset);

            let n = 44 * (i0 + i1 + i2 + i3 + i4);
            return clamp(n, -1, 1) * 0.5 + 0.5;
        }
    `
    },
}
