# Agent Instructions

All Markdown files in this repository and all data, labels, and prose under `docs/` must be written in English. Preserve source names and quotations when required for attribution. Generated documentation must follow the same rule; edit its source data and generator rather than the output.

Before changing this repository, read `docs/PLAN.md` and `docs/ARCHITECTURE.md`. Read `docs/DOMAIN_MODEL.md` before changing lesson content or movement data.

## Working rules

- Before changing court geometry or game-rule references, read `docs/reference/badminton/README.md`. `court.json` in that directory is the sole geometry source; `rules.json` and `sources.json` pin the rule reference version. Do not claim the pinned version is the latest unless verified.
- Edit source JSON, then run `npm run reference:generate` and `npm test`. Do not edit generated `court.svg` or `RULES.en.md` by hand. Keep measured line edges distinct from centre lines, and service standing areas distinct from shuttle landing areas.

- Treat the accepted product plan and architecture as the source of truth. If they conflict, stop and point out the conflict instead of inventing a requirement.
- Keep learner UI and 3D rendering in `frontend/`; keep lesson APIs and business rules in `backend/`. The frontend must not access the database directly.
- Build only the smallest slice needed for the current request. Do not add authentication, an admin CMS, analytics, or microservices unless the plan is updated to require them.
- Do not invent badminton coaching cues or claim a movement is technically correct without coach-provided or coach-reviewed guidance. Mark missing domain details as questions.
- Avoid adding dependencies or framework-specific scaffolding until the stack decision is recorded in `docs/ARCHITECTURE.md`.
- When a decision changes product scope, data shape, or the FE/BE boundary, update the relevant document in the same change.
