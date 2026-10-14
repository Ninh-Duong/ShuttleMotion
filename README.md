# ShuttleMotion

ShuttleMotion is a browser-based badminton teaching project. The homepage shows one competition-standard court in responsive 2D and 3D views. It supports singles/doubles highlighting and Vietnamese/English UI. It also includes a shuttle vector sandbox and a shot lab page (`/shot`) that simulates a hit from a coach-entered speed and racket-face angle, with a jumping player figure. It also has a doubles training page (`/training`) with eight animated 2 vs 2 lessons, served by the backend lesson API. They are drafts derived from cited BWF coaching pages, awaiting coach review.

## Requirements and packages

- Node.js **22 or newer** and npm (npm 10 works with the current project).
- `three` is the only runtime library. It renders the 3D court and provides OrbitControls; 2D uses native SVG. The Node server and tests use built-in modules.
- `package-lock.json` pins package versions. Use `npm install <package>` when adding a library and commit both manifest and lockfile.

## Run on localhost

From the repository root:

```sh
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The homepage opens in 2D; switch to 3D, select Singles/Doubles, use mouse or touch to orbit and zoom, and change UI language with the EN/VI button. A browser with WebGL2 is required for 3D; 2D remains available otherwise. The local logs page is [http://127.0.0.1:3000/dev/logs](http://127.0.0.1:3000/dev/logs). Set `PORT` to choose another port. The dev command checks Node and the lockfile, then runs `npm ci` if packages are missing or inconsistent.

Logs include startup, dependency checks, HTTP request metadata, and server errors. They are stored in bounded, Git-ignored `.local/logs/` files. The page and logs API are disabled in production. Request bodies, query values, and headers are not logged.

## Check and prepare for deployment

```sh
npm run reference:generate
npm test
npm run deploy:prepare
npm start
```

`deploy:prepare` validates Node and the lockfile, performs a clean `npm ci`, and runs tests. Run it in the build or install stage of a Node-compatible host before `npm start`. No frontend build step or CDN is required; the server serves the pinned Three.js modules locally, gzip-compressed and revalidated by ETag, so browsers download them once. The production process uses `PORT` and optional `HOST` (`0.0.0.0` by default) and writes process events to stdout. A hosting provider has not been selected.

If setup fails, read the npm error and check Node version, network access, write access, and whether `package.json` matches `package-lock.json`. A deployment runtime should not have to install packages while serving requests.

## Repository map

- `frontend/` — browser files and local diagnostics UI.
- `backend/` — Node server, health API, and process logging.
- `scripts/` — dependency preparation and reference generation.
- `docs/` — English product, architecture, and badminton reference material.
- `tests/` — Node unit and integration tests.
- `AGENTS.md` — working rules for coding agents.

Start with the [reference guide](docs/reference/badminton/README.md), [court diagram](docs/reference/badminton/court.svg), and [English rule summary](docs/reference/badminton/RULES.en.md). Both homepage views read the same court JSON. The reference pins BWF 5.0 (1), effective 26 April 2025; the latest effective version has not been confirmed. The visual court is proportionally scaled on screen, not a physical 1:1 display.
