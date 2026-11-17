const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { withDangerousMod } = require('@expo/config-plugins');

const MODEL_NAME = 'gemma-3-1b-it-Q4_K_M.gguf';

module.exports = function withBundledGemma(config) {
  return withDangerousMod(config, ['android', async (mod) => {
    const root = mod.modRequest.projectRoot;
    const source = path.join(root, 'models', MODEL_NAME);
    execFileSync(process.execPath, [path.join(root, 'scripts', 'prepare-gemma-model.cjs')], { cwd: root, stdio: 'inherit' });
    const assets = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets');
    fs.mkdirSync(assets, { recursive: true });
    fs.copyFileSync(source, path.join(assets, MODEL_NAME));
    fs.cpSync(path.join(root, 'licenses'), path.join(assets, 'licenses'), { recursive: true });
    fs.copyFileSync(path.join(root, 'MODEL_NOTICES.md'), path.join(assets, 'MODEL_NOTICES.md'));
    return mod;
  }]);
};
