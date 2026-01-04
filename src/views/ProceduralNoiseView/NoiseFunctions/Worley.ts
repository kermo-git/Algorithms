import {
    shaderRandomPoints2D,
    shaderRandomPoints3D,
    shaderRandomPoints4D,
} from '../NoiseUtils/Buffers'
import { NoiseScene, type DomainTransform } from '../NoiseUtils/NoiseScene'

export function worley2DShader(second_closest = false): string {
    const min_check_code = second_closest
        ? /* wgsl */ `
            if (dist_sqr < min_dist_sqr) {
                min_2nd_dist_sqr = min_dist_sqr;
                min_dist_sqr = dist_sqr;
            } else if (dist_sqr < min_2nd_dist_sqr) {
                min_2nd_dist_sqr = dist_sqr;
            }
        `
        : /* wgsl */ `min_dist_sqr = min(min_dist_sqr, dist_sqr);`

    const return_value = second_closest ? 'min_2nd_dist_sqr' : 'min_dist_sqr'
    const normalizing_factor = second_closest ? 1 / 1.4 : 1 / 1.2

    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> points: array<vec2f>;

        fn noise(global_pos: vec2f) -> f32 {
            let grid_pos = vec2i(floor(global_pos));
            var min_dist_sqr = 10.0;
            ${second_closest ? 'var min_2nd_dist_sqr = 10.0;' : ''}

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    let neighbor = grid_pos + vec2i(offset_x, offset_y);

                    let hash = hash_table[
                        hash_table[neighbor.x & 255] + (neighbor.y & 255)
                    ];
                    let dist = vec2f(neighbor) + points[hash] - global_pos;
                    let dist_sqr = dist.x * dist.x + dist.y * dist.y;
                    
                    ${min_check_code}
                }
            }
            return clamp(sqrt(${return_value}) * ${normalizing_factor}, 0, 1);
        }
    `
}

export class Worley2D extends NoiseScene {
    constructor(second_closest: boolean, transform: DomainTransform = 'None') {
        super(worley2DShader(second_closest), '2D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderRandomPoints2D(n)
    }
}

export function worley3DShader(second_closest = false): string {
    const min_check_code = second_closest
        ? /* wgsl */ `
            if (dist_sqr < min_dist_sqr) {
                min_2nd_dist_sqr = min_dist_sqr;
                min_dist_sqr = dist_sqr;
            } else if (dist_sqr < min_2nd_dist_sqr) {
                min_2nd_dist_sqr = dist_sqr;
            }
        `
        : /* wgsl */ `min_dist_sqr = min(min_dist_sqr, dist_sqr);`

    const return_value = second_closest ? 'min_2nd_dist_sqr' : 'min_dist_sqr'
    const normalizing_factor = second_closest ? 1 / 1.26 : 1 / 1.2

    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> points: array<vec3f>;

        fn noise(global_pos: vec3f) -> f32 {
            let grid_pos = vec3i(floor(global_pos));
            var min_dist_sqr = 10.0;
            ${second_closest ? 'var min_2nd_dist_sqr = 10.0;' : ''}

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    for (var offset_z = -1; offset_z < 2; offset_z++) {
                        let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);

                        let hash = hash_table[
                            hash_table[
                                hash_table[neighbor.x & 255] + (neighbor.y & 255)
                            ] + (neighbor.z & 255)
                        ];
                        let dist = vec3f(neighbor) + points[hash] - global_pos;
                        let dist_sqr = dist.x * dist.x + dist.y * dist.y + dist.z * dist.z;
                        
                        ${min_check_code}
                    }
                }
            }
            return clamp(sqrt(${return_value}) * ${normalizing_factor}, 0, 1);
        }
    `
}

export class Worley3D extends NoiseScene {
    constructor(second_closest: boolean, transform: DomainTransform = 'None') {
        super(worley3DShader(second_closest), '3D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderRandomPoints3D(n)
    }
}

export function worley4DShader(second_closest = false): string {
    const min_check_code = second_closest
        ? /* wgsl */ `
            if (dist_sqr < min_dist_sqr) {
                min_2nd_dist_sqr = min_dist_sqr;
                min_dist_sqr = dist_sqr;
            } else if (dist_sqr < min_2nd_dist_sqr) {
                min_2nd_dist_sqr = dist_sqr;
            }
        `
        : /* wgsl */ `min_dist_sqr = min(min_dist_sqr, dist_sqr);`

    const return_value = second_closest ? 'min_2nd_dist_sqr' : 'min_dist_sqr'
    const normalizing_factor = second_closest ? 1 / 1.26 : 1 / 1.2

    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> points: array<vec4f>;

        fn noise(global_pos: vec4f) -> f32 {
            let grid_pos = vec4i(floor(global_pos));
            var min_dist_sqr = 10.0;
            ${second_closest ? 'var min_2nd_dist_sqr = 10.0;' : ''}

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    for (var offset_z = -1; offset_z < 2; offset_z++) {
                        for (var offset_w = -1; offset_w < 2; offset_w++) {
                            let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);

                            let hash = hash_table[
                                hash_table[
                                    hash_table[
                                        hash_table[neighbor.x & 255] + (neighbor.y & 255)
                                    ] + (neighbor.z & 255)
                                ] + (neighbor.w & 255)
                            ];
                            let dist = vec4f(neighbor) + points[hash] - global_pos;
                            let dist_sqr = dist.x * dist.x + dist.y * dist.y + dist.z * dist.z + dist.w * dist.w;
                            
                            ${min_check_code}
                        }
                    }
                }
            }
            return clamp(sqrt(${return_value}) * ${normalizing_factor}, 0, 1);
        }
    `
}

export class Worley4D extends NoiseScene {
    constructor(second_closest: boolean, transform: DomainTransform = 'None') {
        super(worley4DShader(second_closest), '4D', transform)
    }

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return shaderRandomPoints4D(n)
    }
}
