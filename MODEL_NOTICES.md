# Model and runtime notices

The app bundles a quantized derivative of Google's Gemma 3 1B IT model.

- Source repository: [bartowski/google_gemma-3-1b-it-GGUF](https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF)
- Source model card: [google/gemma-3-1b-it](https://huggingface.co/google/gemma-3-1b-it)
- Model license: Google's [Gemma Terms of Use](https://ai.google.dev/gemma/terms)
- Quantized file and immutable source revision: `google_gemma-3-1b-it-Q4_K_M.gguf`, revision `116f76234503685a98f572982177b11d44ec8ff1`.
- The installer verifies the pinned file size and SHA-256 from `src/ai/gemma-model-manifest.json` before native build inclusion.
- `llama.rn` is distributed under the MIT License; see its installed package `LICENSE`.

The complete Gemma Terms, incorporated use policy, required NOTICE, and llama.rn MIT license are in `licenses/` and are copied into native Android assets.

The GGUF is excluded from Git and EAS uploads. Android prebuild runs the pinned download script, verifies its size and SHA-256, then copies the model into the APK. This network request runs on the build machine, never on first launch.
