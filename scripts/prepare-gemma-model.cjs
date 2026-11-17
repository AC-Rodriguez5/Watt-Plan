const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { Transform } = require('node:stream');

const REPO = 'bartowski/google_gemma-3-1b-it-GGUF';
const REVISION = '116f76234503685a98f572982177b11d44ec8ff1';
const SOURCE_NAME = 'google_gemma-3-1b-it-Q4_K_M.gguf';
const MODEL_NAME = 'gemma-3-1b-it-Q4_K_M.gguf';
const SIZE = 806058496;
const SHA256 = '12bf0fff8815d5f73a3c9b586bd8fee8e7b248c935de70dec367679873d0f29d';
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'models');
const destination = path.join(directory, MODEL_NAME);
const partial = `${destination}.partial`;

async function run() {
  await fs.promises.mkdir(directory, { recursive: true });
  if (fs.existsSync(destination)) {
    const stat = await fs.promises.stat(destination);
    if (stat.size === SIZE && await hashFile(destination) === SHA256) return;
  }
  await fs.promises.rm(partial, { force: true });
  const url = `https://huggingface.co/${REPO}/resolve/${REVISION}/${SOURCE_NAME}?download=true`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`Gemma model download failed: HTTP ${response.status}. If this repo requires license acceptance, authenticate and download manually.`);
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  const meter = new Transform({ transform(chunk, encoding, callback) {
    bytes += chunk.length;
    digest.update(chunk);
    callback(null, chunk);
  } });
  try {
    await pipeline(response.body, meter, fs.createWriteStream(partial));
  } catch (error) {
    await fs.promises.rm(partial, { force: true });
    throw error;
  }
  const actual = digest.digest('hex');
  if (bytes !== SIZE || actual !== SHA256) {
    await fs.promises.rm(partial, { force: true });
    throw new Error(`Gemma model verification failed (bytes=${bytes}, sha256=${actual})`);
  }
  await fs.promises.rm(destination, { force: true });
  await fs.promises.rename(partial, destination);
  console.log(`Prepared ${MODEL_NAME} (${bytes} bytes; SHA-256 verified).`);
}

async function hashFile(filePath) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
