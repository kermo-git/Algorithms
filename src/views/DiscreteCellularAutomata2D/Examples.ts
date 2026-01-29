import { COLOR_PALETTES } from '@/utils/Colors'

export interface Example {
    name: string
    colors: string[]
    nStates: number
    updateShader: string
}

function cyclic_CA_shader(threshold: number, shift_size: number) {
    return /* wgsl */ `const radius = 1;
const threshold = ${threshold};
const shift_size = ${shift_size};

fn update(pos: vec2u, state: u32) -> u32 {
    let c = count(
        pos, radius, shift(state, 1)
    );
    if c >= threshold {
        return shift(state, shift_size);
    }
    return state;
}`
}

export const examples: Example[] = [
    {
        name: 'Rainbow',
        colors: COLOR_PALETTES.get('Rainbow')!,
        nStates: 24,
        updateShader: cyclic_CA_shader(1, 1),
    },
    {
        name: '313',
        colors: ['#235931', '#5ae07e'],
        nStates: 3,
        updateShader: cyclic_CA_shader(3, 1),
    },
    {
        name: 'Perfect',
        colors: ['#0C4B8A', '#1B94BF', '#24D6F2', '#B1F7FF'],
        nStates: 4,
        updateShader: cyclic_CA_shader(3, 1),
    },
    {
        name: 'Roses',
        colors: ['#4b0089', '#b55bff'],
        nStates: 24,
        updateShader: cyclic_CA_shader(1, 3),
    },
]
