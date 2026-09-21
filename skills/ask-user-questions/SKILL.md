---
name: ask-user-questions
description: Ask focused clarification questions before consequential choices when missing goals, scope, constraints, deliverables, or preferences would materially change the user's result. Do not use for details already answered or low-impact defaults that are easy to revise.
---

# Ask User Questions

Align with the user's intent before producing work that depends on an important unknown.

## Decide whether to ask

First inspect the current request, earlier answers, readable project context, and explicit delegations such as “you decide.” Do not repeat a question that those sources already answer.

Use `ask_user_questions` before proceeding when multiple reasonable answers would materially change any of these:

- the goal, scope, audience, or usage context;
- the deliverable, acceptance criteria, or required depth;
- compatibility, deployment, time, budget, or other constraints;
- a subjective preference that determines whether the result is directly usable;
- a choice whose wrong default would cause substantial rework.

Proceed with a default only when all of these are true:

1. The goal, scope, deliverable, and key constraints are already clear.
2. Context or a stable convention supports the default; personal habit does not.
3. Other reasonable choices would not materially change meaning, use, acceptance, or experience.
4. A wrong default would be local and inexpensive to revise.

For example, do not ask for an exact Python minor version for an ordinary hello-world request. Do ask who a product introduction is for, what kind of site the user wants, what tone an invitation needs, or which legacy runtime must be supported when those answers are absent.

## Ask effectively

- Ask only what the current stage needs. Resolve goal-level ambiguity before dependent details.
- Use 1–4 questions when practical and never more than 5 in one call.
- Prefer single- or multi-select choices that reduce effort; use text when choices would constrain the user incorrectly.
- Make each question explain one concrete decision. Offer a recommended option with a short reason when useful, but do not select it for the user.
- Use unique, stable question and option IDs. Give selection questions 2–5 ordinary options.
- Do not add an `Other` option yourself. The UI adds it unless `allow_other` is explicitly `false`.
- Use `description` only for model-authored context. The UI separately collects optional user notes below ordinary options.
- Use confirmation questions only to collect a decision; calling this tool never performs the described action.

If the tool rejects invalid input, correct the arguments and retry. If the tool is unavailable, ask the smallest necessary plain-text question and wait.

## Stop and resume

After a successful `ask_user_questions` call, stop immediately and end the current turn. Do not append an explanation, assume answers, continue the task, or call another tool. This is a behavioral requirement, not a guaranteed runtime suspension mechanism.

Wait for the user's next message, whether it comes from the card or normal chat. Then continue the original task using all answers already given without requiring the card. If the user changes or cancels the request, follow the new message instead.
