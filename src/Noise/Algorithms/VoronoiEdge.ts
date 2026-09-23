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

export function VoronoiFace3D(): NoiseModule {
    return {
        posType: 'vec3f',
        name: 'worley_face_3d',
        imports: [importFn('seed_3d'), importFn('hash_3u_3f')],
        code: /* wgsl */ `
            fn worley_face_3d(pos: vec3f, seed: u32) -> f32 {
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

export function VoronoiEdge3D(): NoiseModule {
    return {
        posType: 'vec3f',
        name: 'worley_edge_3d',
        imports: [importFn('seed_3d'), importFn('hash_3u_3f')],
        code: /* wgsl */ `
            fn find_edge_distance(
                pos: vec3f, 
                f1_vec: vec3f, 
                f2_vec: vec3f
            ) -> f32 {
                // https://en.wikipedia.org/wiki/Vector_projection
                let d_f1_f2 = dot(f1_vec, f2_vec);

                let f2_x = normalize(
                    f1_vec - (d_f1_f2/dot(f2_vec, f2_vec)) * f2_vec
                );
                let f1_x = normalize(
                    f2_vec - (d_f1_f2/dot(f1_vec, f1_vec)) * f1_vec
                );

                let f1 = pos + f1_vec;
                let f2 = pos + f2_vec;
// EQ1: f1.x + s * f1_x.x = f2.x + t * f2_x.x
// EQ2: f1.y + s * f1_x.y = f2.y + t * f2_x.y

// EQ1: s = (f2.x + t * f2_x.x - f1.x) / f1_x.x
// EQ2: f1.y + (f2.x + t * f2_x.x - f1.x) * f1_x.y / f1_x.x = f2.y + t * f2_x.y

// a = f1_x.y / f1_x.x
// f1.y + (f2.x + t * f2_x.x - f1.x) * a = f2.y + t * f2_x.y
// f1.y + a * f2.x + t * a * f2_x.x - a * f1.x = f2.y + t * f2_x.y
// t * a * f2_x.x - t * f2_x.y = f2.y - f1.y - a * f2.x + a * f1.x
// t * (a * f2_x.x - f2_x.y) = f2.y - f1.y - a * f2.x + a * f1.x
// t = (f2.y - f1.y - a * f2.x + a * f1.x) / (a * f2_x.x - f2_x.y)

// Answer:
// t = (f2.y - f1.y - a * f2.x + a * f1.x) / (a * f2_x.x - f2_x.y)
// s = (f2.x + t * f2_x.x - f1.x) / f1_x.x
                let a = f1_x.y / f1_x.x;
                let t = (f2.y - f1.y - a * f2.x + a * f1.x) / (a * f2_x.x - f2_x.y);
                let x = f2 + t * f2_x;
                return length(x - pos);
            }

            fn worley_edge_3d(pos: vec3f, seed: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));

                // Distance to closest Voronoi seed point
                var min_point_dist = 10.0;
                // Vector to closest Voronoi seed point
                var min_point_vec = vec3f(0);

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            let offset = vec3i(offset_x, offset_y, offset_z);
                            let neighbor = grid_pos + offset;
                            let point = hash_3u_3f(seed_3d(neighbor, seed));

                            let point_vec = vec3f(neighbor) + point - pos;
                            let point_dist = dot(point_vec, point_vec);
                            
                            if (point_dist < min_point_dist) {
                                min_point_dist = point_dist;
                                min_point_vec = point_vec;
                            }
                        }
                    }
                }

                // Distances to closest face of the surrounding Voronoi cell
                var min_face_dist = 10.0;
                var min_face_vec = vec3f(0);
                var min_face_offset = vec3i(0);

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let offset = vec3i(offset_x, offset_y, offset_z);
                            let neighbor = grid_pos + offset;
                            let point = hash_3u_3f(seed_3d(neighbor, seed));

                            let point_vec = vec3f(neighbor) + point - pos;
                            let point_to_point = normalize(point_vec - min_point_vec);

                            let face_dist = dot(
                                0.5 * (point_vec + min_point_vec), 
                                point_to_point
                            );
                            let face_vec = face_dist * point_to_point;

                            if (face_dist < min_face_dist) {
                                min_face_dist = face_dist;
                                min_face_vec = face_vec;
                                min_face_offset = offset;
                            }
                        }
                    }
                }

                var min_edge_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let offset = vec3i(offset_x, offset_y, offset_z);
                            if all(offset == min_face_offset) {
                                continue;
                            }
                            let neighbor = grid_pos + offset;
                            let point = hash_3u_3f(seed_3d(neighbor, seed));

                            let point_vec = vec3f(neighbor) + point - pos;
                            let point_to_point = normalize(point_vec - min_point_vec);

                            let face_dist = dot(
                                0.5 * (point_vec + min_point_vec), 
                                point_to_point
                            );
                            let face_vec = face_dist * point_to_point;
                            let edge_dist = find_edge_distance(
                                pos, min_face_vec, face_vec
                            );
                            min_edge_dist = min(edge_dist, min_edge_dist);
                        }
                    }
                }
                
                return clamp(1.8 * min_edge_dist, 0, 1);
            }
        `
    }
}
