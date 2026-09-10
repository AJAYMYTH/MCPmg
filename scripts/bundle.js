import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));

async function run() {
  console.log('Bundling MCPmg into standalone bundle...');
  await build({
    entryPoints: ['src/cli.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: 'dist/bundle.mjs',
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
    banner: {
      js: 'import { createRequire as __createRequire } from "module"; const require = __createRequire(process.execPath);',
    },
    plugins: [
      {
        name: 'empty-shims',
        setup(build) {
          build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
            path: 'react-devtools-core',
            namespace: 'empty-shim',
          }));
          build.onLoad({ filter: /.*/, namespace: 'empty-shim' }, () => ({
            contents: 'export default {};',
            loader: 'js',
          }));
        },
      },
    ],
  });
  console.log('Bundle created successfully at dist/bundle.mjs');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
