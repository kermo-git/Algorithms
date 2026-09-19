import type { NoiseShaderFactory, Config } from '../Deprecated'
import {
    seed_2d,
    hash_2u_2f,
    seed_3d,
    hash_3u_3f,
    seed_4d,
    hash_4u_4f,
    importFn
} from '../Utils'
import { NoiseModule } from './Common'

export function Worley2DModule(): NoiseModule {
    return {
        posType: 'vec2f',
        name: 'worley_2d',
        imports: [importFn('seed_2d'), importFn('hash_2u_2f')],
        code: /* wgsl */ `
        fn worley_2d(pos: vec2f, seed: u32) -> f32 {
            let grid_pos = vec2i(floor(pos));
            var min_dist_sqr = 10.0;

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    
                    let neighbor = grid_pos + vec2i(offset_x, offset_y);
                    let point = hash_2u_2f(seed_2d(neighbor, seed));

                    let v_pos_point = vec2f(neighbor) + point - pos;
                    let dist_sqr = dot(v_pos_point, v_pos_point);
                    min_dist_sqr = min(min_dist_sqr, dist_sqr);
                }
            }
            return clamp(sqrt(min_dist_sqr) * 1.05, 0, 1);
        }
    `
    }
}

export function Worley3DModule(): NoiseModule {
    return {
        posType: 'vec3f',
        name: 'worley_3d',
        imports: [importFn('seed_3d'), importFn('hash_3u_3f')],
        code: /* wgsl */ `
            fn worley_3d(pos: vec3f, seed: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var min_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);
                            let point = hash_3u_3f(seed_3d(neighbor, seed));

                            let v_pos_point = vec3f(neighbor) + point - pos;
                            let dist_sqr = dot(v_pos_point, v_pos_point);
                            min_dist_sqr = min(min_dist_sqr, dist_sqr);
                        }
                    }
                }
                return clamp(sqrt(min_dist_sqr), 0, 1);
            }
        `
    }
}

export function Worley4DModule(): NoiseModule {
    return {
        posType: 'vec4f',
        name: 'worley_4d',
        imports: [importFn('seed_4d'), importFn('hash_4u_4f')],
        code: /* wgsl */ `
        fn worley_4d(pos: vec4f, seed: u32) -> f32 {
            let grid_pos = vec4i(floor(pos));
            var min_dist_sqr = 10.0;

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    for (var offset_z = -1; offset_z < 2; offset_z++) {
                        for (var offset_w = -1; offset_w < 2; offset_w++) {

                            let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);
                            let point = hash_4u_4f(seed_4d(neighbor, seed));

                            let v_pos_point = vec4f(neighbor) + point - pos;
                            let dist_sqr = dot(v_pos_point, v_pos_point);
                            min_dist_sqr = min(min_dist_sqr, dist_sqr);
                        }
                    }
                }
            }
            return clamp(sqrt(min_dist_sqr), 0, 1);
        }
    `
    }
}

export const Worley2D: NoiseShaderFactory = {
    pos_type: 'vec2f',

    createShaderDependencies() {
        return `
            ${seed_2d}
            ${hash_2u_2f}
        `
    },

    createShader({ functionName }: Config) {
        return /* wgsl */ `
            fn ${functionName}(pos: vec2f, seed: u32) -> f32 {
                let grid_pos = vec2i(floor(pos));
                var min_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        
                        let neighbor = grid_pos + vec2i(offset_x, offset_y);
                        let point = hash_2u_2f(seed_2d(neighbor, seed));

                        let v_pos_point = vec2f(neighbor) + point - pos;
                        let dist_sqr = dot(v_pos_point, v_pos_point);
                        min_dist_sqr = min(min_dist_sqr, dist_sqr);
                    }
                }
                return clamp(sqrt(min_dist_sqr) * 1.05, 0, 1);
            }
        `
    }
}

export const Worley3D: NoiseShaderFactory = {
    pos_type: 'vec3f',

    createShaderDependencies() {
        return `
            ${seed_3d}
            ${hash_3u_3f}
        `
    },

    createShader({ functionName }: Config) {
        return /* wgsl */ `
            fn ${functionName}(pos: vec3f, channel: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var min_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);
                            let point = hash_3u_3f(seed_3d(neighbor, channel));

                            let v_pos_point = vec3f(neighbor) + point - pos;
                            let dist_sqr = dot(v_pos_point, v_pos_point);
                            min_dist_sqr = min(min_dist_sqr, dist_sqr);
                        }
                    }
                }
                return clamp(sqrt(min_dist_sqr), 0, 1);
            }
        `
    }
}

export const Worley4D: NoiseShaderFactory = {
    pos_type: 'vec4f',

    createShaderDependencies() {
        return `
            ${seed_4d}
            ${hash_4u_4f}
        `
    },

    createShader({ functionName }: Config) {
        return /* wgsl */ `
            fn ${functionName}(pos: vec4f, channel: u32) -> f32 {
                let grid_pos = vec4i(floor(pos));
                var min_dist_sqr = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {

                                let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);
                                let point = hash_4u_4f(seed_4d(neighbor, channel));

                                let v_pos_point = vec4f(neighbor) + point - pos;
                                let dist_sqr = dot(v_pos_point, v_pos_point);
                                min_dist_sqr = min(min_dist_sqr, dist_sqr);
                            }
                        }
                    }
                }
                return clamp(sqrt(min_dist_sqr), 0, 1);
            }
        `
    }
}
