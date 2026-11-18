# Gemma on Android

This integration uses `llama.rn` with Gemma 3 1B instruction-tuned Q4_K_M GGUF. It requires a Watt-Plan native Android build. Expo Go cannot perform local inference.

## Model artifact

- Repository: https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF
- Revision: `116f76234503685a98f572982177b11d44ec8ff1`
- Upstream filename: `google_gemma-3-1b-it-Q4_K_M.gguf`
- Bundled filename: `gemma-3-1b-it-Q4_K_M.gguf`
- Bytes: `806058496`
- SHA-256: `12bf0fff8815d5f73a3c9b586bd8fee8e7b248c935de70dec367679873d0f29d`

The local download was checked against this size and checksum. `scripts/prepare-gemma-model.cjs` streams the pinned download and verifies it. `plugins/withBundledGemma.js` runs preparation during Android prebuild, copies the file into native assets, and includes `licenses/` and `MODEL_NOTICES.md`. Models are excluded from Git and EAS uploads: EAS downloads the immutable artifact on the build worker. The installed app never downloads model weights.

The TypeScript loader uses Expo SDK 58 FileSystem to copy the `asset:///` APK resource into app-private storage. Expo performs the copy natively; `File.digest('SHA-256')` streams the temporary file through native code, so the 806 MB model is never buffered in JavaScript. The loader checks the exact byte count and pinned SHA-256 before a same-directory rename publishes the file, reuses a valid installed copy, and removes incomplete or corrupt files on retry. Only the model runtime remains native (`llama.rn`); Watt-Plan has no custom Kotlin module. Allow storage for both the installed asset and extracted copy, plus runtime memory.

## Build and launch

```sh
npx eas-cli@latest build --platform android --profile development
npx expo start --dev-client -c
```

Install the resulting development APK on an Android device before opening the Metro link. The shared provider checks connectivity for every call: confirmed offline goes directly to Gemma; online uses Groq 120B, Groq 20B, then Gemini. Unknown connectivity tries the cloud. Connectivity is checked again after a cloud provider fails. If no cloud key is configured or all cloud providers fail, the app tries on-device Gemma. To test offline, load the development bundle before disconnecting the internet, or use the standalone preview APK.

For a standalone APK with its JavaScript bundle:

```sh
npx eas-cli@latest build --platform android --profile preview
```

The preview APK needs no Metro connection. For cloud requests, add `EXPO_PUBLIC_GROQ_API_KEY` and/or `EXPO_PUBLIC_GEMINI_API_KEY` to the EAS `preview` environment before building; local `.env` and `.env.local` files are excluded from uploads. Without those EAS variables, the APK uses Gemma instead.

## Device acceptance record

Automated tests with a mocked runtime cannot establish real model accuracy, memory usage, or latency. Record the device model, Android version, RAM, APK build ID, preparation time, response time, and failures when doing these checks:

1. Load the development bundle, disconnect internet access, and inspect Metro for `[ai] interpret answered by on-device Gemma` and `[ai] explain answered by on-device Gemma`.
2. Starting with a target of 2500, send `From 2,500, gawin nating 2k yung target`. Confirm target 2000 and exactly one revision.
3. Send `Huwag bawasan yung ref` and `Unahin mong bawasan yung TV`. Check the saved appliance IDs selected.
4. Ask a bill question and verify the reply against the displayed appliance costs. The current shared interpreter supports keep, cut_first, set_target and set_min_hours; preview and reduce_hours are not supported in this branch.
5. Undo and confirm the previous target and plan are restored.
6. Install the preview APK, enable airplane mode before first launch, set up the household, and send the same commands.
7. Restart offline and confirm the extracted model is reusable.
8. Restore connectivity. Confirm normal Groq/Gemini routing on the next request.
9. Record initial preparation and subsequent completion times and any device failures. Do not treat simulated or mocked timings as device measurements.

Local interpretation and explanation both use Gemma through the shared provider. The app validates actions and numerical replies as it does for cloud responses. Invalid explanations still use the existing template fallback. The UI has no per-message provider label in this branch; Metro logs identify the provider. Local generation has no application output-token cap or wall-clock timeout, but its context window remains finite.

## Verification status

The TypeScript extraction path is covered by mocked FileSystem tests for valid reuse, interrupted-copy recovery, corrupt cached-file replacement, wrong-size and wrong-digest rejection, and a missing APK asset. These tests do not exercise an Android APK.

No EAS build was submitted for this TypeScript migration. Earlier development and preview APKs predate it and cannot verify the new loader. No actual-device inference, first-launch airplane-mode behavior, preparation time, response time, or memory use has been verified. Build and test the new Android code before relying on offline first launch.

Offline provider routing, connectivity loss/recovery, structured generation and incomplete-output rejection are covered by mocked tests. These do not establish real device latency or answer quality. The existing web color-scheme lint error is unrelated to this integration.
