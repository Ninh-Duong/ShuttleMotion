import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { aimAt, averageForce, candidatePaths, clearsNet, closestMiss, estimateJump, failedAttempts, highestContact, interceptPose, suggestStand, reachPose, launchVector, minimumHeight, netHeightAt, playerToWorld, receive, shotOutcome, simulate, sixCorners, solveTarget } from '../frontend/shuttle-physics.mjs';

const read = name => JSON.parse(readFileSync(new URL(`../docs/reference/badminton/${name}`, import.meta.url)));
const court = read('court.json');
const shuttle = read('shuttle.json');
const flight = shuttle.flight;

test('shuttle reference values resolve to a recorded source', () => {
  const ids = [...read('sources.json').sources, ...shuttle.sources].map(source => source.id);
  for (const section of [shuttle.specification, shuttle.flight, shuttle.strokes]) assert.ok(ids.includes(section.reference.sourceId));
  assert.ok(ids.includes(shuttle.strokes.zoneReference.sourceId));
  for (const section of [shuttle.contact, shuttle.launchDirection, shuttle.orientation]) assert.ok(ids.includes(section.reference.sourceId));
  for (const preset of shuttle.presets.items) assert.ok(ids.includes(preset.sourceId), preset.id);
  const player = read('player.json');
  const all = [...ids, ...player.sources.map(source => source.id)];
  for (const ref of [player.segments, player.racket, player.jump, player.interception].map(x => x.reference)) assert.ok(all.includes(ref.sourceId));
  assert.ok(all.includes(player.jump.eliteExample.sourceId));
});

test('player-view input maps to court.json world coordinates', () => {
  assert.deepEqual(playerToWorld('A', { left: 1, fromNet: 3, height: 2 }), { x: -1, y: 2, z: 3 });
  assert.deepEqual(playerToWorld('B', { left: 1, fromNet: 3, height: 2 }), { x: 1, y: 2, z: -3 });
  assert.deepEqual(playerToWorld('B', { left: 0, fromNet: 0, height: 1 }), { x: 0, y: 1, z: 0 });
});

test('a dropped shuttle reaches the published terminal speed', () => {
  const { speed } = simulate({ x: 0, y: 30, z: 1 }, { x: 0, y: 0, z: 0 }, flight);
  assert.ok(Math.abs(speed - flight.expectedTerminalSpeed) < 0.2, String(speed));
});

test('flight is a short Tartaglia curve, not a parabola', () => {
  // Clanet 2015 worked example: 52 degrees at 59 m/s. Eq. 7 (an approximation) gives about 7.7 m with these
  // constants; Cohen et al. 2015 give 13.8 m as the maximum range. A drag-free parabola would go about 350 m.
  const angle = 52 * Math.PI / 180;
  const { landing } = simulate({ x: 0, y: 1e-4, z: 0.5 }, { x: 0, y: 59 * Math.sin(angle), z: -59 * Math.cos(angle) }, flight);
  const range = 0.5 - landing.z;
  assert.ok(range > 7.7 && range < 13.8, String(range));
});

test('aimAt lands on its target and clears the net', () => {
  const target = { x: 1, z: -5 };
  const path = aimAt({ x: -1, y: 2, z: 3 }, target, 47.76, flight, { clears: crossing => clearsNet(court.equipment.net, crossing) });
  assert.ok(Math.hypot(path.landing.x - target.x, path.landing.z - target.z) < 0.05);
  assert.ok(path.netCrossing.y > 1.55);
});

test('candidate paths respect stroke zones, launch direction and the rally area', () => {
  const high = candidatePaths({ x: 0, y: 3, z: 3 }, court, shuttle, 'singles');
  const smashes = high.filter(path => path.stroke === 'smash');
  assert.ok(smashes.length > 0);
  for (const path of high) {
    assert.ok(path.landing.z < 0 && Math.abs(path.landing.x) <= 2.59);
    assert.ok(shuttle.strokes.items.find(item => item.id === path.stroke).zones.includes(path.zone));
  }
  for (const path of smashes) assert.ok(path.v0.y < 0);
  assert.equal(candidatePaths({ x: 0, y: 1, z: 6 }, court, shuttle, 'singles').filter(path => path.stroke === 'smash').length, 0);
  assert.ok(candidatePaths({ x: 0, y: 3, z: -3 }, court, shuttle, 'doubles').every(path => path.landing.z > 0));
  assert.deepEqual(candidatePaths({ x: 0, y: 0, z: 3 }, court, shuttle, 'singles'), []);
});

