export type NoiseAlgorithm =
    | 'Perlin'
    | 'Simplex'
    | 'Cubic'
    | 'Value'
    | 'Worley'
    | 'Worley (2nd closest)'

export type DomainTransform = 'None' | 'Rotate' | 'Warp' | 'Warp 2X'
export type NoiseDimension = '2D' | '3D' | '4D'

export interface NoiseSceneSetup {
    algorithm: NoiseAlgorithm
    dimension: NoiseDimension
    transform: DomainTransform
}

export interface NoiseUniforms {
    n_grid_columns?: number
    n_main_octaves?: number
    persistence?: number
    z_coord?: number
    w_coord?: number
    n_warp_octaves?: number
    warp_strength?: number
    color_points?: Float32Array<ArrayBuffer>
}
