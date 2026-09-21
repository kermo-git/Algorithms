import { importFn } from '../HelperFunctions'
import { NoiseModule } from '../Modules'

export function WorleyEdge2D(): NoiseModule {
    return {
        posType: 'vec2f',
        name: 'worley_edge_2d',
        imports: [importFn('seed_2d'), importFn('hash_2u_2f')],
        code: /* wgsl */ `
            fn worley_edge_2d(pos: vec2f, seed: u32) -> f32 {
                let grid_pos = vec2i(floor(pos));
                var min_dist = 10.0;
                var min_2nd_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        
                        let neighbor = grid_pos + vec2i(offset_x, offset_y);
                        let point = hash_2u_2f(seed_2d(neighbor, seed));

                        let dist_vec = vec2f(neighbor) + point - pos;
                        let dist = dot(dist_vec, dist_vec);
                        
                        if (dist < min_dist) {
                            min_2nd_dist = min_dist;
                            min_dist = dist;
                        } else if (dist < min_2nd_dist) {
                            min_2nd_dist = dist;
                        }
                    }
                }
                let result = 0.95*(sqrt(min_2nd_dist) - sqrt(min_dist));
                return clamp(result, 0, 1);
            }
        `
    }
}

export function WorleyEdge3D(): NoiseModule {
    return {
        posType: 'vec3f',
        name: 'worley_edge_3d',
        imports: [importFn('seed_3d'), importFn('hash_3u_3f')],
        code: /* wgsl */ `
            fn worley_edge_3d(pos: vec3f, seed: u32) -> f32 {
                let grid_pos = vec3i(floor(pos));
                var min_dist = 10.0;
                var min_2nd_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {

                            let neighbor = grid_pos + vec3i(offset_x, offset_y, offset_z);
                            let point = hash_3u_3f(seed_3d(neighbor, seed));

                            let dist_vec = vec3f(neighbor) + point - pos;
                            let dist = dot(dist_vec, dist_vec);
                            
                            if (dist < min_dist) {
                                min_2nd_dist = min_dist;
                                min_dist = dist;
                            } else if (dist < min_2nd_dist) {
                                min_2nd_dist = dist;
                            }
                        }
                    }
                }

                let result = 1.1*(sqrt(min_2nd_dist) - sqrt(min_dist));
                return clamp(result, 0, 1);
            }
        `
    }
}

export function WorleyEdge4D(): NoiseModule {
    return {
        posType: 'vec4f',
        name: 'worley_edge_4d',
        imports: [importFn('seed_4d'), importFn('hash_4u_4f')],
        code: /* wgsl */ `
            fn worley_edge_4d(pos: vec4f, seed: u32) -> f32 {
                let grid_pos = vec4i(floor(pos));
                var min_dist = 10.0;
                var min_2nd_dist = 10.0;

                for (var offset_x = -1; offset_x < 2; offset_x++) {
                    for (var offset_y = -1; offset_y < 2; offset_y++) {
                        for (var offset_z = -1; offset_z < 2; offset_z++) {
                            for (var offset_w = -1; offset_w < 2; offset_w++) {

                                let neighbor = grid_pos + vec4i(offset_x, offset_y, offset_z, offset_w);
                                let point = hash_4u_4f(seed_4d(neighbor, seed));

                                let dist_vec = vec4f(neighbor) + point - pos;
                                let dist = dot(dist_vec, dist_vec);
                                
                                if (dist < min_dist) {
                                    min_2nd_dist = min_dist;
                                    min_dist = dist;
                                } else if (dist < min_2nd_dist) {
                                    min_2nd_dist = dist;
                                }
                            }
                        }
                    }
                }

                let result = 1.2*(sqrt(min_2nd_dist) - sqrt(min_dist));
                return clamp(result, 0, 1);
            }
        `
    }
}
