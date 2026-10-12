# ShuttleMotion

ShuttleMotion is a browser-based badminton teaching project. The current release is a small runnable website with local diagnostics. Its competition-standard court dataset is ready for future 2D and 3D viewers; the viewers and lessons are not implemented yet.

## Requirements and packages

- Node.js **22 or newer** and npm (npm 10 works with the current project).
- No external runtime libraries are declared yet. Node's built-in HTTP, filesystem, and test modules run the app and tests.
- `package-lock.json` is committed so future packages can be installed reproducibly. Use `npm install <package>` when adding a library and commit both manifest and lockfile.

## Run on localhost

From the repository root:

```sh
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The local logs page is [http://127.0.0.1:3000/dev/logs](http://127.0.0.1:3000/dev/logs). Set `PORT` to choose another port. The dev command checks the Node version, validates the lockfile, checks declared packages, and runs `npm ci` if installed packages are missing or inconsistent. With the current zero-dependency manifest, no download is needed.

Logs include startup, dependency checks, HTTP request metadata, and server errors. They are stored in bounded, Git-ignored `.local/logs/` files. The page and logs API are disabled in production. Request bodies, query values, and headers are not logged.

## Check and prepare for deployment

```sh
npm run reference:generate
npm test
npm run deploy:prepare
npm start
```

`deploy:prepare` validates Node and the lockfile, performs a clean `npm ci`, and runs tests. Run it in the build or install stage of a Node-compatible host before `npm start`. The production process uses `PORT` and optional `HOST` (`0.0.0.0` by default) and writes process events to stdout. A hosting provider has not been selected.

If setup fails, read the npm error and check Node version, network access, write access, and whether `package.json` matches `package-lock.json`. A deployment runtime should not have to install packages while serving requests.

## Repository map

- `frontend/` — browser files and local diagnostics UI.
- `backend/` — Node server, health API, and process logging.
- `scripts/` — dependency preparation and reference generation.
- `docs/` — English product, architecture, and badminton reference material.
- `tests/` — Node unit and integration tests.
- `AGENTS.md` — working rules for coding agents.

Start with the [reference guide](docs/reference/badminton/README.md), [court diagram](docs/reference/badminton/court.svg), and [English rule summary](docs/reference/badminton/RULES.en.md). The reference pins BWF 5.0 (1), effective 26 April 2025; the latest effective version has not been confirmed.
