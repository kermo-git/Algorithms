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

export function toShaderBuffer(hex_colors: string[]): Float32Array<ArrayBuffer> {
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
