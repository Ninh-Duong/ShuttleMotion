# Architecture

## Selected starting shape

Use one repository with separate `frontend/` and `backend/` applications. Keep the backend as one modular application (a modular monolith) and expose lesson data through an explicit API. This gives the project clear boundaries without requiring microservice operations.

## Responsibilities

### Frontend

- Lesson browsing and playback UI.
- Court scene, camera, player representation, shuttle/path visualization, and user interaction.
- Loading lesson data through the backend API.
- No direct database access and no authoritative coaching rules duplicated from the backend's lesson content.
- For the competition-court feature, consume the canonical reference JSON and render it in 2D and 3D. See `FEATURE_COMPETITION_COURT_PLAN.md`.
- Each page has one `*-app.mjs`; page-independent helpers (language, common words, number format, JSON fetch, 3D loading) live in `frontend/ui.mjs`.

### Backend

- Lesson API and validation of lesson data.
- Later, user accounts or progress only if those are added to product scope.
- No rendering or browser-specific 3D code.
- The static standard-court viewer does not require a backend endpoint.

### Lesson assets

Keep models, textures, and animations as files referenced by lesson data. Do not store large binary media inside relational records. The asset hosting mechanism is undecided until deployment is selected.

## Data and API direction

- Treat a lesson as structured, versionable content that the frontend renders.
- Keep the API contract explicit and documented. Routes stay unversioned (`/api/lessons`) while the bundled frontend is the only client; lesson data carries `schemaVersion`. Add an `/api/v1` prefix at the first breaking change.
- Keep initial sample content small. Avoid a CMS until editing lessons through the product is a confirmed need.
- Choose persistent storage after deciding whether the first release needs accounts or saved progress. Lesson metadata is relational in shape, but a database is not required for the documentation-only foundation.
- The court viewer uses a canonical `CourtSpec` in metres; both renderers consume it. Do not duplicate court dimensions or rule calculations in renderer-specific code.

## Deployment direction

Keep frontend and backend independently understandable. One Node server serves the static frontend and API on one origin. Static files are held in memory with a gzip copy and sent with `ETag` and `Cache-Control: no-cache`, so repeat visits get `304`; a changed file reloads on its next request. API responses stay `no-store`. `npm run dev` prepares missing packages from the committed lockfile and binds to loopback; `npm run deploy:prepare` runs a clean install and tests before deployment. `npm start` serves the prepared app, binding to `HOST`/`PORT` when supplied. Hosting remains undecided.

## Runnable foundation (selected)

Use Node.js 22+ built-in HTTP and filesystem modules for `backend/`, and plain HTML, CSS, and JavaScript in `frontend/`. The court viewer adds the pinned `three` npm package for 3D and its OrbitControls addon, served locally through an import map without a build tool. No database is needed. `GET /api/health` is the health check. The lesson API serves `GET /api/lessons` (list) and `GET /api/lessons/:id` (one lesson with its speeds, sources and notes) from `backend/lessons/doubles.json`. `backend/lessons.mjs` validates it at startup against `court.json` service areas and the `rules.json` service-height limit, and invalid lesson data stops the server. Lessons are drafts until a coach reviews them. The frontend `lesson-timeline.mjs` turns a lesson into chained flights with the shared physics module; see `FEATURE_DOUBLES_TRAINING_PLAN.md`.

The homepage reads `docs/reference/badminton/court.json` through a read-only static route. One CourtSpec supplies painted line rectangles, playing areas, net, and post measurements to both the SVG 2D view and Three.js 3D scene. The 2D SVG scales to its viewport without changing world proportions; the 3D scene uses one world unit per metre. The same responsive page supports desktop and mobile. UI copy is Vietnamese by default with a browser-local English switch; technical documentation and reference data remain English.

The local diagnostics page at `/dev/logs` and its `/__dev/logs` endpoint exist only in development on a loopback address. The backend records startup, dependency-check, request, and server-error events in bounded ignored JSONL files under `.local/logs/`. Log records omit request bodies, query values, headers, and secrets. Production emits process logs to stdout and exposes no diagnostics endpoint.

## Deliberate exclusions

- Microservices and message queues.
- A generic plugin system or extensible lesson engine.
- A shared FE/BE package before duplicated contracts become a real problem.
- Authentication, admin tools, and analytics in the foundation.

## Decisions still open

Choose persistence, asset storage, and hosting here before adding those capabilities. Base those choices on target devices and the first lesson.

## Reference-data tooling (selected)

Node.js 22+ with standard-library `node:test`; `three` is the sole runtime package dependency for the court viewer. The root package scripts generate the reference artifacts and run their tests.

`docs/reference/badminton/court.json` is the single geometry source, consumed by documentation and both frontend renderers. `rules.json` is a version-pinned reference, not a match adjudication engine. `sources.json` records provenance and whether currency was confirmed. SVG and English rule prose are generated by `scripts/generate-badminton-reference.mjs`.

World coordinates use metres: origin at floor centre/net plane, x across, y up, z longitudinal. Markings are rectangles with actual painted edges. Service landing regions include lines; service standing regions exclude them. Renderers must preserve these meanings and read the JSON rather than copying constants.

`docs/reference/badminton/shuttle.json` holds the shuttle specification, drag constants and stroke launch data with their sources, served read-only at `/assets/shuttle.json`. `frontend/shuttle-physics.mjs` is pure, Three-free visualization math (flight integration and aiming) shared by both views and unit-tested in Node. It is not a business rule and needs no backend endpoint until lessons store shuttle states. The shot lab page (`frontend/shot.html`, `frontend/shot-app.mjs`, served at `/shot`) reuses that module and `court-3d.mjs`. `docs/reference/badminton/player.json` holds the body-segment ratios, racket length, jump references and the jump-estimation model used for the player figures. It is served read-only at `/assets/player.json`.
