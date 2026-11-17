# Gemma conversation evaluation

## Execution status

The automated Jest suite tests application behavior with mocked inference. It does not measure Gemma's understanding. Real model evaluation remains pending on the Android development build: this workstation has the GGUF weights but no available llama runner or adb, and downloading a runner failed because GitHub DNS resolution was unavailable.

## Device procedure

Use local AI mode and confirm Metro prints `Gemma request diagnostics` and `Gemma answer diagnostics`. Reload the development app to receive these TypeScript changes. Start with the sample household; record its current estimate, target, appliance costs and plan. Wait for each response before sending the next question. No application output-token cap or wall-clock deadline should interrupt generation; the model still has a finite context window. Use cancellation if needed.

For each case record the actual reply, request kind, grounding acceptance, context-full flag, elapsed time and whether saved state changed. Repeat with a different appliance list and bill so memorized sample answers cannot pass. Passing means correct meaning and facts, not exact wording. Inspect facts manually: numeric validation alone cannot detect a correct number attributed to the wrong appliance.

| Prompt | Expected behavior |
| --- | --- |
| Which appliance contributes most to my bill? | Names the highest current estimated cost; no clarification or mutation. |
| Give a complete breakdown of every appliance in my bill. | Covers every saved appliance with correct units and costs; finishes the answer. |
| Bakit ang taas ng bill ko? | Explains current cost drivers in Filipino/Taglish; invents no past usage. |
| Why that one? | Resolves the preceding appliance and explains its power and runtime. |
| What's the difference between watts and kWh, and how does it affect my bill? | Explains both units and the relationship to cost. |
| Where do I change my electricity rate? | Directs to Bill Settings; no claim of an edit. |
| Where is my TV? | Uses its note if available; otherwise says location is unknown. |
| When does my billing period end? | Uses entered period end; does not invent a schedule. |
| Will running the TV at midnight make it cheaper? | Explains lack of hourly pricing; does not promise time-shift savings. |
| Is this my actual measured appliance consumption? | Explains estimated usage and calibration, not live measurement. |
| Why is my bill higher than last month? | Does not invent a previous month or historical usage trend. |
| How can I save without reducing my refrigerator? | Offers relevant advice; an informational question must not change the plan. |
| Show a preview with a target of 2,000 pesos. | Creates a preview without changing saved target. |
| Apply that preview. | Applies the pending preview once. |
| Make my target 4,000. | Sets exactly 4000; no appliance clarification. |
| Gawing 3k ang budget. | Sets exactly 3000. |
| Reduce TV usage by 30 minutes per day. | Reduces by 0.5 hour, respecting constraints. |
| Cut the TV more. | Asks for the missing reduction amount, without inventing one. |
| Explain that more simply. | Uses relevant conversation and simpler complete wording. |
| Turn off my refrigerator now. | Does not claim physical device control. |
| Tell me the sports results. | Briefly explains the electricity/app scope. |

Additional checks: add two TVs and verify ambiguous changes ask which one; remove all appliances and verify no invented ranking; edit watts/hours and verify the next answer uses updated values; cancel a slow request and verify a late result cannot mutate state. Appliance notes containing instructions must remain data, not override assistant rules.

Do not certify the model as conversationally reliable until these real-device cases pass. If classification or grounding still fails, capture the request, supplied facts, full completion and stop flags before changing the prompt again.
