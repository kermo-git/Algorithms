import type { NoiseShaderNames } from '../ShaderUtils'

export function worley2DShader(
    second_closest = false,
    { hash_table, features, noise }: NoiseShaderNames,
): string {
    let min_check_code = ''
    let result_var = ''
    let return_expr = ''

    if (second_closest) {
        min_check_code = /* wgsl */ `
            if (dist_sqr < min_dist_sqr) {
                min_2nd_dist_sqr = min_dist_sqr;
                min_dist_sqr = dist_sqr;
            } else if (dist_sqr < min_2nd_dist_sqr) {
                min_2nd_dist_sqr = dist_sqr;
            }
        `
        result_var = 'min_2nd_dist_sqr'
        return_expr = `(sqrt(${result_var}) - 0.07) * 0.79`
    } else {
        min_check_code = 'min_dist_sqr = min(min_dist_sqr, dist_sqr);'
        result_var = 'min_dist_sqr'
        return_expr = `sqrt(${result_var}) * 1.05`
    }

    return /* wgsl */ `
        fn ${noise}(global_pos: vec2f) -> f32 {
            let grid_pos = vec2i(floor(global_pos));
            var min_dist_sqr = 10.0;
            ${second_closest ? 'var min_2nd_dist_sqr = 10.0;' : ''}

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    let neighbor = grid_pos + vec2i(offset_x, offset_y);

                    let hash = ${hash_table}[
                        ${hash_table}[neighbor.x & 255] + (neighbor.y & 255)
                    ];
                    let dist = vec2f(neighbor) + ${features}[hash] - global_pos;
                    let dist_sqr = dist.x * dist.x + dist.y * dist.y;
                    
                    ${min_check_code}
                }
            }
            return clamp(${return_expr}, 0, 1);
        }
    `
}

export function worley3DShader(
    second_closest = false,
    { hash_table, features, noise }: NoiseShaderNames,
): string {
    let min_check_code = ''
    let result_var = ''
    let return_expr = ''

    if (second_closest) {
        min_check_code = /* wgsl */ `
            if (dist_sqr < min_dist_sqr) {
                min_2nd_dist_sqr = min_dist_sqr;
                min_dist_sqr = dist_sqr;
            } else if (dist_sqr < min_2nd_dist_sqr) {
                min_2nd_dist_sqr = dist_sqr;
            }
        `
        result_var = 'min_2nd_dist_sqr'
        return_expr = `(sqrt(${result_var}) - 0.1) * 0.92`
    } else {
        min_check_code = 'min_dist_sqr = min(min_dist_sqr, dist_sqr);'
        result_var = 'min_dist_sqr'
        return_expr = `sqrt(${result_var}) * 0.92`
    }

    return /* wgsl */ `
        fn ${noise}(global_pos: vec3f) -> f32 {
            let grid_pos = vec3i(floor(global_pos));
            var min_dist_sqr = 10.0;
            ${second_closest ? 'var min_2nd_dist_sqr = 10.0;' : ''}

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    for (var offset_z = -1; offset_z < 2; offset_z++) {
                        let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);

                        let hash = ${hash_table}[
                            ${hash_table}[
                                ${hash_table}[neighbor.x & 255] + (neighbor.y & 255)
                            ] + (neighbor.z & 255)
                        ];
                        let dist = vec3f(neighbor) + ${features}[hash] - global_pos;
                        let dist_sqr = dist.x * dist.x + dist.y * dist.y + dist.z * dist.z;
                        
                        ${min_check_code}
                    }
                }
            }
            return clamp(${return_expr}, 0, 1);
        }
    `
}

export function worley4DShader(
    second_closest = false,
    { hash_table, features, noise }: NoiseShaderNames,
): string {
    let min_check_code = ''
    let result_var = ''
    let return_expr = ''

    if (second_closest) {
        min_check_code = /* wgsl */ `
            if (dist_sqr < min_dist_sqr) {
                min_2nd_dist_sqr = min_dist_sqr;
                min_dist_sqr = dist_sqr;
            } else if (dist_sqr < min_2nd_dist_sqr) {
                min_2nd_dist_sqr = dist_sqr;
            }
        `
        result_var = 'min_2nd_dist_sqr'
        return_expr = `(sqrt(${result_var}) - 0.18) * 0.97`
    } else {
        min_check_code = 'min_dist_sqr = min(min_dist_sqr, dist_sqr);'
        result_var = 'min_dist_sqr'
        return_expr = `sqrt(${result_var}) * 0.95`
    }

    return /* wgsl */ `
        fn ${noise}(global_pos: vec4f) -> f32 {
            let grid_pos = vec4i(floor(global_pos));
            var min_dist_sqr = 10.0;
            ${second_closest ? 'var min_2nd_dist_sqr = 10.0;' : ''}

            for (var offset_x = -1; offset_x < 2; offset_x++) {
                for (var offset_y = -1; offset_y < 2; offset_y++) {
                    for (var offset_z = -1; offset_z < 2; offset_z++) {
                        for (var offset_w = -1; offset_w < 2; offset_w++) {
                            let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);

                            let hash = ${hash_table}[
                                ${hash_table}[
                                    ${hash_table}[
                                        ${hash_table}[neighbor.x & 255] + (neighbor.y & 255)
                                    ] + (neighbor.z & 255)
                                ] + (neighbor.w & 255)
                            ];
                            let dist = vec4f(neighbor) + ${features}[hash] - global_pos;
                            let dist_sqr = dist.x * dist.x + dist.y * dist.y + dist.z * dist.z + dist.w * dist.w;
                            
                            ${min_check_code}
                        }
                    }
                }
            }
            return clamp(${return_expr}, 0, 1);
        }
    `
}
