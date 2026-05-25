import * as esbuild from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

await esbuild.build({
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/index.cjs'),
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  sourcemap: false,
  minify: false,
  external: [],
})

console.log('Build complete: dist/index.cjs')
