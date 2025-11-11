/**
 * Build script for Mobile TD Wars server
 * Bundles TypeScript server code with dependencies using esbuild
 */
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/server.js',
  external: ['express', 'socket.io', 'cors'],
  tsconfig: 'tsconfig.json',
  sourcemap: true
});

console.log('✓ Server built successfully');
