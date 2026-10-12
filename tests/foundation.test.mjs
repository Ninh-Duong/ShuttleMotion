import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNodeVersion, installDecision, readManifests } from '../scripts/environment.mjs';
import { createLogger } from '../backend/logs.mjs';
import { startServer } from '../backend/server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = () => mkdtempSync(join(tmpdir(), 'shuttlemotion-test-'));

test('English documentation and reference data have no Vietnamese fields or prose', () => {
  const files = [];
  function collect(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isDirectory()) collect(path);
      else files.push(path);
    }
  }
  collect(join(root, 'docs'));
  const vietnamese = /[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ]/u;
  for (const path of files) {
    const content = readFileSync(path, 'utf8');
    assert.doesNotMatch(content, vietnamese, path);
    assert.doesNotMatch(content, /(?:labelVi|titleVi|summaryVi|exampleVi|RULES\.vi)/, path);
  }
  assert.equal(JSON.parse(readFileSync(join(root, 'docs/reference/badminton/rules.json'))).language, 'en');
});

test('Node and lockfile checks explain incompatible environments', () => {
  assert.throws(() => assertNodeVersion('21.9.0'), /Node.js 22\+/);
  assert.doesNotThrow(() => assertNodeVersion('22.0.0'));
  const dir = temporary();
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { example: '1.0.0' } }));
    assert.throws(() => readManifests(dir), /package-lock.json is missing/);
    writeFileSync(join(dir, 'package-lock.json'), JSON.stringify({ packages: { '': { dependencies: { example: '2.0.0' } } } }));
    assert.throws(() => readManifests(dir), /out of sync/);
    writeFileSync(join(dir, 'package-lock.json'), JSON.stringify({ packages: { '': { dependencies: { example: '1.0.0' } } } }));
    assert.equal(readManifests(dir).dependencies.example, '1.0.0');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('dependency decision detects missing and inconsistent installations without npm downloads', () => {
  assert.equal(installDecision({}, false, false), 'No external packages declared.');
  const pkg = { dependencies: { example: '1.0.0' } };
  assert.equal(installDecision(pkg, false, false), 'node_modules is missing.');
  assert.equal(installDecision(pkg, true, false), 'Installed packages are missing or inconsistent.');
  assert.equal(installDecision(pkg, true, true), null);
});

test('logs are bounded, filterable, and omit unapproved fields', () => {
  const dir = temporary();
  try {
    const logger = createLogger({ dev: true, dir, maxBytes: 450, sink: () => {} });
    logger.write('info', 'server.start', { message: 'Ready', authorization: 'secret-token' });
    logger.write('error', 'server.error', { message: 'Failure', body: 'private-body' });
    assert.equal(logger.recent({ level: 'error' }).length, 1);
    assert.equal(logger.recent({ search: 'server.start' }).length, 1);
    for (let i = 0; i < 15; i++) logger.write('info', 'http.request', { route: '/api/health', status: 200, durationMs: i });
    assert.ok(statSync(join(dir, 'dev.jsonl')).size <= 450);
    assert.ok(statSync(join(dir, 'dev.previous.jsonl')).size <= 450);
    assert.doesNotMatch(logger.recent().map(JSON.stringify).join(''), /secret-token|private-body/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('development logs are local and production diagnostics are unavailable', async () => {
  const dir = temporary();
  const logger = createLogger({ dev: true, dir, sink: () => {} });
  const dev = await startServer({ dev: true, port: 0, host: '127.0.0.1', logger, setupEvents: ['No external packages declared.'] });
  try {
    const base = `http://127.0.0.1:${dev.address().port}`;
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'ok' });
    assert.equal((await fetch(`${base}/dev/logs`)).status, 200);
    await fetch(`${base}/api/health?token=secret-token`);
    const response = await fetch(`${base}/__dev/logs`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /dependency.check|server.start/);
    assert.doesNotMatch(body, /secret-token/);
  } finally { await new Promise(resolve => dev.close(resolve)); }
  const prod = await startServer({ dev: false, port: 0, host: '127.0.0.1', logger: createLogger({ sink: () => {} }) });
  try {
    const base = `http://127.0.0.1:${prod.address().port}`;
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal((await fetch(`${base}/dev/logs`)).status, 404);
    assert.equal((await fetch(`${base}/__dev/logs`)).status, 404);
  } finally { await new Promise(resolve => prod.close(resolve)); rmSync(dir, { recursive: true, force: true }); }
});
