/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}
