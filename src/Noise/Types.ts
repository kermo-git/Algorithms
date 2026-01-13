export type NoiseAlgorithm =
    | 'Perlin'
    | 'Simplex'
    | 'Cubic'
    | 'Value'
    | 'Worley'
    | 'Worley (2nd closest)'

export type DomainTransform = 'None' | 'Rotate' | 'Warp' | 'Warp 2X'
export type NoiseDimension = '2D' | '3D' | '4D'
