export interface Example {
    name: string
    elevation_shader: string
    color_shader: string
}

export const examples: Example[] = [
    {
        name: 'Default',
        elevation_shader: /* wgsl */ `fn elevation(pos: vec2f) -> f32 {
    const warp_1_channel = 0;
    const warp_2_channel = 1;
    const warp_1_octaves = 2;
    const warp_2_octaves = 4;
    const warp_scale = vec3f(0.9, 0.9, 1);
    const warp_persistence = 0.5;
    const warp_strength = 0.1;

    const noise_channel = 2;
    const noise_octaves = 3;
    const noise_persistence = 0.3;

    let pos_3d = vec3f(pos, 0);

    let warp_1 = simplex_3d_octaves(
        warp_scale*pos_3d, 
        warp_1_channel,
        warp_1_octaves,
        warp_persistence
    );
    let warp_2 = simplex_3d_octaves(
        warp_scale*pos_3d, 
        warp_2_channel,
        warp_2_octaves,
        warp_persistence
    );
    let warp_dir = unit_vector_3d(
        warp_1, warp_2
    );

    return simplex_3d_octaves(
        pos_3d + warp_strength * warp_dir,
        noise_channel, 
        noise_octaves, 
        noise_persistence
    );
}`,
        color_shader: /* wgsl */ `fn color(pos: vec3f, 
         gradient: vec2f) -> vec4f {
    const PI = radians(180);

    const snow = vec4f(1);
    const grass = vec4f(
        0, 0.7, 0.1, 1
    );
    const stone = vec4f(
        0.5, 0.5, 0.5, 1
    );
    const up = vec3f(0, 0, 1);

    const grass_end = 0.58;
    const snow_start = 0.62;

    const level_end = 0.28*PI;
    const steep_start = 0.32*PI;

    let normal = normalize(
        vec3f(-gradient.xy, 1)
    );
    let light = normalize(
        vec3f(0, 0.5, 1)
    );
    let light_level = dot(normal, light);

    var ground_cover = grass;
    
    if pos.z > snow_start {
        ground_cover = snow;
    } else if pos.z > grass_end {
        ground_cover = mix(
            grass, snow,
            (pos.z - grass_end)/(
             snow_start - grass_end)
        );
    }

    let tilt = acos(dot(normal, up));
    var ground_color = ground_cover;

    if tilt > steep_start {
        ground_color = stone;
    } else if tilt > level_end {
        ground_color = mix(
            ground_cover, stone,
            (tilt - level_end)/(
             steep_start - level_end)
        );
    }
    return ground_color * light_level;
}`,
    },
]
