import { importFn } from '../Utils'
import { NoiseModule } from './Common'

// https://www.researchgate.net/figure/Shapes-and-sizes-of-geometries-corresponding-to-different-distance-metrics_tbl1_331203691
export type DistanceMeasure = 'Euclidean' | 'Manhattan' | 'Chebyshev'

export function Worley2D(
    distance_measure: DistanceMeasure = 'Euclidean'
): NoiseModule {
    let name = ''
    let compare_expr = ''
    let final_dist_expr = ''

    if (distance_measure === 'Euclidean') {
        name = 'worley_2d'
        // No need to calculate square root because
        // we only need to compare which distance is the shortest
        compare_expr = 'dot(dist_vec, dist_vec) * 1.02'
        final_dist_expr = 'sqrt(min_dist)'
    } else if (distance_measure === 'Manhattan') {
        name = 'worley_manhattan_2d'
        compare_expr = 'abs(dist_vec.x) + abs(dist_vec.y)'
        final_dist_expr = 'min_dist * 0.7'
    } else {
        name = 'worley_chebyshev_2d'
        compare_expr = 'max(abs(dist_vec.x), abs(dist_vec.y))'
        final_dist_expr = 'min_dist * 1.02'
    }

    return {
        posType: 'vec2f',
        name,
        imports: [importFn('seed_2d'), importFn('hash_2u_2f')],
        code: /* wgsl */ `
            fn ${name}(pos: vec2f, seed: u32) -> f32 {
                let grid_pos = vec2i(floor(pos));
                var min_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        
                        let neighbor = grid_pos + vec2i(offset_x, offset_y);
                        let point = hash_2u_2f(seed_2d(neighbor, seed));

                        let dist_vec = vec2f(neighbor) + point - pos;
                        min_dist = min(min_dist, ${compare_expr});
                    }
                }
                return clamp(${final_dist_expr}, 0, 1);
            }
        `
    }
}

export function Worley3D(
    distance_measure: DistanceMeasure = 'Euclidean'
): NoiseModule {
    let name = ''
    let compare_expr = ''
    let final_dist_expr = ''

    if (distance_measure === 'Euclidean') {
        name = 'worley_3d'
        compare_expr = 'dot(dist_vec, dist_vec)'
        final_dist_expr = 'sqrt(min_dist)'
    } else if (distance_measure === 'Manhattan') {
        name = 'worley_manhattan_3d'
        compare_expr = 'abs(dist_vec.x) + abs(dist_vec.y) + abs(dist_vec.z)'
        final_dist_expr = 'min_dist * 0.6'
    } else {
        name = 'worley_chebyshev_3d'
        compare_expr =
            'max(max(abs(dist_vec.x), abs(dist_vec.y)), abs(dist_vec.z))'
        final_dist_expr = 'min_dist * 1.1'
    }

    return {
        posType: 'vec3f',
        name,
        imports: [importFn('seed_3d'), importFn('hash_3u_3f')],
        code: /* wgsl */ `
            fn ${name}(pos: vec3f, seed: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var min_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);
                            let point = hash_3u_3f(seed_3d(neighbor, seed));

                            let dist_vec = vec3f(neighbor) + point - pos;
                            min_dist = min(min_dist, ${compare_expr});
                        }
                    }
                }
                return clamp(${final_dist_expr}, 0, 1);
            }
        `
    }
}

export function Worley4D(
    distance_measure: DistanceMeasure = 'Euclidean'
): NoiseModule {
    let name = ''
    let compare_expr = ''
    let final_dist_expr = ''

    if (distance_measure === 'Euclidean') {
        name = 'worley_4d'
        compare_expr = 'dot(dist_vec, dist_vec)'
        final_dist_expr = 'sqrt(min_dist) * 0.95'
    } else if (distance_measure === 'Manhattan') {
        name = 'worley_manhattan_4d'
        compare_expr =
            'abs(dist_vec.x) + abs(dist_vec.y) + abs(dist_vec.z) + abs(dist_vec.w)'
        final_dist_expr = 'min_dist * 0.5'
    } else {
        name = 'worley_chebyshev_4d'
        compare_expr =
            'max(max(abs(dist_vec.x), abs(dist_vec.y)), max(abs(dist_vec.z), abs(dist_vec.w)))'
        final_dist_expr = 'min_dist * 1.2'
    }

    return {
        posType: 'vec4f',
        name,
        imports: [importFn('seed_4d'), importFn('hash_4u_4f')],
        code: /* wgsl */ `
            fn ${name}(pos: vec4f, seed: u32) -> f32 {
                let grid_pos = vec4i(floor(pos));
                var min_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {

                                let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);
                                let point = hash_4u_4f(seed_4d(neighbor, seed));

                                let dist_vec = vec4f(neighbor) + point - pos;
                                min_dist = min(min_dist, ${compare_expr});
                            }
                        }
                    }
                }
                return clamp(${final_dist_expr}, 0, 1);
            }
        `
    }
}