test('reception on the far side reports the arriving shuttle state', () => {
  const smash = candidatePaths({ x: -1, y: 3, z: 3 }, court, shuttle, 'singles').find(path => path.id === 'smash-mid-centre');
  const r = receive(smash, 1, flight);
  assert.ok(r.position.z < 0 && Math.abs(r.position.y - 1) < 0.05, JSON.stringify(r.position));
  assert.ok(r.velocity.y < 0 && r.speed < 62.12 && r.descentAngle > 0);
  for (const axis of ['x', 'y', 'z']) assert.ok(Math.abs(r.corkDirection[axis] - r.velocity[axis] / r.speed) < 1e-12);
  assert.ok(Math.abs(r.momentum - flight.massKg * r.speed) < 1e-12);
  assert.ok(Math.abs(r.energy - 0.5 * flight.massKg * r.speed ** 2) < 1e-12);
  const returns = candidatePaths(r.position, court, shuttle, 'singles');
  assert.ok(returns.length > 0);
  assert.ok(returns.every(path => path.landing.z > 0));
});

test('a contact height above the far-side flight returns null', () => {
  const smash = candidatePaths({ x: 0, y: 3, z: 3 }, court, shuttle, 'singles').find(path => path.stroke === 'smash');
  assert.equal(receive(smash, 2.9, flight), null);
});

test('average force needs an assumed contact time and converts to kgf', () => {
  const { newtons, kgf } = averageForce(0.1, 1);
  assert.ok(Math.abs(newtons - 100) < 1e-9 && Math.abs(kgf - 100 / 9.81) < 1e-9);
});

test('a launch speed override replaces the published stroke speeds', () => {
  const paths = candidatePaths({ x: 0, y: 3, z: 3 }, court, shuttle, 'singles', { speed: 40 });
  assert.ok(paths.length > 0 && paths.every(path => Math.abs(Math.hypot(path.v0.x, path.v0.y, path.v0.z) - 40) < 1e-9));
});

test('a stroke filter limits candidates and reports the minimum smash height', () => {
  const p0 = { x: -1, y: 2, z: 3 };
  assert.ok(candidatePaths(p0, court, shuttle, 'singles', { strokes: ['clear'] }).every(path => path.stroke === 'clear'));
  assert.equal(candidatePaths(p0, court, shuttle, 'singles', { strokes: ['smash'] }).length, 0);
  const y = minimumHeight(p0, court, shuttle, 'singles', { strokes: ['smash'] });
  assert.ok(y > 2 && y < 4, String(y));
  assert.ok(candidatePaths({ ...p0, y }, court, shuttle, 'singles', { strokes: ['smash'] }).length > 0);
  assert.equal(candidatePaths({ ...p0, y: y - 0.05 }, court, shuttle, 'singles', { strokes: ['smash'] }).length, 0);
});

test('the net sags from the posts to the centre', () => {
  const net = court.equipment.net;
  assert.equal(netHeightAt(net, 0), net.centreTopHeight);
  assert.ok(Math.abs(netHeightAt(net, net.widthMin / 2) - net.sidelineTopHeight) < 1e-12);
  assert.equal(clearsNet(net, { x: 3.2, y: 3 }), false);
});

test('launchVector follows the racket face in the hitter frame', () => {
  const a = launchVector({ x: 0, y: 2, z: 3 }, 10, 0, 90);
  assert.ok(Math.abs(a.x - 10) < 1e-9 && Math.abs(a.z) < 1e-9);
  const b = launchVector({ x: 0, y: 2, z: -3 }, 10, 30, 0);
  assert.ok(Math.abs(b.y - 5) < 1e-9 && b.z > 0 && Math.abs(b.x) < 1e-9);
});

test('a flat hit from 1.5 m goes into the net; an open face clears it', () => {
  const p0 = { x: -1, y: 1.5, z: 3 };
  assert.equal(shotOutcome(p0, launchVector(p0, 45, 0, 0), court, flight, 'singles').result, 'net');
  assert.equal(shotOutcome(p0, launchVector(p0, 45, -20, 0), court, flight, 'singles').result, 'net'); // under the net
  assert.equal(shotOutcome(p0, launchVector(p0, 45, -40, 0), court, flight, 'singles').result, 'short');
  const lob = shotOutcome(p0, launchVector(p0, 45, 40, 0), court, flight, 'singles');
  assert.ok(['in', 'out'].includes(lob.result));
  assert.ok(lob.apex > 1.5);
});

