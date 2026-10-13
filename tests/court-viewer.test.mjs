import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { courtMetrics, courtSvg, lineGeometry, lineRole } from '../frontend/court-geometry.mjs';
import { startServer } from '../backend/server.mjs';
import { createLogger } from '../backend/logs.mjs';

const court = JSON.parse(readFileSync(new URL('../docs/reference/badminton/court.json', import.meta.url)));

test('both views use the same metre-based painted line rectangles', () => {
  const svg = courtSvg(court, 'singles', { court: 'Court' }, 'en-US');
  for (const line of court.markings.rectangles) {
    const g = lineGeometry(line);
    assert.equal(g.width, line.bounds.xMax - line.bounds.xMin);
    assert.equal(g.length, line.bounds.zMax - line.bounds.zMin);
    assert.ok(svg.includes(`data-line-id="${line.id}" x="${line.bounds.xMin}" y="${line.bounds.zMin}" width="${g.width}" height="${g.length}"`));
  }
  const [, , , width, height] = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/).map(Number);
  assert.ok(Math.abs(width - 2.2 - court.dimensions.doublesWidth) < 1e-9);
  assert.ok(Math.abs(height - 1.7 - court.dimensions.length) < 1e-9);
  assert.match(svg, /preserveAspectRatio="xMidYMid meet"/);
});

test('singles and doubles highlight the correct rally and service lines without changing CourtSpec', () => {
  const original = structuredClone(court);
  assert.equal(lineRole('singles-side-positive', 'singles'), 'boundary');
  assert.equal(lineRole('singles-side-positive', 'doubles'), 'standard');
  assert.equal(lineRole('doubles-side-positive', 'doubles'), 'boundary');
  assert.equal(lineRole('baseline-positive', 'singles'), 'boundary');
  assert.equal(lineRole('doubles-long-service-positive', 'singles'), 'standard');
  assert.equal(lineRole('doubles-long-service-positive', 'doubles'), 'service');
  assert.equal(lineRole('short-service-positive', 'doubles'), 'service');
  const singles = courtSvg(court, 'singles', { court: 'Court' });
  const doubles = courtSvg(court, 'doubles', { court: 'Court' });
  assert.notEqual(singles, doubles);
  assert.deepEqual(court, original);
});

test('dimension labels derive from the canonical court values', () => {
  const m = courtMetrics(court);
  assert.ok(Math.abs(m.doublesLongServiceFromBack - 0.76) < 1e-9);
  assert.deepEqual({ ...m, doublesLongServiceFromBack: 0.76 }, {
    length: 13.4, doublesWidth: 6.1, singlesWidth: 5.18, lineWidth: 0.04,
    shortServiceFromNet: 1.98, doublesLongServiceFromBack: 0.76,
    postHeight: 1.55, netDepth: 0.76, netCentreHeight: 1.524, netSideHeight: 1.55
  });
  const vi = courtSvg(court, 'singles', { court: 'Sân cầu lông' }, 'vi-VN');
  const en = courtSvg(court, 'singles', { court: 'Badminton court' }, 'en-US');
  assert.match(vi, /13,40 m/);
  assert.match(en, /13\.40 m/);
});

test('server provides court data and pinned local 3D modules', async () => {
  const server = await startServer({ dev: false, host: '127.0.0.1', port: 0, logger: createLogger({ sink: () => {} }) });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const data = await (await fetch(`${base}/assets/court.json`)).json();
    assert.deepEqual(data.dimensions, court.dimensions);
    assert.equal((await fetch(`${base}/assets/player.json`)).status, 200);
    assert.equal((await fetch(`${base}/shot`)).status, 200);
    for (const path of ['/court-app.mjs', '/court-geometry.mjs', '/court-3d.mjs', '/shuttle-physics.mjs', '/shot-app.mjs', '/lesson-timeline.mjs', '/training-app.mjs', '/vendor/three.module.js', '/vendor/three.core.js', '/vendor/addons/controls/OrbitControls.js']) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /text\/javascript/, path);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
