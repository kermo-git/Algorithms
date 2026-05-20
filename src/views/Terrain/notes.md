# WebGPU tekstuurid

## Valikulised featuurid

```JS
adapter.requestDevice({
    requiredFeatures: ['float32-filterable'],
})
```

## Tekstuur

```JS
const texture = device.createTexture({
    format: "rgba32float", // vec4f iga piksli sees.
    dimension: "2d", // 2-mõõtmeline tekstuur või 2-mõõtmeliste tekstuuride massiiv.
    // Mõõtmed
    size: {
        width: 1024,
        height: 1024,
        // tekstuuride arv massiivis (kui dimension on "2d")
        // või kolmas mõõde (kui dimension on "3d")
        depthOrArrayLayers: 4
    },
    usage:
        // Tekstuuri sisse saab shader'is kirjutada
        GPUTextureUsage.STORAGE_BINDING |
        // Tekstuuri saab shader'is samplida
        GPUTextureUsage.TEXTURE_BINDING
})
```

## Sampler

```JS
const texture = device.createSampler({
    // Kui koordinaadid lähevad piiridest välja.
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge"

})
```
