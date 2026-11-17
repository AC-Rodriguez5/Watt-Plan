# Watt Plan

A budget-first electricity planner for Filipino households. Instead of showing what you spent, Watt Plan starts from what you *want* to spend: set a target monthly bill, and the app works out which appliances to cut, and by how many hours a day, to get there.

Android-only, built with Expo (React Native, TypeScript, Expo Router).

## How it works

1. **Add your appliances** (name, wattage, hours per day, days per week, category).
2. **Enter your last bill** (kWh and billing period) in Bill settings. The app calibrates its appliance estimates to your real consumption.
3. **Set a target bill** in pesos (₱).
4. **Get a plan.** The optimizer cuts luxury appliances first (down to zero if needed), then flexible, then essential ones, never below an appliance's minimum hours per day. It shows the resulting bill, the savings, and whether the target is reachable.
5. **Refine it by chatting.** In Plan chat, say things like "keep the aircon" or "change my target to ₱2,500". The AI turns your message into a structured action; the optimizer recomputes the plan.

### Plan strategies

- **Fewest changes**: reach the target by touching as few appliances as possible.
- **Comfort first**: spread smaller cuts across appliances to protect the ones you value.

### Appliance categories

`essential`, `flexible`, `luxury`. Cuts happen in the order luxury, flexible, essential. Appliances you ask to "cut first" in chat go before all categories; ones you ask to "keep" are never cut.

## Screens

| Area | Screens |
| --- | --- |
| Bottom tabs | Home, Appliances, Plan |
| Pushed screens | Bill settings, Plan chat, Target edit |
| Bottom sheets | Add appliance, Edit appliance |

Layouts follow the mockups in `design/screens/`. Colors, type, and spacing live in one shared theme file (`src/constants/theme.ts`), documented in `design/DESIGN.md`.

## Architecture

The core rule: **the AI never computes numbers.** All money and kWh math is plain, deterministic TypeScript.

| Path | Responsibility |
| --- | --- |
| `src/optimizer/` | Pure TypeScript, no AI, no network. Appliance kWh and cost, bill calibration, the Meralco bill formula, the plan optimizer, applying chat actions to plan inputs. |
| `src/ai/` | Calls a hosted LLM (Groq, then Gemini) to (1) interpret a user message into a constrained JSON action and (2) explain a plan change in a sentence or two. Model output is validated in code before anything is applied. |
| `src/store/` | One shared Zustand store, so Home, Plan, and Plan chat always show the same plan. Household data is persisted with AsyncStorage; plan and baseline are recomputed on launch. |
| `src/config/meralco-rates.ts` | Every Meralco rate, charge, and tax value in one file. When new rates are published, update the numbers and `asOf` here and nothing else. |
| `src/types/` | Shared domain types (`Appliance`, `BillSettings`, `Plan`, chat types). |
| `src/app/` | Expo Router routes (file-based). |
| `src/components/`, `src/utils/`, `src/hooks/` | UI components, formatting/search helpers, hooks. |
| `design/` | Screen mockups (`screens/`), design tokens (`DESIGN.md`), reference HTML (`html/`), and the Meralco formula spec (`FORMULAMERALCO.txt`). |

### Pricing

- **Meralco mode** (default): the bill is computed with the Meralco residential formula (generation, transmission, system loss, tiered distribution, senior/lifeline lines, universal charges, FiT-All, GEA-All, and VAT). Rates are currently set to the November 2026 values.
- **Custom mode**: for other utilities, a single effective ₱ per kWh (entered, or derived from last bill total / last bill kWh).

Each appliance's kWh is scaled by one calibration factor (billed kWh ÷ summed appliance kWh when the bill settings were saved). Cutting hours lowers total kWh, and the saving is the bill before minus the bill after, split by each appliance's share of the cut.

### AI layer

Chat messages map to one of these actions: `keep`, `cut_first`, `set_target`, `set_min_hours`, `question`, `none`. The model returns JSON against a schema; `src/ai/interpret.ts` checks the action, appliance IDs, and number ranges before the optimizer applies it. If the model is unreachable (no key, no network, timeout), the chat shows an unavailable state and the plan itself is unaffected.

Models are tried in this order (`src/ai/llm.ts`): Groq `openai/gpt-oss-120b`, Groq `openai/gpt-oss-20b`, then Gemini `gemini-3.5-flash-lite` (Interactions API), then the local template. A 429 (or any other 4xx, or an empty answer) moves to the next model at once; a 5xx, timeout or network failure is retried once first. Each attempt has an 8-second timeout, and a model whose key is not set is skipped. Calls use the lowest reasoning effort and read only the final answer (`message.content` on Groq), never the reasoning. The console logs which provider and model answered, never a key.

## Getting started

### Prerequisites

- Node.js and npm
- An Android device or emulator (Expo Go works for quick tries; a [development build](https://docs.expo.dev/develop/development-builds/introduction/) is needed if you add native modules)
- A free [Groq API key](https://console.groq.com/keys) and/or a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) (only needed for Plan chat)

### Setup

```bash
npm install
cp .env.example .env     # then set EXPO_PUBLIC_GROQ_API_KEY and/or EXPO_PUBLIC_GEMINI_API_KEY in .env
npx expo start
```

Press `a` in the terminal to open on an Android device or emulator, or scan the QR code with Expo Go.

> **Note:** `EXPO_PUBLIC_` variables are inlined into the app bundle, so the key is visible in a shipped build. Fine for development; use a backend proxy before publishing widely.

Without any key the app still works: Home, Appliances, and Plan all run on the local optimizer. Only Plan chat shows its "unavailable" state.

### Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Start and open on Android |
| `npm run lint` | Lint (`expo lint`) |
| `npm test` | Run the Jest test suite |
| `npx tsc --noEmit` | Typecheck |

Run lint and typecheck before committing.

## Testing

Tests use Jest with `jest-expo` and live next to the code in `__tests__/` folders: the optimizer (plans, Meralco bill, calibration, appliance list), the AI layer (Gemini client, interpretation validation, explanations, with a mocked fetch in `src/ai/__mocks__/`), the store, utilities, and key components.

## Tech stack

Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · Expo Router · Zustand · AsyncStorage · React Native Reanimated · React Native SVG · Jest · Google Gemini API

## Contributing notes

- Navigation uses Expo Router only; routes live in `src/app/`, non-route code stays outside it.
- Add Expo-compatible packages with `npx expo install <package>`, not `npm install`.
- Don't hand-edit `ios/` or `android/` if they appear; configure native behavior in `app.json`.
- Keep money and kWh math in `src/optimizer/`. The AI layer must never produce numbers.
- UI should match `design/screens/*.png`. Use the shared theme, and don't add elements the mockups don't show.

## License

See [LICENSE](LICENSE).
