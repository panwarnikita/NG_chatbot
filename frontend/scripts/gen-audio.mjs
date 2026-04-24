// Pre-bake fixed phrases into WAV files so the frontend can play them
// instantly without waiting for the Piper WASM runtime to warm up.
//
// Prereqs (one-time, dev machine only):
//   pip install piper-tts
//   # or download a release binary from https://github.com/rhasspy/piper/releases
//   # and make sure `piper` is on your PATH.
//
// Run:
//   npm run gen-audio
//
// Output: frontend/public/audio/{key}_{lang}.wav  +  manifest.json
// Commit the generated files — they ship with the frontend bundle.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { staticPhrases, voiceModels } from '../src/constants/staticPhrases.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'public/audio');
const MODELS_DIR = resolve(ROOT, 'public/models');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const manifest = {};
let failed = 0;

for (const [key, byLang] of Object.entries(staticPhrases)) {
  manifest[key] = {};
  for (const [lang, text] of Object.entries(byLang)) {
    const modelName = voiceModels[lang];
    if (!modelName) {
      console.error(`✗ no voice model mapped for language "${lang}"`);
      failed++;
      continue;
    }

    const modelPath = resolve(MODELS_DIR, `${modelName}.onnx`);
    const configPath = resolve(MODELS_DIR, `${modelName}.json`);
    const outFile = resolve(OUT_DIR, `${key}_${lang}.wav`);

    if (!existsSync(modelPath) || !existsSync(configPath)) {
      console.error(`✗ missing model files for ${modelName} in ${MODELS_DIR}`);
      failed++;
      continue;
    }

    // piper-tts CLI ignores -c and derives config from `<model>.onnx.json`.
    // Create a symlink so it finds our config without renaming the real file
    // (the browser still loads `/models/<model>.json` directly).
    const piperExpectedConfig = resolve(MODELS_DIR, `${modelName}.onnx.json`);
    if (!existsSync(piperExpectedConfig)) {
      symlinkSync(`${modelName}.json`, piperExpectedConfig);
    }

    console.log(`[gen] ${key}_${lang}.wav  ← ${modelName}`);

    const result = spawnSync(
      'piper',
      ['-m', modelPath, '-c', configPath, '-f', outFile],
      { input: text, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] }
    );

    if (result.error?.code === 'ENOENT') {
      console.error('\n✗ `piper` CLI not found on PATH. Install it with `pip install piper-tts` or from https://github.com/rhasspy/piper/releases');
      process.exit(1);
    }
    if (result.status !== 0) {
      console.error(`✗ piper failed for ${key}_${lang} (exit ${result.status})`);
      failed++;
      continue;
    }

    manifest[key][lang] = { text, model: modelName, file: `${key}_${lang}.wav` };
  }
}

writeFileSync(resolve(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

if (failed > 0) {
  console.error(`\n✗ ${failed} clip(s) failed.`);
  process.exit(1);
}
console.log(`\n✔ generated ${Object.values(manifest).reduce((n, v) => n + Object.keys(v).length, 0)} clips in public/audio/`);
