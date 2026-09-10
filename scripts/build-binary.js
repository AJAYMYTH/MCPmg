import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distBin = path.join(root, 'dist', 'bin');

if (!fs.existsSync(distBin)) {
  fs.mkdirSync(distBin, { recursive: true });
}

// Ensure dist/entry.cjs exists
const entryCjsPath = path.join(root, 'dist', 'entry.cjs');
fs.writeFileSync(
  entryCjsPath,
  `const { getAsset } = require('node:sea');\n` +
  `const code = getAsset('bundle.mjs', 'utf8');\n` +
  `const b64 = Buffer.from(code).toString('base64');\n` +
  `import('data:text/javascript;base64,' + b64);\n`
);

// Ensure sea-config.json exists
const seaConfigPath = path.join(root, 'sea-config.json');
fs.writeFileSync(
  seaConfigPath,
  JSON.stringify(
    {
      main: 'dist/entry.cjs',
      output: 'dist/sea-prep.blob',
      disableExperimentalSEAWarning: true,
      assets: {
        'bundle.mjs': 'dist/bundle.mjs',
      },
    },
    null,
    2
  )
);

console.log('Step 1: Generating SEA preparation blob...');
const blobGen = spawnSync(process.execPath, ['--experimental-sea-config', 'sea-config.json'], {
  cwd: root,
  stdio: 'inherit',
});
if (blobGen.status !== 0) {
  console.error('Failed to generate SEA blob');
  process.exit(1);
}

const isWin = process.platform === 'win32';
const targetName = isWin ? 'mcpmg.exe' : 'mcpmg';
const targetPath = path.join(distBin, targetName);

console.log(`Step 2: Copying ${process.execPath} to ${targetPath}...`);
fs.copyFileSync(process.execPath, targetPath);

if (process.platform === 'darwin') {
  console.log('Stripping macOS signature before injection...');
  spawnSync('codesign', ['--remove-signature', targetPath], { stdio: 'inherit' });
}

console.log('Step 3: Injecting SEA blob using postject...');
const postjectBin = isWin ? 'npx.cmd' : 'npx';
const postjectArgs = [
  'postject',
  targetPath,
  'NODE_SEA_BLOB',
  path.join(root, 'dist', 'sea-prep.blob'),
  '--sentinel-fuse',
  'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  '--overwrite',
];

if (process.platform === 'darwin') {
  postjectArgs.push('--macho-segment-name', 'NODE_SEA');
}

const inject = spawnSync(postjectBin, postjectArgs, {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});

if (inject.status !== 0) {
  console.error('Failed to inject SEA blob');
  process.exit(1);
}

if (process.platform === 'darwin') {
  console.log('Re-signing macOS binary with ad-hoc signature...');
  spawnSync('codesign', ['--sign', '-', targetPath], { stdio: 'inherit' });
}

if (!isWin) {
  fs.chmodSync(targetPath, 0o755);
}

console.log(`\nSuccess! Standalone binary generated at: ${targetPath}`);
