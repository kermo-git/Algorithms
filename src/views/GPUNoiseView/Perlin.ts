import { generateHashTable } from './NoiseRenderer'

export function perlin2DShader(): string {
    const n_gradients = 16
    const gradient_mask = n_gradients - 1
    const gradient_array_shader = []

    for (let i = 0; i < n_gradients; i++) {
        const phi = (2 * Math.PI * i) / n_gradients
        const x = Math.cos(phi).toFixed(3)
        const y = Math.sin(phi).toFixed(3)
        gradient_array_shader.push(`vec2f(${x}, ${y})`)
    }

    const hash_table = generateHashTable()

    return /* wgsl */ `
        const hash_table = array<u32, ${hash_table.length}>(${hash_table});
        const gradients = array(${gradient_array_shader});

        fn get_gradient(x: u32, y: u32) -> vec2f {
            let hash = hash_table[hash_table[x] + y];
            return gradients[hash & ${gradient_mask}];
        }

        fn fade(t: vec2f) -> vec2f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn lerp(t: f32, a: f32, b: f32) -> f32 {
            return a + t * (b - a);
        }

        fn noise(global_pos: vec2f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec2u(floor_pos) & vec2u(255, 255);
            let p1 = (p0 + 1u) & vec2u(255, 255);
            
            let grad_00 = get_gradient(p0.x, p0.y);
            let grad_10 = get_gradient(p1.x, p0.y);
            let grad_01 = get_gradient(p0.x, p1.y);
            let grad_11 = get_gradient(p1.x, p1.y);
            
            let local = global_pos - floor_pos;

            let a = dot(grad_00, local);
            let b = dot(grad_10, vec2f(local.x - 1, local.y));
            let c = dot(grad_01, vec2f(local.x, local.y - 1));
            let d = dot(grad_11, vec2f(local.x - 1, local.y - 1));

            let s = fade(local);
            return 1.55 * lerp(s.y, lerp(s.x, a, b), lerp(s.x, c, d));
        }
    `
}

export function perlin3DShader(): string {
    const n_gradients = 64
    const gradient_mask = n_gradients - 1
    const gradient_array_shader = []

    for (let i = 0; i < n_gradients; i++) {
        const phi = 2 * Math.PI * Math.random()
        const theta = Math.PI * Math.random()

        const sin_phi = Math.sin(phi)
        const cos_phi = Math.cos(phi)
        const sin_theta = Math.sin(theta)
        const cos_theta = Math.cos(theta)

        const x = sin_theta * cos_phi
        const y = sin_theta * sin_phi
        const z = cos_theta

        gradient_array_shader.push(`vec3f(${x}, ${y}, ${z})`)
    }

    const hash_table = generateHashTable()

    return /* wgsl */ `
        const hash_table = array<u32, ${hash_table.length}>(${hash_table});
        const gradients = array(${gradient_array_shader});

        fn get_gradient(x: u32, y: u32, z: u32) -> vec3f {
            let hash = hash_table[hash_table[hash_table[x] + y] + z];
            return gradients[hash & ${gradient_mask}];
        }

        fn fade(t: vec3f) -> vec3f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn lerp(t: f32, a: f32, b: f32) -> f32 {
            return a + t * (b - a);
        }

        fn noise(global_pos: vec3f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec3u(floor_pos) & vec3u(255, 255, 255);
            let p1 = (p0 + 1u) & vec3u(255, 255, 255);
            
            let grad_000 = get_gradient(p0.x, p0.y, p0.z);
            let grad_100 = get_gradient(p1.x, p0.y, p0.z);
            let grad_010 = get_gradient(p0.x, p1.y, p0.z);
            let grad_110 = get_gradient(p1.x, p1.y, p0.z);
            let grad_001 = get_gradient(p0.x, p0.y, p1.z);
            let grad_101 = get_gradient(p1.x, p0.y, p1.z);
            let grad_011 = get_gradient(p0.x, p1.y, p1.z);
            let grad_111 = get_gradient(p1.x, p1.y, p1.z);
            
            let local = global_pos - floor_pos;

            let a = dot(grad_000, local);
            let b = dot(grad_100, vec3f(local.x - 1, local.yz));
            let c = dot(grad_010, vec3f(local.x, local.y - 1, local.z));
            let d = dot(grad_110, vec3f(local.x - 1, local.y - 1, local.z));
            let e = dot(grad_001, vec3f(local.xy, local.z - 1));
            let f = dot(grad_101, vec3f(local.x - 1, local.y, local.z - 1));
            let g = dot(grad_011, vec3f(local.x, local.y - 1, local.z - 1));
            let h = dot(grad_111, vec3f(local.x - 1, local.y - 1, local.z - 1));

            let s = fade(local);
            
            return 1.55 * lerp(s.z,
                lerp(s.y, lerp(s.x, a, b), lerp(s.x, c, d)),
                lerp(s.y, lerp(s.x, e, f), lerp(s.x, g, h)),
            );
        }
    `
}
