export interface Example {
    name: string
    start_elevation_shader: string
    color_shader: string
}

export const examples: Example[] = [
    {
        name: 'Default',
        start_elevation_shader: /* wgsl */ `
            fn start_elevation(pos: vec2f) -> f32 {
                return simplex_3d_octaves(vec3f(pos.xy, 0), 5, 0.5);
            }
        `,
        color_shader: /* wgsl */ `
            fn color(surface_pos: vec3f) -> vec4f {
                return mix(surface_pos.z, vec4f(0, 0, 0, 1), vec4f(1, 1, 1, 1));
            }
        `,
    },
]
