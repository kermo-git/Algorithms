export interface Vec2 {
    x: number
    y: number
}

export interface Vec3 {
    x: number
    y: number
    z: number
}

export function add2D(a: Vec2, b: Vec2): Vec2 {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
    }
}

export function add3D(a: Vec3, b: Vec3): Vec3 {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z,
    }
}

export function subtract2D(a: Vec2, b: Vec2): Vec2 {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
    }
}

export function subtract3D(a: Vec3, b: Vec3): Vec3 {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
    }
}

export function dot2D(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y
}

export function dot3D(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z
}
