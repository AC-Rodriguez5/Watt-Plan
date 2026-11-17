import { Platform } from 'react-native';

import manifest from '../gemma-model-manifest.json';
import { prepareGemmaModel } from '../gemma-model';

jest.mock('expo-file-system', () => {
  const files = new Map<string, { size: number; digest: string }>();
  const uriOf = (value: unknown): string => typeof value === 'string' ? value : (value as { uri: string }).uri;
  const join = (base: string, name: string) => `${base.replace(/\/$/, '')}/${name.replace(/^\//, '')}`;
  const resolve = (parts: unknown[]) => parts.slice(1).reduce<string>((uri, part) => join(uri, uriOf(part)), uriOf(parts[0]));
  class Directory {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = resolve(parts); }
    create() {}
  }
  class File {
    uri: string;
    constructor(...parts: unknown[]) { this.uri = resolve(parts); }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri)?.size ?? null; }
    async digest() {
      const record = files.get(this.uri);
      if (!record) throw new Error('file missing');
      return record.digest;
    }
    async copy(destination: File) {
      const record = files.get(this.uri);
      if (!record) throw new Error(`asset missing: ${this.uri}`);
      files.set(destination.uri, { ...record });
    }
    rename(name: string) {
      const destination = join(this.uri.slice(0, this.uri.lastIndexOf('/')), name);
      const record = files.get(this.uri);
      if (!record) throw new Error('partial missing');
      files.set(destination, record);
      files.delete(this.uri);
      this.uri = destination;
    }
    delete() { files.delete(this.uri); }
  }
  return {
    File,
    Directory,
    Paths: { document: { uri: 'file:///app/documents' }, bundle: { uri: 'asset:///' } },
    __files: files,
  };
});

const files = (jest.requireMock('expo-file-system') as { __files: Map<string, { size: number; digest: string }> }).__files;
const installedUri = `file:///app/documents/models/${manifest.filename}`;
const partialUri = `${installedUri}.partial`;
const assetUri = `asset:///${manifest.filename}`;
const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

beforeAll(() => Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' }));
afterAll(() => {
  if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
});

beforeEach(() => {
  files.clear();
  files.set(assetUri, { size: manifest.bytes, digest: manifest.sha256 });
});

it('copies the bundled asset natively, verifies size and SHA-256, and publishes it', async () => {
  await expect(prepareGemmaModel()).resolves.toBe(installedUri);
  expect(files.get(installedUri)).toEqual({ size: manifest.bytes, digest: manifest.sha256 });
  expect(files.has(partialUri)).toBe(false);
});

it('reuses an already verified installation without copying the asset', async () => {
  files.set(installedUri, { size: manifest.bytes, digest: manifest.sha256 });
  files.delete(assetUri);
  await expect(prepareGemmaModel()).resolves.toBe(installedUri);
  expect(files.has(partialUri)).toBe(false);
});

it('repairs a corrupted installed model by recopying the verified bundled asset', async () => {
  files.set(installedUri, { size: manifest.bytes, digest: 'corrupt' });
  await expect(prepareGemmaModel()).resolves.toBe(installedUri);
  expect(files.get(installedUri)?.digest).toBe(manifest.sha256);
  expect(files.has(partialUri)).toBe(false);
});

it('deletes an interrupted partial file before restarting extraction', async () => {
  files.set(partialUri, { size: 123, digest: 'incomplete' });
  await expect(prepareGemmaModel()).resolves.toBe(installedUri);
  expect(files.get(installedUri)?.digest).toBe(manifest.sha256);
  expect(files.has(partialUri)).toBe(false);
});

it.each([
  ['wrong size', { size: manifest.bytes - 1, digest: manifest.sha256 }],
  ['wrong SHA-256', { size: manifest.bytes, digest: '0'.repeat(64) }],
])('rejects a bundled file with %s without publishing it', async (_label, content) => {
  files.set(assetUri, content);
  await expect(prepareGemmaModel()).rejects.toThrow('Bundled Gemma model verification failed');
  expect(files.has(installedUri)).toBe(false);
  expect(files.has(partialUri)).toBe(false);
});

it('reports a missing bundled APK asset as an actionable extraction error', async () => {
  files.delete(assetUri);
  await expect(prepareGemmaModel()).rejects.toThrow('Bundled Gemma model asset could not be copied from this APK');
  expect(files.has(installedUri)).toBe(false);
});
