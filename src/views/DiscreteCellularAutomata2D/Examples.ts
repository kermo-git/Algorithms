import { colorPalette } from '@/utils/Colors'

export interface Example {
    name: string
    update_shader: string
    n_states: number
    hex_colors: () => string[]
    skip_frames: boolean
}

function basic_cyclic_CA_shader(
    radius: number,
    threshold: number,
    shift_size: number,
    neighborhood: 'Moore' | 'Neumann'
) {
    return /* wgsl */ `const radius = ${radius};
const threshold = ${threshold};
const shift_size = ${shift_size};

fn update(pos: vec2u, state: u32) -> u32 {
    let c = ${neighborhood === 'Moore' ? 'moore_count' : 'neumann_count'}(
        pos, radius, shift(state, 1)
    );
    if c >= threshold {
        return shift(state, shift_size);
    }
    return state;
}`
}

function theta_cyclic_CA_shader(theta_expr: string) {
    return /* wgsl */ `
fn update(pos: vec2u, state: u32) -> u32 {
    let theta = ${theta_expr};
    let avg = neumann_avg(pos, 1);

    if f32(state) > avg - theta {
        return shift(state, -1);
    }
    return shift(u32(avg), 1);
}`
}

export const examples: Example[] = [
    {
        name: 'Rainbow',
        hex_colors: () => colorPalette('Rainbow'),
        n_states: 24,
        update_shader: basic_cyclic_CA_shader(1, 1, 1, 'Moore'),
        skip_frames: false
    },
    {
        name: 'Boiling',
        hex_colors: () => colorPalette('Funky'),
        n_states: 6,
        update_shader: basic_cyclic_CA_shader(2, 2, 1, 'Neumann'),
        skip_frames: false
    },
    {
        name: 'Roses',
        hex_colors: () => ['#4b0089', '#b55bff'],
        n_states: 24,
        update_shader: basic_cyclic_CA_shader(1, 1, 3, 'Moore'),
        skip_frames: false
    },
    {
        name: 'Cubism',
        hex_colors: () => ['#83DE08', '#9a53ff', '#f6fe4b'],
        n_states: 3,
        update_shader: basic_cyclic_CA_shader(2, 5, 1, 'Neumann'),
        skip_frames: false
    },
    {
        name: 'Lava meteorites',
        hex_colors: () => colorPalette('Lava'),
        n_states: 24,
        update_shader: /* wgsl */ `fn update(pos: vec2u, state: u32) -> u32 {
    let top_left = neighbor(pos, -2, -2);
    let bottom_right = neighbor(pos, 2, 2);

    if top_left > bottom_right {
        return shift(state, -1);
    }
    let avg = neumann_avg(pos, 2);
    return u32(ceil(avg));
}`,
        skip_frames: false
    },
    {
        name: 'Rain',
        hex_colors: () => ['#00bbff', '#003261'],
        n_states: 24,
        update_shader: theta_cyclic_CA_shader('f32(states.n / 24)'),
        skip_frames: false
    },
    {
        name: 'Maze',
        hex_colors: () => ['#FF0000', '#000000'],
        n_states: 24,
        update_shader: theta_cyclic_CA_shader('- f32(states.n / 12)'),
        skip_frames: true
    }
]
