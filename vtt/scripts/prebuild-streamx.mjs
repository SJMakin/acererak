#!/usr/bin/env node
/**
 * Pre-build script to convert streamx (CommonJS) to ESM using esbuild.
 * This bypasses Rollup's problematic CommonJS handling.
 */
import * as esbuild from 'esbuild';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

async function buildStreamxESM() {
  console.log('Pre-building streamx as ESM...');

  try {
    // Bundle streamx with all its dependencies into a single ESM file
    const result = await esbuild.build({
      entryPoints: [join(projectRoot, 'node_modules/streamx/index.js')],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      write: false,
      minify: false,
      // Handle Node.js built-ins that streamx might reference
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      // Inject browser-compatible polyfills
      inject: [],
      // External modules that should not be bundled
      external: [],
    });

    let code = result.outputFiles[0].text;

    // esbuild creates a default export from the CommonJS module.exports
    // We need to add named re-exports for libraries that import { Duplex } from 'streamx'
    const namedExports = `
// Named exports re-exported from default export for ESM compatibility
const _streamx = require_index();
export const {
  pipeline,
  pipelinePromise,
  isStream,
  isStreamx,
  isEnded,
  isFinished,
  isDisturbed,
  getStreamError,
  Stream,
  Writable,
  Readable,
  Duplex,
  Transform,
  PassThrough
} = _streamx;
`;

    // Replace the simple default export with named exports
    code = code.replace(
      'export default require_index();',
      namedExports + '\nexport default _streamx;'
    );

    // Create the output directory if it doesn't exist
    const outputDir = join(projectRoot, 'src/lib');
    mkdirSync(outputDir, { recursive: true });

    // Write the ESM bundle
    const outputPath = join(outputDir, 'streamx.esm.js');
    writeFileSync(outputPath, code);

    console.log(`✓ Successfully pre-built streamx to ${outputPath}`);
    console.log(`  Bundle size: ${(code.length / 1024).toFixed(2)} KB`);

  } catch (error) {
    console.error('Failed to pre-build streamx:', error);
    process.exit(1);
  }
}

buildStreamxESM();
