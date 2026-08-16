import { colorPalette } from '@/utils/Colors'

export interface Example {
    name: string
    colors: () => string[]
    nStates: number
    updateShader: string
    skipFrames: boolean
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
        colors: () => colorPalette('Rainbow'),
        nStates: 24,
        updateShader: basic_cyclic_CA_shader(1, 1, 1, 'Moore'),
        skipFrames: false
    },
    {
        name: 'Boiling',
        colors: () => colorPalette('Funky'),
        nStates: 6,
        updateShader: basic_cyclic_CA_shader(2, 2, 1, 'Neumann'),
        skipFrames: false
    },
    {
        name: 'Roses',
        colors: () => ['#4b0089', '#b55bff'],
        nStates: 24,
        updateShader: basic_cyclic_CA_shader(1, 1, 3, 'Moore'),
        skipFrames: false
    },
    {
        name: 'Cubism',
        colors: () => ['#83DE08', '#9a53ff', '#f6fe4b'],
        nStates: 3,
        updateShader: basic_cyclic_CA_shader(2, 5, 1, 'Neumann'),
        skipFrames: false
    },
    {
        name: 'Lava meteorites',
        colors: () => colorPalette('Lava'),
        nStates: 24,
        updateShader: /* wgsl */ `fn update(pos: vec2u, state: u32) -> u32 {
    let top_left = neighbor(pos, -2, -2);
    let bottom_right = neighbor(pos, 2, 2);

    if top_left > bottom_right {
        return shift(state, -1);
    }
    let avg = neumann_avg(pos, 2);
    return u32(ceil(avg));
}`,
        skipFrames: false
    },
    {
        name: 'Rain',
        colors: () => ['#00bbff', '#003261'],
        nStates: 24,
        updateShader: theta_cyclic_CA_shader('f32(n_states / 24)'),
        skipFrames: false
    },
    {
        name: 'Maze',
        colors: () => ['#FF0000', '#000000'],
        nStates: 24,
        updateShader: theta_cyclic_CA_shader('- f32(n_states / 12)'),
        skipFrames: true
    }
]
