import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadLessons, validateLessons } from '../backend/lessons.mjs';
import { startServer } from '../backend/server.mjs';
import { createLogger } from '../backend/logs.mjs';
import { buildTimeline } from '../frontend/lesson-timeline.mjs';
import { estimateJump } from '../frontend/shuttle-physics.mjs';

const read = name => JSON.parse(readFileSync(new URL(`../docs/reference/badminton/${name}`, import.meta.url)));
const reference = { court: read('court.json'), rules: read('rules.json') };
const data = await loadLessons();

test('every lesson passes the backend rules', () => {
  assert.deepEqual(validateLessons(data, reference), []);
  assert.ok(data.lessons.length >= 8);
  for (const category of data.categories) assert.ok(data.lessons.some(lesson => lesson.category === category), category);
  assert.ok(data.lessons.every(lesson => lesson.status === 'draft-source-derived'), 'no lesson claims coach review yet');
});

test('broken lessons are rejected for each rule', () => {
  const broken = change => {
    const copy = structuredClone(data);
    change(copy, copy.lessons.find(lesson => lesson.id === 'lift-smash-block'));
    return validateLessons(copy, reference).join('\n');
  };
  assert.match(broken((d, l) => { l.steps[1].shot.by = 'A2'; }), /must be on the other side/);
  assert.match(broken((d, l) => { l.sources[0].sourceId = 'downey-1984'; }), /usable sourceId/);
  assert.match(broken((d, l) => { l.steps[0].shot.contactHeight = 1.2; }), /at most 1\.15 m/);
  assert.match(broken((d, l) => { l.steps[0].shot.to = { left: 1.5, fromNet: 2.5 }; }), /diagonally opposite service court/);
  assert.match(broken((d, l) => { l.steps[0].positions.B1 = { left: 1.0, fromNet: 3 }; }), /receiver B1 must stand/);
  assert.match(broken((d, l) => { delete l.steps[2].caption.vi; }), /en and vi/);
  assert.match(broken((d, l) => { l.steps[2].quote = { text: '' }; }), /verbatim quote/);
  assert.match(broken((d, l) => { l.steps[2].quote.sourceId = 'chen-2009-jssm'; }), /one of the lesson sources/);
  assert.match(broken(d => { d.speeds.block = { speed: 10 }; }), /illustrative/);
});

test('every shot can be played and reached by the next player', () => {
  const player = read('player.json');
  const shuttle = read('shuttle.json');
  const p = player.defaultProfile;
  const jump = estimateJump({ sex: p.sex, height: p.heightM, mass: p.massKg, level: p.level }, player.jumpModel);
  for (const lesson of data.lessons) {
    const segments = buildTimeline(lesson, { court: reference.court, flight: shuttle.flight, speeds: data.speeds, player, height: p.heightM, jump });
    assert.equal(segments.length, lesson.steps.filter(step => step.shot).length, lesson.id);
    for (const segment of segments) assert.ok(segment.duration > 0.05, `${lesson.id} step ${segment.step + 1} is too short to show`);
  }
});

test('the lesson API lists lessons and serves each one', async () => {
  const server = await startServer({ dev: false, host: '127.0.0.1', port: 0, logger: createLogger({ sink: () => {} }) });
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const list = await (await fetch(`${base}/api/lessons`)).json();
    assert.deepEqual(list.lessons.map(lesson => lesson.id), data.lessons.map(lesson => lesson.id));
    assert.ok(list.lessons.every(lesson => lesson.title.vi && lesson.status));
    const detail = await fetch(`${base}/api/lessons/${list.lessons[0].id}`);
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).lesson.steps.length, data.lessons[0].steps.length);
    assert.equal((await fetch(`${base}/api/lessons/nope`)).status, 404);
    assert.equal((await fetch(`${base}/training`)).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
