import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import manifest from './gemma-model-manifest.json';

const MODEL_FILENAME = manifest.filename;
const PARTIAL_FILENAME = `${MODEL_FILENAME}.partial`;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Copies the APK-bundled Android asset into app-private storage, verifies it using
 * Expo FileSystem's native streaming SHA-256 implementation, then atomically renames it.
 */
export async function prepareGemmaModel(): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('On-device Gemma is currently supported in Android development and preview builds only.');
  }

  const modelDirectory = new Directory(Paths.document, 'models');
  modelDirectory.create({ intermediates: true, idempotent: true });

  const installed = new File(modelDirectory, MODEL_FILENAME);
  const partial = new File(modelDirectory, PARTIAL_FILENAME);
  if (installed.exists) {
    if (installed.size === manifest.bytes && (await installed.digest('SHA-256')) === manifest.sha256) {
      return installed.uri;
    }
    installed.delete();
  }

  // A partial file is never trusted after a process interruption.
  if (partial.exists) partial.delete();

  const bundledAsset = new File(`asset:///${MODEL_FILENAME}`);
  try {
    await bundledAsset.copy(partial);
  } catch (error) {
    if (partial.exists) partial.delete();
    throw new Error(`Bundled Gemma model asset could not be copied from this APK: ${errorMessage(error)}`);
  }

  try {
    if (partial.size !== manifest.bytes) {
      throw new Error(`Expected ${manifest.bytes} bytes, found ${partial.size ?? 'unknown'}.`);
    }
    const sha256 = await partial.digest('SHA-256');
    if (sha256 !== manifest.sha256) {
      throw new Error(`SHA-256 mismatch (expected ${manifest.sha256}, found ${sha256}).`);
    }
    // `rename` is a same-directory native rename on Android, so the final path only
    // becomes visible after both integrity checks pass.
    partial.rename(MODEL_FILENAME);
  } catch (error) {
    if (partial.exists) partial.delete();
    throw new Error(`Bundled Gemma model verification failed: ${errorMessage(error)}`);
  }

  return installed.uri;
}
