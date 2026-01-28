import { COLOR_PALETTES } from '@/utils/Colors'

export interface Example {
    name: string
    colors: string[]
    nStates: number
    updateRuleShader: string
}

export const examples: Example[] = [
    {
        name: 'Cyclic',
        colors: COLOR_PALETTES.get('Rainbow')!,
        nStates: 16,
        updateRuleShader: /* wgsl */ `const radius = 1;
const threshold = 1;
const shift_size = 1;

fn update_rule(pos: vec2u, 
               state: u32) -> u32 {
                
    let next_state = shift(
        state, shift_size
    );
    let c = count(
        pos, radius, next_state
    );
    if c >= threshold {
        return next_state;
    }
    return state;
}`,
    },
]
