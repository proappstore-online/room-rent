import 'vite-plugin-pwa';

declare module 'vite-plugin-pwa' {
  interface ManifestOptions {
    min_viewport_width?: number;
  }
}