test('every reachable corner solution reproduces its target in the forward simulation', () => {
  const p0 = { x: 1, y: 2, z: 5.5 };
  const corners = sixCorners(p0, court, 'singles');
  assert.equal(corners.length, 6);
  assert.ok(corners.every(c => c.z < 0));
  // At a novice smash speed the rear corners are out of reach from the far baseline; a faster hit reaches them.
  assert.equal(solveTarget(p0, corners.find(c => c.id === 'rear-left'), 34.6, court, flight), null);
  assert.ok(solveTarget(p0, corners.find(c => c.id === 'rear-left'), 48, court, flight));
  for (const corner of corners.filter(c => c.zone !== 'rear')) {
    const solution = solveTarget(p0, corner, 34.6, court, flight);
    assert.ok(solution, corner.id);
    const outcome = shotOutcome(p0, launchVector(p0, 34.6, solution.tilt, solution.direction), court, flight, 'singles');
    assert.equal(outcome.result, 'in', corner.id);
    assert.equal(`${outcome.zone}-${outcome.lane}`, corner.id);
    assert.ok(Math.hypot(outcome.landing.x - corner.x, outcome.landing.z - corner.z) < 0.05, corner.id);
  }
});

test('the player figure reaches the contact point, jumping only above standing reach', () => {
  const player = read('player.json');
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  const high = reachPose({ x: 1, y: 3, z: 5.5 }, 1.75, player);
  assert.ok(Math.abs(high.lift - (3 - high.standingReach)) < 1e-9 && high.lift > 0);
  assert.ok(Math.abs(dist(high.shoulder, high.hand) + dist(high.hand, high.contact) - dist(high.shoulder, high.contact)) < 1e-9);
  assert.ok(Math.abs(dist(high.hand, high.contact) - 0.54) < 1e-9);
  const low = reachPose({ x: 1, y: 2, z: 5.5 }, 1.75, player);
  assert.equal(low.lift, 0);
  assert.ok(low.shoulder.z > 5.5, 'body steps back so the contact is in front');
  assert.ok(Math.abs(dist(low.shoulder, low.contact) - (high.standingReach - 0.818 * 1.75)) < 1e-9);
  const sideB = reachPose({ x: 1, y: 2, z: -5.5 }, 1.75, player);
  assert.ok(sideB.shoulder.z < -5.5 && sideB.body.x > 1, 'B: back is -z and the racket shoulder is on their right (-x)');
});

test('jump estimate follows level, sex and body composition', () => {
  const model = read('player.json').jumpModel;
  const jump = (sex, height, mass, level) => estimateJump({ sex, height, mass, level }, model);
  // At the cohort reference body the estimate returns the cohort percentile.
  assert.ok(Math.abs(jump('male', 1.78, 87.7, 'average') - 0.4115) < 1e-9);
  assert.ok(Math.abs(jump('female', 1.636, 72.5, 'good') - 0.3366) < 1e-9);
  assert.ok(jump('male', 1.7, 50, 'average') > jump('male', 1.7, 80, 'average'));
  assert.ok(jump('male', 1.7, 70, 'good') > jump('male', 1.7, 70, 'average') && jump('male', 1.7, 70, 'average') > jump('male', 1.7, 70, 'weak'));
  assert.ok(jump('female', 1.7, 70, 'average') < jump('male', 1.7, 70, 'average'));
  assert.equal(jump('male', 1.5, 200, 'weak'), model.minimumCm / 100);
});

test('a contact above standing reach plus jump is reported as out of reach', () => {
  const player = read('player.json');
  const pose = reachPose({ x: 0, y: 3.2, z: 5 }, 1.7, player, 0.3);
  assert.equal(pose.lift, 0.3);
  assert.equal(pose.reachable, false);
  assert.ok(Math.abs(pose.shortfall - (3.2 - pose.maxReach)) < 1e-9);
  assert.ok(Math.abs(pose.tip.y - pose.maxReach) < 1e-9);
  assert.equal(reachPose({ x: 0, y: 2.8, z: 5 }, 1.7, player, 0.3).reachable, true);
});

