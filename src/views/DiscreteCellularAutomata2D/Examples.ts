import { COLOR_PALETTES } from '@/utils/Colors'

export interface Example {
    name: string
    colors: string[]
    nStates: number
    updateShader: string
    skipFrames: boolean
}

function basic_cyclic_CA_shader(threshold: number, shift_size: number) {
    return /* wgsl */ `const radius = 1;
const threshold = ${threshold};
const shift_size = ${shift_size};

fn update(pos: vec2u, state: u32) -> u32 {
    let c = moore_count(
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
        colors: COLOR_PALETTES.get('Rainbow')!,
        nStates: 24,
        updateShader: basic_cyclic_CA_shader(1, 1),
        skipFrames: false
    },
    {
        name: '313',
        colors: ['#235931', '#5ae07e'],
        nStates: 3,
        updateShader: basic_cyclic_CA_shader(3, 1),
        skipFrames: false
    },
    {
        name: 'Roses',
        colors: ['#4b0089', '#b55bff'],
        nStates: 24,
        updateShader: basic_cyclic_CA_shader(1, 3),
        skipFrames: false
    },
    {
        name: 'Lava meteorites',
        colors: COLOR_PALETTES.get('Lava')!,
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
        colors: ['#00bbff', '#003261'],
        nStates: 24,
        updateShader: theta_cyclic_CA_shader('f32(n_states / 24)'),
        skipFrames: false
    },
    {
        name: 'Maze',
        colors: ['#FF0000', '#000000'],
        nStates: 24,
        updateShader: theta_cyclic_CA_shader('- f32(n_states / 12)'),
        skipFrames: true
    }
]
