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
    let pos_3d = vec3f(pos.xy, 0);
    const noise_channel = 0;
    const n_octaves = 5;
    const persistence = 0.5;

    return simplex_3d_octaves(
        pos_3d, noise_channel, n_octaves, persistence
    );
}`,
        color_shader: /* wgsl */ `
fn terrain_color(surface_pos: vec3f) -> vec4f {
    return mix(
        vec4f(0, 0, 0, 1), vec4f(1, 1, 1, 1),
        surface_pos.z
    );
}`,
    },
]
