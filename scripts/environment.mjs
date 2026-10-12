import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export function assertNodeVersion(version = process.versions.node) {
  if (Number(version.split('.')[0]) < 22) throw new Error(`Node.js 22+ is required; found ${version}.`);
}

export function readManifests(cwd = process.cwd()) {
  const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
  let lock;
  try { lock = JSON.parse(readFileSync(join(cwd, 'package-lock.json'), 'utf8')); }
  catch { throw new Error('package-lock.json is missing or invalid. Commit a valid npm lockfile.'); }
  const fields = ['dependencies', 'devDependencies', 'optionalDependencies'];
  for (const field of fields) {
    const declared = pkg[field] ?? {};
    const locked = lock.packages?.['']?.[field] ?? {};
    const entries = value => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    if (entries(declared) !== entries(locked)) {
      throw new Error(`package-lock.json is out of sync for ${field}. Run npm install and commit the lockfile.`);
    }
  }
  return pkg;
}

export function installDecision(pkg, nodeModulesExists, npmListOk) {
  const count = ['dependencies', 'devDependencies', 'optionalDependencies']
    .reduce((n, field) => n + Object.keys(pkg[field] ?? {}).length, 0);
  if (count === 0) return 'No external packages declared.';
  if (!nodeModulesExists) return 'node_modules is missing.';
  if (!npmListOk) return 'Installed packages are missing or inconsistent.';
  return null;
}

export function runNpm(args, cwd = process.cwd(), quiet = false) {
  const cli = process.env.npm_execpath;
  const command = cli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, cli ? [cli, ...args] : args, {
    cwd, stdio: quiet ? 'ignore' : 'inherit', shell: !cli && process.platform === 'win32'
  });
  if (result.error) throw new Error(`Could not run npm: ${result.error.message}`);
  return result.status === 0;
}

export function prepareDependencies({ cwd = process.cwd(), force = false, report = console.log } = {}) {
  assertNodeVersion();
  const pkg = readManifests(cwd);
  const installed = existsSync(join(cwd, 'node_modules'));
  const npmListOk = installed && runNpm(['ls', '--depth=0'], cwd, true);
  const reason = force ? 'Deployment preparation requires a clean install.' : installDecision(pkg, installed, npmListOk);
  if (reason) {
    report(reason);
    if (force || reason !== 'No external packages declared.') {
      report('Installing packages from package-lock.json with npm ci...');
      if (!runNpm(['ci', '--no-audit', '--no-fund'], cwd)) {
        throw new Error('npm ci failed. Check network access, npm output, and the lockfile.');
      }
      report('Dependency installation completed.');
    }
  } else report('Installed packages are ready.');
}
