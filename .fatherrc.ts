import { defineConfig } from 'father';

export default defineConfig({
  esm: {},
  umd: {
    output: 'dist/umd',
    name: 'DOMHelpers',
    sourcemap: false,
  },
});
