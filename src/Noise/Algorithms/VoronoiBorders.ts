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

export function VoronoiEdge3DApproximate(): NoiseModule {
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

                let a = f1_x.y / f1_x.x;
                let t = (f2.y - f1.y - a * f2.x + a * f1.x) / (a * f2_x.x - f2_x.y);
                let x = f2 + t * f2_x;
                return length(x - pos);
            }

            fn worley_edge_3d(pos: vec3f, seed: u32) -> f32 {
                const radius = 1;
                const diameter = 2 * radius + 1;
                const n_cells = diameter * diameter * diameter;
                var cache_arr: array<vec3f, n_cells>;

                let grid_pos = vec3i(floor(pos));
                // Distance to closest Voronoi seed point
                var min_point_dist = 10.0;
                // Vector to closest Voronoi seed point
                var min_point_vec = vec3f(0);

                for (var offset_x = 0; offset_x < diameter; offset_x++) {
                    for (var offset_y = 0; offset_y < diameter; offset_y++) {
                        for (var offset_z = 0; offset_z < diameter; offset_z++) {
                            let offset = vec3i(offset_x-radius, offset_y-radius, offset_z-radius);
                            let neighbor = grid_pos + offset;
                            let point = hash_3u_3f(seed_3d(neighbor, seed));
                            
                            let point_vec = vec3f(neighbor) + point - pos;
                            let point_dist = dot(point_vec, point_vec);
                            
                            if (point_dist < min_point_dist) {
                                min_point_dist = point_dist;
                                min_point_vec = point_vec;
                            }
                            let i = (offset_x*diameter + offset_y)*diameter + offset_z;
                            cache_arr[i] = point_vec;
                        }
                    }
                }

                // Distances to closest face of the surrounding Voronoi cell
                var min_face_dist = 10.0;
                var min_face_vec = vec3f(0);
                var min_face_index = 0;

                for (var i = 0; i < n_cells; i++) {
                    let point_vec = cache_arr[i];
                    let point_to_point = normalize(point_vec - min_point_vec);
                    let face_dist = dot(
                        0.5 * (point_vec + min_point_vec), 
                        point_to_point
                    );
                    let face_vec = face_dist * point_to_point;
                    cache_arr[i] = face_vec;

                    if (face_dist < min_face_dist) {
                        min_face_dist = face_dist;
                        min_face_vec = face_vec;
                        min_face_index = i;
                    }
                }

                var min_edge_dist = 10.0;

                for (var i = 0; i < n_cells; i++) {
                    if i == min_face_index {
                        continue;
                    }
                    let face_vec = cache_arr[i];
                    let edge_dist = find_edge_distance(
                        pos, min_face_vec, face_vec
                    );
                    min_edge_dist = min(edge_dist, min_edge_dist);
                }
                
                return clamp(1.8 * min_edge_dist, 0, 1);
            }
        `
    }
}

export function VoronoiEdge3DExact(): NoiseModule {
    return {
        posType: 'vec3f',
        name: 'worley_edge_3d',
        imports: [importFn('seed_3d'), importFn('hash_3u_3f')],
        code: /* wgsl */ `
            fn worley_edge_3d(pos: vec3f, seed: u32) -> f32 {
                const radius = 1;
                const diameter = 2 * radius + 1;
                const n_cells = diameter * diameter * diameter;
                var points: array<vec3f, n_cells>;

                let grid_pos = vec3i(floor(pos));
                // Distance to closest Voronoi seed point
                var closest_point_dist = 10.0;
                // Vector to closest Voronoi seed point
                var closest_point = vec3f(0);
                var closest_point_i = 0;

                for (var x = 0; x < diameter; x++) {
                    for (var y = 0; y < diameter; y++) {
                        for (var z = 0; z < diameter; z++) {
                            let offset = vec3i(x-radius, y-radius, z-radius);
                            let neighbor = grid_pos + offset;
                            let local_point = hash_3u_3f(seed_3d(neighbor, seed));
                            let point = vec3f(neighbor) + local_point;
                            
                            let pos_to_point = point - pos;
                            let point_dist = dot(pos_to_point, pos_to_point);
                            let i = (x*diameter + y)*diameter + z;
                            
                            if (point_dist < closest_point_dist) {
                                closest_point_dist = point_dist;
                                closest_point = point;
                                closest_point_i = i;
                            }
                            points[i] = point;
                        }
                    }
                }

                var min_dist = 10.0;

                for (var i = 0; i < n_cells; i++) {
                    if (i == closest_point_i) {
                        continue;
                    }
                    let seed_i = points[i];
                    let ni = normalize(seed_i - closest_point);
                    let mi = 0.5*(closest_point + seed_i);
                    let di = dot(mi, ni);

                    for (var j = i+1; j < n_cells; j++) {
                        if (j == closest_point_i) {
                            continue;
                        }
                        let seed_j = points[j];
                        let nj = normalize(seed_j - closest_point);
                        let mj = 0.5*(closest_point + seed_j);
                        let dj = dot(mj, nj);
                        
                        // var e = cross(ni, nj);
                        // let e  = (di*cross(nj, ed) + dj*cross(ed, ni))/dot(ed, ed);
                        // ed = normalize(ed);

                        let ed = normalize(cross(ni, nj));

                        let common_x = nj.y*ed.z - nj.z*ed.y;
                        let common_y = nj.x*ed.z - nj.z*ed.x;
                        let common_z = nj.x*ed.y - nj.y*ed.x;

                        let det = ni.x*common_x - ni.y*common_y + ni.z*common_z;
                        let det_x = di*common_x + dj*(ni.z*ed.y - ni.y*ed.z);
                        let det_y = -di*common_y + dj*(ni.x*ed.z - ni.z*ed.x);
                        let det_z = di*common_z + dj*(ni.y*ed.x - ni.x*ed.y);
                        
                        let e = vec3f(det_x/det, det_y/det, det_z/det);

                        var t_min = -10000.0;
                        var t_max = 10000.0;
                        var valid = true;

                        for (var k = 0; k < n_cells; k++) {
                            if (k == i || k == j) {
                                continue;
                            }
                            let seed_k = points[k];
                            let nk = normalize(seed_k - closest_point);
                            let mk = 0.5*(closest_point + seed_k);
                            let denom = dot(nk, ed);

                            if abs(denom) < 0.0005 {
                                continue;
                            }

                            let t = dot(nk, mk - e)/denom;

                            if denom > 0 {
                                t_max = min(t, t_max);
                            } else {
                                t_min = max(t, t_min);
                            }

                            if (t_min > t_max) {
                                valid = false;
                                break;
                            }
                        }

                        if valid {
                            let t = clamp(dot(pos - e, ed), t_min, t_max);
                            let dist = length(e + t*ed - pos);
                            min_dist = min(min_dist, dist);
                        }
                    }
                }
                
                return clamp(1.8 * min_dist, 0, 1);
            }
        `
    }
}
