import { noiseShader, ProceduralNoise } from '../NoiseUtils'

export function value2DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> values: array<f32>;

        fn get_value(x: i32, y: i32) -> f32 {
            let hash = hash_table[hash_table[x] + y];
            return values[hash];
        }

        fn fade(t: vec2f) -> vec2f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn noise(global_pos: vec2f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec2i(floor_pos) & vec2i(255, 255);
            let p1 = (p0 + 1i) & vec2i(255, 255);
            
            let a = get_value(p0.x, p0.y);
            let b = get_value(p1.x, p0.y);
            let c = get_value(p0.x, p1.y);
            let d = get_value(p1.x, p1.y);
            
            let local_pos = global_pos - floor_pos;
            let s = fade(local_pos);

            return mix(mix(a, b, s.x), mix(c, d, s.x), s.y);
        }
    `
}

export class Value2D extends ProceduralNoise {
    is_3D = false

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return new Float32Array(n).map(Math.random)
    }
    createShader(color_format: GPUTextureFormat): string {
        return `
            ${value2DShader()}
            ${noiseShader(false, color_format)}
        `
    }
}

export function value3DShader(): string {
    return /* wgsl */ `
        @group(1) @binding(0) var<storage> hash_table: array<i32>;
        @group(1) @binding(1) var<storage> values: array<f32>;

        fn get_value(x: i32, y: i32, z: i32) -> f32 {
            let hash = hash_table[hash_table[hash_table[x] + y] + z];
            return values[hash];
        }

        fn fade(t: vec3f) -> vec3f {
            return t * t * t * (t * (t * 6 - 15) + 10);
        }

        fn noise(global_pos: vec3f) -> f32 {
            let floor_pos = floor(global_pos);
            let p0 = vec3i(floor_pos) & vec3i(255, 255, 255);
            let p1 = (p0 + 1i) & vec3i(255, 255, 255);
            
            let a = get_value(p0.x, p0.y, p0.z);
            let b = get_value(p1.x, p0.y, p0.z);
            let c = get_value(p0.x, p1.y, p0.z);
            let d = get_value(p1.x, p1.y, p0.z);
            let e = get_value(p0.x, p0.y, p1.z);
            let f = get_value(p1.x, p0.y, p1.z);
            let g = get_value(p0.x, p1.y, p1.z);
            let h = get_value(p1.x, p1.y, p1.z);
            
            let local_pos = global_pos - floor_pos;
            let s = fade(local_pos);
            
            return mix(
                mix(mix(a, b, s.x), mix(c, d, s.x), s.y),
                mix(mix(e, f, s.x), mix(g, h, s.x), s.y),
                s.z
            );
        }
    `
}

export class Value3D extends ProceduralNoise {
    is_3D = true

    generateRandomElements(n: number): Float32Array<ArrayBuffer> {
        return new Float32Array(n).map(Math.random)
    }
    createShader(color_format: GPUTextureFormat): string {
        return `
            ${value3DShader()}
            ${noiseShader(true, color_format)}
        `
    }
}
