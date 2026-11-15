@AGENTS.md

# Watt Plan

Android-only Expo (React Native, TypeScript, Expo Router) app. Budget-first electricity planner for Filipino households: the user sets a target monthly bill and the app computes which appliances to cut.

## Structure

- Bottom tabs: Home, Appliances, Plan
- Pushed screens (back arrow, no tab bar): Bill settings, Plan chat
- Bottom sheets: add/edit appliance

## Design

- design/screens/\*.png are the source of truth for layout. Match them.
- design/DESIGN.md has colors, type and spacing. Put these in one shared theme file and use it everywhere.
- design/html/\*.html is web code. Read it only for exact colors, sizes and text. Do not copy it into the app.
- Use only the elements shown in the screenshots. Do not add features, buttons or labels.

## Architecture rules

- src/optimizer: plain TypeScript, no AI. All money and kWh math lives here.
- src/ai: calls the LLM to (1) turn user messages into constraint JSON and (2) explain plans. The AI never computes numbers.
- Plan state lives in one shared store, so the Plan screen and Plan chat always show the same plan.
- Currency is ₱. Android only, no iOS-specific code.