test('failed attempts show what an impossible stroke actually does', () => {
  const p0 = { x: -1, y: 2, z: 3 };
  assert.equal(candidatePaths(p0, court, shuttle, 'singles', { strokes: ['smash'] }).length, 0);
  const attempts = failedAttempts(p0, court, shuttle, 'singles', { strokes: ['smash'] });
  assert.equal(attempts.length, 3);
  for (const attempt of attempts) {
    // Either a fault, or in court but outside the stroke's zone (a 2 m smash that clears the net carries to the rearcourt).
    assert.ok(['net', 'out', 'short'].includes(attempt.result) || attempt.landingZone !== attempt.zone, attempt.result);
    assert.ok(attempt.v0.y <= 0 && attempt.points.length > 1);
  }
});

test('a receiver intercepts the flight only within reach plus jump', () => {
  const player = read('player.json');
  const p0 = { x: -1, y: 2, z: 3 };
  const outcome = shotOutcome(p0, launchVector(p0, 34.6, 10, 0), court, flight, 'singles');
  // Standing in line with the flight, just in front of where it lands (crouching is not modelled, so not too low).
  const near = interceptPose(outcome.points, { x: -0.8, z: outcome.landing.z + 0.4 }, 1.75, player, 0.4);
  assert.ok(near && near.contact.z < 0 && near.lift <= 0.4);
  const chain = Math.hypot(near.contact.x - near.shoulder.x, near.contact.y - near.shoulder.y, near.contact.z - near.shoulder.z);
  assert.ok(chain <= 0.386 * 1.75 + 0.54 + 1e-6);
  assert.equal(interceptPose(outcome.points, { x: 2.5, z: -6.5 }, 1.75, player, 0.4), null);
});

test('an incoming lob is met at its highest reachable point, and a stand position is suggested', () => {
  const player = read('player.json');
  const clears = crossing => clearsNet(court.equipment.net, crossing);
  const from = { x: 0, y: 2.3, z: -6 };
  const flat = aimAt(from, { x: -1, z: 6 }, 47.76, flight, { clears });
  const lob = aimAt(from, { x: -1, z: 6 }, 47.76, flight, { clears, prefer: 'high' });
  assert.ok(lob.angle > flat.angle && Math.max(...lob.points.map(p => p[1])) > 5);
  const jump = 0.4;
  const stand = suggestStand(lob.points, 'A', 1.75, player, jump);
  const pose = highestContact(lob.points, stand.body, 1.75, player, jump);
  assert.ok(pose && pose.contact.z > 0 && pose.lift <= jump + 1e-9);
  assert.ok(pose.contact.y > 2.65, 'met above standing reach');
  // Every reachable point is no higher than the chosen contact.
  const first = interceptPose(lob.points, stand.body, 1.75, player, jump);
  assert.ok(first.contact.y <= pose.contact.y + 1e-9);
  // Standing 2.5 m away sideways the shuttle is out of reach.
  assert.equal(highestContact(lob.points, { x: stand.body.x + 2.5, z: stand.body.z }, 1.75, player, jump), null);
});

test('an out-of-reach or sideways shuttle is a miss with a closest attempt', () => {
  const player = read('player.json');
  const clears = crossing => clearsNet(court.equipment.net, crossing);
  const lob = aimAt({ x: 0, y: 2.3, z: -5.5 }, { x: -1, z: 5.6 }, 47.76, flight, { clears, prefer: 'high' });
  const overhead = player.overhead.minArmElevationDeg * Math.PI / 180;
  // Racket shoulder about 1.06 m to the side of the flight: reachable with a flat arm, but not as an overhead contact.
  const side = { x: -1 + 0.83, z: 5.3 };
  assert.ok(highestContact(lob.points, side, 1.75, player, 0.4));
  assert.equal(highestContact(lob.points, side, 1.75, player, 0.4, overhead), null);
  const far = { x: 2, z: 3 };
  assert.equal(highestContact(lob.points, far, 1.75, player, 0.4), null);
  const miss = closestMiss(lob.points, far, 1.75, player, 0.4);
  assert.equal(miss.reachable, false);
  assert.ok(miss.shortfall > 0 && miss.lift <= 0.4 && miss.contact.z > 0);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  assert.ok(Math.abs(dist(miss.tip, miss.contact) - miss.shortfall) < 1e-9);
});
