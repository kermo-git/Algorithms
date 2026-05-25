import { parseHexColor } from '@/utils/Colors'

export interface Example {
    name: string
    elevation_shader: string
    color_shader: string
}

function terrainColorShader(
    bottom_color: string,
    bottom_color_end: number,
    top_color: string,
    top_color_start: number,
) {
    function hexColorToWGSL(hex: string) {
        const { red, green, blue } = parseHexColor(hex)

        const red_norm = (red / 255).toFixed(2)
        const green_norm = (green / 255).toFixed(2)
        const blue_norm = (blue / 255).toFixed(2)

        return `vec4f(${red_norm}, ${green_norm}, ${blue_norm}, 1)`
    }

    return /* wgsl */ `fn color(pos: vec3f, 
         gradient: vec2f) -> vec4f {
    const PI = radians(180);

    const bottom_color = ${hexColorToWGSL(bottom_color)};
    const top_color = ${hexColorToWGSL(top_color)};
    const cliff = vec4f(0.5, 0.5, 0.5, 1);
    const up = vec3f(0, 0, 1);

    const bottom_color_end = ${bottom_color_end};
    const top_color_start = ${top_color_start};

    const level_end = 0.28*PI;
    const steep_start = 0.32*PI;

    let normal = normalize(
        vec3f(-gradient.xy, 1)
    );

    var ground_cover = bottom_color;
    
    if pos.z > top_color_start {
        ground_cover = top_color;
    } else if pos.z > bottom_color_end {
        ground_cover = mix(
            bottom_color, top_color,
            (pos.z - bottom_color_end)/(
             top_color_start - bottom_color_end)
        );
    }

    let tilt = acos(dot(normal, up));
    var result = ground_cover;

    if tilt > steep_start {
        result = cliff;
    } else if tilt > level_end {
        result = mix(
            ground_cover, cliff,
            (tilt - level_end)/(
             steep_start - level_end)
        );
    }
    return result;
}`
}

export const examples: Example[] = [
    {
        name: 'Mountains',
        elevation_shader: /* wgsl */ `fn elevation(pos: vec2f) -> f32 {
    const warp_1_channel = 0;
    const warp_2_channel = 1;
    const warp_1_octaves = 5;
    const warp_2_octaves = 5;
    const warp_scale = vec3f(0.7);
    const warp_persistence = 0.4;
    const warp_strength = 0.3;

    const noise_channel = 2;
    const noise_octaves = 1;
    const noise_persistence = 0.5;

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
        color_shader: terrainColorShader('#15b342', 0.58, '#FFFFFF', 0.62),
    },

    {
        name: 'Canyons',
        elevation_shader: /* wgsl */ `fn elevation(pos: vec2f) -> f32 {
    const warp_channel = 0;
    const warp_scale = 1;
    const warp_octaves = 4;
    const warp_persistence = 0.5;
    const warp_strength = 0.1;

    const valley_depth = 0.5;
    const valley_channel = 1;

    const hills_scale = 0.2;
    const hills_channel = 14;
    const hills_octaves = 4;
    const hills_persistence = 0.5;

    let valley_warp = perlin_2d_octaves(
        pos*warp_scale, 
        warp_channel,
        warp_octaves, 
        warp_persistence
    );

    let warp_dir = unit_vector_2d(
        valley_warp
    );

    let floor = perlin_2d_octaves(
        pos*hills_scale, 
        hills_channel, 
        hills_octaves,
        hills_persistence
    );

    return min(
        valley_depth + 0.3*floor,
        1.2*floor + smoothstep(0, 0.8, abs(
            perlin_2d(
            pos + warp_strength * warp_dir,
            valley_channel
            )*2 - 1
        ))
    );
}`,
        color_shader: terrainColorShader('#C49A1A', 0.56, '#15b342', 0.6),
    },
]
