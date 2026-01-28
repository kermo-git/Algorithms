export const COLOR_PALETTES = new Map<string, string[]>([
    ['Biomes', ['#8AC90A', '#129145', '#9ED6F2', '#ED9C1A', '#E5D96E', '#1730DB']],
    ['Rainbow', ['#BE38F3', '#0061FF', '#00C7FC', '#00F900', '#F5EC00', '#FFAA00', '#FF4013']],
    ['Ice & Fire', ['#0B90B7', '#00C7FC', '#94E3FE', '#FAB700', '#FF6A00', '#EA4F00']],
    ['Lava', ['#FEC700', '#FF6A00', '#E32400', '#606060', '#444444']],
])

export interface Color {
    red: number
    green: number
    blue: number
}

export const BLACK: Color = {
    red: 0,
    green: 0,
    blue: 0,
}

export function colorToString(color: Color) {
    return `R: ${color.red.toFixed(2)}, G: ${color.green.toFixed(2)}, B: ${color.blue.toFixed(2)}`
}

export function parseHexColor(hex_color: string): Color {
    return {
        red: parseInt(hex_color.substring(1, 3), 16),
        green: parseInt(hex_color.substring(3, 5), 16),
        blue: parseInt(hex_color.substring(5, 7), 16),
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
        blue: Math.round(a.blue + (b.blue - a.blue) * t),
    }
}

export function lerpColorArray(color_points: string[], n_colors: number): string[] {
    const max_color = n_colors - 1
    const max_color_point = color_points.length - 1

    if (max_color === max_color_point) {
        return color_points
    }
    const result = [color_points[0]]
    const index_factor = max_color_point / max_color

    for (let i = 1; i < n_colors - 1; i++) {
        const float_index = i * index_factor

        const index_1 = Math.floor(float_index)
        const index_2 = Math.ceil(float_index)
        const lerp_point = float_index - index_1

        const color_1 = parseHexColor(color_points[index_1])
        const color_2 = parseHexColor(color_points[index_2])

        const color = lerpColors(lerp_point, color_1, color_2)
        result.push(toHexColor(color))
    }
    result.push(color_points[max_color_point])

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
