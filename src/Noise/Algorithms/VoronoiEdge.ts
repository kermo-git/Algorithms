// https://iquilezles.org/articles/voronoilines/

import { importFn } from '../HelperFunctions'
import { NoiseModule } from '../Modules'

export function VoronoiEdge2D(): NoiseModule {
    return {
        posType: 'vec2f',
        name: 'worley_edge_2d',
        imports: [importFn('seed_2d'), importFn('hash_2u_2f')],
        code: /* wgsl */ `
            fn worley_edge_2d(pos: vec2f, seed: u32) -> f32 {
                let grid_pos = vec2i(floor(pos));

                var min_dist = 10.0;
                var min_dist_vec = vec2f(0);

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        let offset = vec2i(offset_x, offset_y);
                        let neighbor = grid_pos + offset;
                        let point = hash_2u_2f(seed_2d(neighbor, seed));

                        let dist_vec = vec2f(neighbor) + point - pos;
                        let dist = dot(dist_vec, dist_vec);
                        
                        if (dist < min_dist) {
                            min_dist = dist;
                            min_dist_vec = dist_vec;
                        }
                    }
                }

                min_dist = 10.0;
                for (var offset_x = -2; offset_x < 3; offset_x++) {
                    for (var offset_y = -2; offset_y < 3; offset_y++) {
                        let offset = vec2i(offset_x, offset_y);
                        let neighbor = grid_pos + offset;
                        let point = hash_2u_2f(seed_2d(neighbor, seed));

                        let dist_vec = vec2f(neighbor) + point - pos;
                        let dist = dot(
                            0.5 * (dist_vec + min_dist_vec), 
                            normalize(dist_vec - min_dist_vec)
                        );
                        
                        if (dist < min_dist) {
                            min_dist = dist;
                        }
                    }
                }

                return clamp(1.6 * min_dist, 0, 1);
            }
        `
    }
}

export function VoronoiEdge3D(): NoiseModule {
    return {
        posType: 'vec3f',
        name: 'worley_edge_3d',
        imports: [importFn('seed_3d'), importFn('hash_3u_3f')],
        code: /* wgsl */ `
            fn worley_edge_3d(pos: vec3f, seed: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var min_dist = 10.0;
                var min_dist_vec = vec3f(0);

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            let offset = vec3i(offset_x, offset_y, offset_z);
                            let neighbor = grid_pos + offset;
                            let point = hash_3u_3f(seed_3d(neighbor, seed));

                            let dist_vec = vec3f(neighbor) + point - pos;
                            let dist = dot(dist_vec, dist_vec);
                            
                            if (dist < min_dist) {
                                min_dist = dist;
                                min_dist_vec = dist_vec;
                            }
                        }
                    }
                }

                min_dist = 10.0;

                for (var offset_x = -2; offset_x < 3; offset_x++) {
                    for (var offset_y = -2; offset_y < 3; offset_y++) {
                        for (var offset_z = -2; offset_z < 3; offset_z++) {
                            let offset = vec3i(offset_x, offset_y, offset_z);
                            let neighbor = grid_pos + offset;
                            let point = hash_3u_3f(seed_3d(neighbor, seed));

                            let dist_vec = vec3f(neighbor) + point - pos;
                            let dist = dot(
                                0.5 * (dist_vec + min_dist_vec), 
                                normalize(dist_vec - min_dist_vec)
                            );
                            
                            if (dist < min_dist) {
                                min_dist = dist;
                            }
                        }
                    }
                }

                return clamp(1.8 * min_dist, 0, 1);
            }
        `
    }
}

export function VoronoiEdge4D(): NoiseModule {
    return {
        posType: 'vec4f',
        name: 'worley_edge_4d',
        imports: [importFn('seed_4d'), importFn('hash_4u_4f')],
        code: /* wgsl */ `
            fn worley_edge_4d(pos: vec4f, seed: u32) -> f32 {
                let grid_pos = vec4i(floor(pos));
                var min_dist = 10.0;
                var min_dist_vec = vec4f(0);

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {
                                let offset = vec4i(offset_x, offset_y, offset_z, offset_w);
                                let neighbor = grid_pos + offset;
                                let point = hash_4u_4f(seed_4d(neighbor, seed));

                                let dist_vec = vec4f(neighbor) + point - pos;
                                let dist = dot(dist_vec, dist_vec);
                                
                                if (dist < min_dist) {
                                    min_dist = dist;
                                    min_dist_vec = dist_vec;
                                }
                            }
                        }
                    }
                }

                min_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {
                                let offset = vec4i(offset_x, offset_y, offset_z, offset_w);
                                let neighbor = grid_pos + offset;
                                let point = hash_4u_4f(seed_4d(neighbor, seed));

                                let dist_vec = vec4f(neighbor) + point - pos;
                                let dist = dot(
                                    0.5 * (dist_vec + min_dist_vec), 
                                    normalize(dist_vec - min_dist_vec)
                                );
                                
                                if (dist < min_dist) {
                                    min_dist = dist;
                                }
                            }
                        }
                    }
                }

                return clamp(1.9 * min_dist, 0, 1);
            }
        `
    }
}

export function VoronoiWireframe3D(): NoiseModule {
    return {
        posType: 'vec3f',
        name: 'worley_edge_3d',
        imports: [importFn('seed_3d'), importFn('hash_3u_3f')],
        code: /* wgsl */ `
            fn worley_edge_3d(pos: vec3f, seed: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var f1_dist = 10.0;
                var f2_dist = 10.0;
                var f3_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            let offset = vec3i(offset_x, offset_y, offset_z);
                            let neighbor = grid_pos + offset;
                            let point = hash_3u_3f(seed_3d(neighbor, seed));
                            
                            let point_vec = vec3f(neighbor) + point - pos;
                            let point_dist = dot(point_vec, point_vec);
                            
                            if (point_dist < f1_dist) {
                                f3_dist = f2_dist;
                                f2_dist = f1_dist;
                                f1_dist = point_dist;
                            } else if (point_dist < f2_dist) {
                                f3_dist = f2_dist;
                                f2_dist = point_dist;
                            } else if (point_dist < f3_dist) {
                                f3_dist = point_dist;
                            }
                        }
                    }
                }
                
                return clamp(0.8*(f3_dist - f1_dist), 0, 1);
            }
        `
    }
}
