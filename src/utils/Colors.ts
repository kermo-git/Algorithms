const COLOR_PALETTES = new Map<string, string[]>([
    [
        'Biomes',
        ['#8AC90A', '#129145', '#9ED6F2', '#ED9C1A', '#E5D96E', '#1730DB']
    ],
    [
        'Rainbow',
        [
            '#BE38F3',
            '#0061FF',
            '#00C7FC',
            '#00F900',
            '#F5EC00',
            '#FFAA00',
            '#FF4013'
        ]
    ],
    [
        'Ice & Fire',
        ['#0B90B7', '#00C7FC', '#94E3FE', '#FAB700', '#FF6A00', '#EA4F00']
    ],
    ['Lava', ['#FEC700', '#FF6A00', '#E32400', '#606060', '#444444']],
    ['Funky', ['#83DE08', '#7000DD', '#FB0D7A', '#FFF3E3']],
    ['Magic', ['#23A185', '#235DBE', '#EA93E4', '#D1E64B']]
])

export function getColorPaletteNames() {
    return COLOR_PALETTES.keys()
}
export function colorPalette(name: string) {
    return (COLOR_PALETTES.get(name) || ['#000000', '#FFFFFF']).slice()
}

export interface Color {
    red: number
    green: number
    blue: number
}

export const BLACK: Color = {
    red: 0,
    green: 0,
    blue: 0
}

export function colorToString(color: Color) {
    return `R: ${color.red.toFixed(2)}, G: ${color.green.toFixed(2)}, B: ${color.blue.toFixed(2)}`
}

export function parseHexColor(hex_color: string): Color {
    return {
        red: parseInt(hex_color.substring(1, 3), 16),
        green: parseInt(hex_color.substring(3, 5), 16),
        blue: parseInt(hex_color.substring(5, 7), 16)
    }
}

export function toHexColor(color: Color): string {
    let red_str = color.red.toString(16)
    if (red_str.length === 1) {
        red_str = `0${red_str}`
    }
    let green_str = color.green.toString(16)
    if (green_str.length === 1) {
        green_str = `0${green_str}`
    }
    let blue_str = color.blue.toString(16)
    if (blue_str.length === 1) {
        blue_str = `0${blue_str}`
    }
    return `#${red_str}${green_str}${blue_str}`
}

export function lerpColors(t: number, a: Color, b: Color): Color {
    return {
        red: Math.round(a.red + (b.red - a.red) * t),
        green: Math.round(a.green + (b.green - a.green) * t),
        blue: Math.round(a.blue + (b.blue - a.blue) * t)
    }
}

export function lerpColorArray(hex_colors: string[], n_colors: number) {
    const max_lerp_color = n_colors - 1
    const max_reference_color = hex_colors.length - 1

    if (max_lerp_color === max_reference_color) {
        return shaderColorArray(hex_colors)
    }

    const result = new Float32Array(4 * n_colors)

    function setColor(i: number, color: Color) {
        const offset = 4 * i
        result[offset] = color.red / 255
        result[offset + 1] = color.green / 255
        result[offset + 2] = color.blue / 255
        result[offset + 3] = 1
    }

    const parsed_colors = hex_colors.map(parseHexColor)
    setColor(0, parsed_colors[0])

    const index_factor = max_reference_color / max_lerp_color

    for (let i = 1; i < n_colors - 1; i++) {
        const float_index = i * index_factor

        const index_1 = Math.floor(float_index)
        const index_2 = Math.ceil(float_index)
        const lerp_point = float_index - index_1

        const color_1 = parsed_colors[index_1]
        const color_2 = parsed_colors[index_2]
        const color = lerpColors(lerp_point, color_1, color_2)

        setColor(i, color)
    }
    setColor(n_colors - 1, parsed_colors[max_reference_color])

    return result
}

export function shaderColorArray(hex_colors: string[]) {
    const result = new Float32Array(4 * hex_colors.length)

    for (let i = 0; i < hex_colors.length; i++) {
        const color = parseHexColor(hex_colors[i])
        const offset = 4 * i

        result[offset] = color.red / 255
        result[offset + 1] = color.green / 255
        result[offset + 2] = color.blue / 255
        result[offset + 3] = 1
    }
    return result
}
