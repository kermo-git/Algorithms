// https://cgvr.cs.uni-bremen.de/teaching/cg_literatur/simplexnoise.pdf

import { Gradients2D, Gradients3D, Gradients4D, NoiseModule } from '../Modules'
import { importFn } from '../HelperFunctions'
import {
    ReadOnlyResource,
    ReadOnlyShaderModule,
    readView
} from '@/WebGPU/ShaderModuleSystem/Modules'

function get_skew_constant(n_dimensions: number) {
    return (Math.sqrt(n_dimensions + 1) - 1) / n_dimensions
}

function get_unskew_constant(n_dimensions: number) {
    return (1 - 1 / Math.sqrt(n_dimensions + 1)) / n_dimensions
}

export function Simplex2D(
    type: 'Gradient' | 'Value' = 'Gradient'
): NoiseModule {
    const skew_module = {
        name: 'simplex_2d_skew',
        code: /* wgsl */ `
            const SKEW_2D_CONST = ${get_skew_constant(2)};
            const UNSKEW_2D_CONST = ${get_unskew_constant(2)};

            fn skew_2d(v: vec2f) -> vec2f {
                return v + (v.x + v.y) * SKEW_2D_CONST;
            }

            fn unskew_2d(v: vec2f) -> vec2f {
                return v - (v.x + v.y) * UNSKEW_2D_CONST;
            }
        `
    }

    let imports: ReadOnlyShaderModule[] = []
    let resources: ReadOnlyResource[] = []

    let name: string
    let corner_code: string
    let corner_fn: string
    let norm_constant: number

    if (type === 'Value') {
        name = 'simplex_value_2d'
        imports = [importFn('seed_2d'), importFn('hash_2u_1f'), skew_module]

        corner_fn = `${name}_corner`
        corner_code = /* wgsl */ `
            fn ${corner_fn}(skew_c: vec2u, c_pos: vec2f) -> f32 {
                let t = 0.5 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let vertex_value = hash_2u_1f(skew_c)*2 - 1;
                return t * t * t * t * vertex_value;
            }
        `
        norm_constant = 16
    } else {
        name = 'simplex_2d'
        imports = [importFn('seed_2d'), importFn('hash_2u_1u'), skew_module]
        resources = [readView(Gradients2D)]

        corner_fn = `${name}_corner`
        corner_code = /* wgsl */ `
            fn ${corner_fn}(skew_c: vec2u, c_pos: vec2f) -> f32 {
                let t = 0.5 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let hash = hash_2u_1u(skew_c) >> 28;
                let gradient = gradients_2D[hash];
                return t * t * t * t * dot(gradient, c_pos);
            }
        `
        norm_constant = 99
    }

    return {
        name,
        posType: 'vec2f',
        resources,
        imports,
        code: /* wgsl */ `
            ${corner_code}

            fn ${name}(pos: vec2f, seed: u32) -> f32 {
                let f_skew_c0 = floor(skew_2d(pos));
                let c0_pos = pos - unskew_2d(f_skew_c0);

                let skew_c0_c1 = select(
                    /* false */ vec2u(0, 1), 
                    /* true */ vec2u(1, 0), 
                    /* condition */ c0_pos.x >= c0_pos.y
                );
                const skew_c0_c2 = vec2u(1, 1);

                let c0_c1 = unskew_2d(vec2f(skew_c0_c1));
                const c0_c2 = vec2f(1, 1) - 2 * UNSKEW_2D_CONST;

                let c1_pos = c0_pos - c0_c1;
                let c2_pos = c0_pos - c0_c2;

                let skew_c0 = seed_2d(vec2i(f_skew_c0), seed);
                let skew_c1 = skew_c0 + skew_c0_c1;
                let skew_c2 = skew_c0 + skew_c0_c2;

                let i0 = ${corner_fn}(skew_c0, c0_pos);
                let i1 = ${corner_fn}(skew_c1, c1_pos);
                let i2 = ${corner_fn}(skew_c2, c2_pos);

                let n = ${norm_constant} * (i0 + i1 + i2);
                return clamp(n, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}

export function Simplex3D(
    type: 'Gradient' | 'Value' = 'Gradient'
): NoiseModule {
    const skew_module = {
        name: 'simplex_3d_skew',
        code: /* wgsl */ `
            const SKEW_3D_CONST = ${get_skew_constant(3)};
            const UNSKEW_3D_CONST = ${get_unskew_constant(3)};

            fn skew_3d(v: vec3f) -> vec3f {
                return v + (v.x + v.y + v.z) * SKEW_3D_CONST;
            }

            fn unskew_3d(v: vec3f) -> vec3f {
                return v - (v.x + v.y + v.z) * UNSKEW_3D_CONST;
            }
        `
    }

    let imports: ReadOnlyShaderModule[] = []
    let resources: ReadOnlyResource[] = []

    let name: string
    let corner_code: string
    let corner_fn: string
    let norm_constant: number

    if (type === 'Value') {
        name = 'simplex_value_3d'
        imports = [importFn('seed_3d'), importFn('hash_3u_1f'), skew_module]

        corner_fn = `${name}_corner`
        corner_code = /* wgsl */ `
            fn ${corner_fn}(skew_c: vec3u, c_pos: vec3f) -> f32 {
                let t = 0.6 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let vertex_value = hash_3u_1f(skew_c)*2 - 1;
                return t * t * t * t * vertex_value;
            }
        `
        norm_constant = 8
    } else {
        name = 'simplex_3d'
        imports = [importFn('seed_3d'), importFn('hash_3u_1u'), skew_module]
        resources = [readView(Gradients3D)]

        corner_fn = `${name}_corner`
        corner_code = /* wgsl */ `
            fn ${corner_fn}(skew_c: vec3u, c_pos: vec3f) -> f32 {
                let t = 0.6 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let hash = hash_3u_1u(skew_c) >> 26;
                let gradient = gradients_3D[hash];
                return t * t * t * t * dot(gradient, c_pos);
            }
        `
        norm_constant = 42
    }

    return {
        name,
        posType: 'vec3f',
        resources,
        imports,
        code: /* wgsl */ `
            ${corner_code}

            fn ${name}(pos: vec3f, seed: u32) -> f32 {
                let f_skew_c0 = floor(skew_3d(pos));

                let c0 = unskew_3d(f_skew_c0);
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
                let c0_c1 = unskew_3d(vec3f(skew_c0_c1));
                let c0_c2 = unskew_3d(vec3f(skew_c0_c2));
                const c0_c3 = vec3f(1, 1, 1) - 3 * UNSKEW_3D_CONST;

                let c1_pos = c0_pos - c0_c1;
                let c2_pos = c0_pos - c0_c2;
                let c3_pos = c0_pos - c0_c3;

                let skew_c0 = seed_3d(vec3i(f_skew_c0), seed);
                let skew_c1 = skew_c0 + skew_c0_c1;
                let skew_c2 = skew_c0 + skew_c0_c2;
                let skew_c3 = skew_c0 + skew_c0_c3;

                let i0 = ${corner_fn}(skew_c0, c0_pos);
                let i1 = ${corner_fn}(skew_c1, c1_pos);
                let i2 = ${corner_fn}(skew_c2, c2_pos);
                let i3 = ${corner_fn}(skew_c3, c3_pos);

                let n = ${norm_constant} * (i0 + i1 + i2 + i3);
                return clamp(n, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}

export function Simplex4D(
    type: 'Gradient' | 'Value' = 'Gradient'
): NoiseModule {
    const skew_module = {
        name: 'simplex_4d_skew',
        code: /* wgsl */ `
            const SKEW_4D_CONST = ${get_skew_constant(4)};
            const UNSKEW_4D_CONST = ${get_unskew_constant(4)};

            fn skew_4d(v: vec4f) -> vec4f {
                return v + (v.x + v.y + v.z + v.w) * SKEW_4D_CONST;
            }

            fn unskew_4d(v: vec4f) -> vec4f {
                return v - (v.x + v.y + v.z + v.w) * UNSKEW_4D_CONST;
            }
        `
    }

    let imports: ReadOnlyShaderModule[] = []
    let resources: ReadOnlyResource[] = []

    let name: string
    let corner_code: string
    let corner_fn: string
    let norm_constant: number

    if (type === 'Value') {
        name = 'simplex_value_4d'
        imports = [importFn('seed_4d'), importFn('hash_4u_1f'), skew_module]

        corner_fn = `${name}_corner`
        corner_code = /* wgsl */ `
            fn ${corner_fn}(skew_c: vec4u, c_pos: vec4f) -> f32 {
                let t = 0.6 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let vertex_value = hash_4u_1f(skew_c)*2 - 1;
                return t * t * t * t * vertex_value;
            }
        `
        norm_constant = 8
    } else {
        name = 'simplex_4d'
        imports = [importFn('seed_4d'), importFn('hash_4u_1u'), skew_module]
        resources = [readView(Gradients4D)]

        corner_fn = `${name}_corner`
        corner_code = /* wgsl */ `
            fn ${corner_fn}(skew_c: vec4u, c_pos: vec4f) -> f32 {
                let t = 0.6 - dot(c_pos, c_pos);
                if (t < 0) {
                    return 0;
                }
                let hash = hash_4u_1u(skew_c) >> 26;
                let gradient = gradients_4D[hash];
                return t * t * t * t * dot(gradient, c_pos);
            }
        `
        norm_constant = 42
    }

    return {
        name,
        posType: 'vec4f',
        resources,
        imports,
        code: /* wgsl */ `
            ${corner_code}

            fn ${name}(pos: vec4f, seed: u32) -> f32 {
                let skew_pos = skew_4d(pos);
                let f_skew_c0 = floor(skew_pos);

                let c0 = unskew_4d(f_skew_c0);
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
                const skew_c0_c4 = vec4u(1, 1, 1, 1);
                
                let c0_c1 = unskew_4d(vec4f(skew_c0_c1));
                let c0_c2 = unskew_4d(vec4f(skew_c0_c2));
                let c0_c3 = unskew_4d(vec4f(skew_c0_c3));
                const c0_c4 = vec4f(1, 1, 1, 1) - 4 * UNSKEW_4D_CONST;

                let c1_pos = c0_pos - c0_c1;
                let c2_pos = c0_pos - c0_c2;
                let c3_pos = c0_pos - c0_c3;
                let c4_pos = c0_pos - c0_c4;

                let skew_c0 = seed_4d(vec4i(f_skew_c0), seed);
                let skew_c1 = skew_c0 + skew_c0_c1;
                let skew_c2 = skew_c0 + skew_c0_c2;
                let skew_c3 = skew_c0 + skew_c0_c3;
                let skew_c4 = skew_c0 + skew_c0_c4;

                let i0 = ${corner_fn}(skew_c0, c0_pos);
                let i1 = ${corner_fn}(skew_c1, c1_pos);
                let i2 = ${corner_fn}(skew_c2, c2_pos);
                let i3 = ${corner_fn}(skew_c3, c3_pos);
                let i4 = ${corner_fn}(skew_c4, c4_pos);

                let n = ${norm_constant} * (i0 + i1 + i2 + i3 + i4);
                return clamp(n, -1, 1) * 0.5 + 0.5;
            }
        `
    }
}
