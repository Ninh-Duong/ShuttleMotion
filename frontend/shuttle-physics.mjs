// Point-mass shuttle with quadratic drag: m dv/dt = m g - 0.5 rho S Cd |v| v (Clanet 2015, Eq. 6).
// Positions are court.json world coordinates in metres: x across, y up, z along, net at z = 0.

const rad = deg => deg * Math.PI / 180;
export const strokeColours = { smash: '#ff6b5b', clear: '#4f9fe8', drop: '#a875e8' };

// Side A is z > 0 (player faces -z, their left is -x); side B is z < 0 (their left is +x).
export function playerToWorld(side, { left, fromNet, height }) {
  const s = side === 'A' ? 1 : -1;
  return { x: -s * left || 0, y: height, z: s * fromNet || 0 };
}

export function dragFactor(flight) {
  const area = Math.PI * (flight.diameterM / 2) ** 2;
  return 0.5 * flight.airDensity * area * flight.dragCoefficient / flight.massKg;
}

// stop(next, v, previous) ends the flight early (e.g. at a receiver's contact height) and returns that state.
export function simulate(p0, v0, flight, { dt = 0.001, stop } = {}) {
  const k = dragFactor(flight);
  let p = { ...p0 };
  let v = { ...v0 };
  const points = [[p.x, p.y, p.z]];
  let netCrossing = null;
  for (let step = 1; step <= 5 / dt; step++) {
    const speed = Math.hypot(v.x, v.y, v.z);
    v = { x: v.x - k * speed * v.x * dt, y: v.y - (flight.gravity + k * speed * v.y) * dt, z: v.z - k * speed * v.z * dt };
    const next = { x: p.x + v.x * dt, y: p.y + v.y * dt, z: p.z + v.z * dt };
    if (!netCrossing && Math.sign(next.z) !== Math.sign(p.z) && p.z !== 0) {
      const t = p.z / (p.z - next.z);
      netCrossing = { x: p.x + (next.x - p.x) * t, y: p.y + (next.y - p.y) * t };
    }
    if (stop?.(next, v, p)) {
      points.push([next.x, next.y, next.z]);
      return { points, landing: null, position: next, velocity: v, netCrossing, time: step * dt, speed: Math.hypot(v.x, v.y, v.z) };
    }
    if (next.y <= 0) {
      const t = p.y / (p.y - next.y);
      const landing = { x: p.x + (next.x - p.x) * t, y: 0, z: p.z + (next.z - p.z) * t };
      points.push([landing.x, 0, landing.z]);
      return { points, landing, velocity: v, netCrossing, time: (step - 1 + t) * dt, speed };
    }
    p = next;
    if (step % 10 === 0) points.push([p.x, p.y, p.z]);
  }
  return { points, landing: null, velocity: v, netCrossing, time: 5, speed: Math.hypot(v.x, v.y, v.z) };
}

// The shuttle flips within about 20 ms of the hit (Cohen et al. 2015), after which the cork leads along v.
export function receive(path, contactHeight, flight) {
  const [x, y, z] = path.points[0];
  const side = Math.sign(z);
  // Must descend through the contact height on the far side; a shuttle already below it there cannot be met at that height.
  const stop = (p, v, previous) => Math.sign(p.z) === -side && v.y < 0 && previous.y > contactHeight && p.y <= contactHeight;
  const state = simulate({ x, y, z }, path.v0, flight, { stop });
  if (!state.position) return null;
  const { velocity: v, speed } = state;
  return {
    position: state.position, velocity: v, speed, time: state.time, points: state.points,
    corkDirection: { x: v.x / speed, y: v.y / speed, z: v.z / speed },
    descentAngle: Math.asin(-v.y / speed) * 180 / Math.PI,
    momentum: flight.massKg * speed,
    energy: 0.5 * flight.massKg * speed ** 2
  };
}

// Average force to stop the shuttle over an assumed contact time. No source gives racket-shuttle contact time.
export function averageForce(momentum, contactMs, gravity = 9.81) {
  const newtons = momentum / (contactMs / 1000);
  return { newtons, kgf: newtons / gravity };
}

// Net top follows the same sag curve as the 3D net: centre height at x = 0 rising to the sideline height at the posts.
export function netHeightAt(net, x) {
  return net.centreTopHeight + (net.sidelineTopHeight - net.centreTopHeight) * (x / (net.widthMin / 2)) ** 2;
}

// A shuttle must pass over the net and between the posts.
export const clearsNet = (net, crossing) => Math.abs(crossing.x) <= net.widthMin / 2 && crossing.y > netHeightAt(net, crossing.x);

// Without lift or wind the path stays in the vertical plane towards the target, so only the elevation is searched.
// prefer: 'flat' returns the flattest valid solution, 'high' the highest (a lob to the same spot).
export function aimAt(p0, target, speed, flight, { clears, minAngle = -60, maxAngle = 80, prefer = 'flat' } = {}) {
  const dx = target.x - p0.x;
  const dz = target.z - p0.z;
  const distance = Math.hypot(dx, dz);
  const launch = angle => ({ x: speed * Math.cos(rad(angle)) * dx / distance, y: speed * Math.sin(rad(angle)), z: speed * Math.cos(rad(angle)) * dz / distance });
  const miss = angle => {
    const { landing } = simulate(p0, launch(angle), flight);
    return landing ? Math.hypot(landing.x - p0.x, landing.z - p0.z) - distance : Infinity;
  };
  let previous = miss(minAngle);
  let found = null;
  for (let a = minAngle + 1; a <= maxAngle; a++) {
    const current = miss(a);
    if (Math.sign(current) !== Math.sign(previous)) {
      let lo = a - 1, hi = a, fLo = previous;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        const fMid = miss(mid);
        if (Math.sign(fMid) === Math.sign(fLo)) { lo = mid; fLo = fMid; } else hi = mid;
      }
      const angle = (lo + hi) / 2;
      const v0 = launch(angle);
      const result = simulate(p0, v0, flight);
      if (result.landing && (!clears || (result.netCrossing && clears(result.netCrossing)))) {
        found = { angle, v0, ...result };
        if (prefer === 'flat') return found;
      }
    }
    previous = current;
  }
  return found;
}

// Stroke attempts: BWF L1 forecourt / midcourt / rearcourt thirds x left / centre / right lanes of the opposite half,
// limited to each stroke's zones and launch direction. Lanes are named from the hitter's view (A faces -z, left is -x).
function strokeAttempts(p0, court, shuttle, mode, { speed, strokes } = {}) {
  const s = p0.z > 0 ? -1 : 1;
  const half = court.dimensions.length / 2;
  const width = mode === 'doubles' ? court.dimensions.doublesWidth : court.dimensions.singlesWidth;
  const attempts = [];
  for (const [zone, depth] of [['front', 1 / 6], ['mid', 3 / 6], ['rear', 5 / 6]]) {
    for (const [lane, offset] of [['left', -1 / 3], ['centre', 0], ['right', 1 / 3]]) {
      const target = { x: -s * offset * width || 0, z: s * depth * half };
      for (const stroke of shuttle.strokes.items) {
        if (!stroke.zones.includes(zone) || (strokes && !strokes.includes(stroke.id))) continue;
        attempts.push({ id: `${stroke.id}-${zone}-${lane}`, stroke: stroke.id, zone, lane, target, speed: speed || stroke.speed,
          minAngle: stroke.launch === 'upward' ? 0 : -60, maxAngle: stroke.launch === 'downward' ? 0 : 80 });
      }
    }
  }
  return attempts;
}

// strokes: optional list of stroke ids to try; speed: optional launch speed replacing the published one.
export function candidatePaths(p0, court, shuttle, mode, options = {}) {
  if (!(p0.y > 0) || p0.z === 0) return [];
  const rally = court.rallyAreas.rectangles.find(r => r.id === mode);
  const clears = crossing => clearsNet(court.equipment.net, crossing);
  const paths = [];
  for (const { minAngle, maxAngle, speed, ...attempt } of strokeAttempts(p0, court, shuttle, mode, options)) {
    const path = aimAt(p0, attempt.target, speed, shuttle.flight, { clears, minAngle, maxAngle });
    if (!path) continue;
    const { x, z } = path.landing;
    if (x < rally.xMin || x > rally.xMax || z < rally.zMin || z > rally.zMax || Math.sign(z) !== Math.sign(attempt.target.z)) continue;
    paths.push({ ...attempt, ...path });
  }
  return paths;
}

// When no valid path exists: for each target, the allowed launch angle whose shot ends nearest the target, with its
// real outcome (usually 'net' or 'out'), so learners can see why the stroke fails from here.
export function failedAttempts(p0, court, shuttle, mode, options = {}) {
  if (!(p0.y > 0) || p0.z === 0) return [];
  return strokeAttempts(p0, court, shuttle, mode, options).map(({ minAngle, maxAngle, speed, ...attempt }) => {
    const dx = attempt.target.x - p0.x;
    const dz = attempt.target.z - p0.z;
    const distance = Math.hypot(dx, dz);
    let best = null;
    for (let angle = minAngle; angle <= maxAngle; angle++) {
      const v0 = { x: speed * Math.cos(rad(angle)) * dx / distance, y: speed * Math.sin(rad(angle)), z: speed * Math.cos(rad(angle)) * dz / distance };
      const outcome = shotOutcome(p0, v0, court, shuttle.flight, mode);
      const end = outcome.landing ?? outcome.position;
      const miss = end ? Math.hypot(end.x - attempt.target.x, end.z - attempt.target.z) : Infinity;
      if (!best || miss < best.miss) best = { ...attempt, ...outcome, zone: attempt.zone, lane: attempt.lane, landingZone: outcome.zone, landingLane: outcome.lane, angle, v0, miss };
    }
    return best;
  });
}

// Lowest contact height (same x, z) from which the stroke has at least one candidate, or null up to maxHeight.
export function minimumHeight(p0, court, shuttle, mode, options, { step = 0.05, maxHeight = 4 } = {}) {
  for (let i = 1; i * step <= maxHeight + 1e-9; i++) {
    const y = Math.round(i * step * 1000) / 1000;
    if (candidatePaths({ ...p0, y }, court, shuttle, mode, options).length) return y;
  }
  return null;
}

// Hitter frame: side A faces -z with their right at +x; side B faces +z with their right at -x.
const hitterFrame = z => (z > 0 ? { forward: -1, right: 1 } : { forward: 1, right: -1 });

// Launch along the racket-face normal (McErlain-Naylor et al. 2020 measure shuttle direction from that normal;
// off-centre hits deviate a few degrees, which this ignores). tilt > 0 opens the face upward; direction > 0 is the hitter's right.
export function launchVector(p0, speed, tilt, direction) {
  const { forward, right } = hitterFrame(p0.z);
  const flat = speed * Math.cos(rad(tilt));
  return { x: right * flat * Math.sin(rad(direction)), y: speed * Math.sin(rad(tilt)), z: forward * flat * Math.cos(rad(direction)) };
}

// Where a hit actually goes: 'net' (stopped by the net or outside the posts), 'short' (lands on the hitter's side),
// 'out' (beyond the selected rally area) or 'in' with the zone and lane from the hitter's view.
export function shotOutcome(p0, v0, court, flight, mode) {
  const net = court.equipment.net;
  const side = Math.sign(p0.z);
  const crossing = (a, b) => { const t = a.z / (a.z - b.z); return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };
  const stop = (p, v, previous) => Math.sign(previous.z) === side && Math.sign(p.z) !== side && !clearsNet(net, crossing(previous, p));
  const flightPath = simulate(p0, v0, flight, { stop });
  const apex = Math.max(...flightPath.points.map(point => point[1]));
  const base = { ...flightPath, apex };
  if (flightPath.position) return { ...base, result: 'net', contact: flightPath.position };
  if (!flightPath.landing) return { ...base, result: 'out' };
  const { x, z } = flightPath.landing;
  if (Math.sign(z) === side) return { ...base, result: 'short' };
  const rally = court.rallyAreas.rectangles.find(r => r.id === mode);
  if (x < rally.xMin || x > rally.xMax || z < rally.zMin || z > rally.zMax) return { ...base, result: 'out' };
  const depth = Math.abs(z) / (court.dimensions.length / 2);
  const lateral = x * hitterFrame(p0.z).right;
  const width = mode === 'doubles' ? court.dimensions.doublesWidth : court.dimensions.singlesWidth;
  return {
    ...base, result: 'in',
    zone: depth < 1 / 3 ? 'front' : depth < 2 / 3 ? 'mid' : 'rear',
    lane: lateral < -width / 6 ? 'left' : lateral > width / 6 ? 'right' : 'centre'
  };
}

// Six corners: BWF L1 forecourt / midcourt / rearcourt x the two sides of the opposite half, named from the hitter's view.
// ponytail: corner points sit 20% inside the sideline at the zone centres; let the coach move them if lessons need it.
export function sixCorners(p0, court, mode) {
  const { forward, right } = hitterFrame(p0.z);
  const half = court.dimensions.length / 2;
  const width = mode === 'doubles' ? court.dimensions.doublesWidth : court.dimensions.singlesWidth;
  const corners = [];
  for (const [zone, depth] of [['front', 1 / 6], ['mid', 3 / 6], ['rear', 5 / 6]]) {
    for (const [lane, sideSign] of [['left', -1], ['right', 1]]) {
      corners.push({ id: `${zone}-${lane}`, zone, lane, x: right * sideSign * 0.4 * width, z: forward * depth * half });
    }
  }
  return corners;
}

// Racket-face tilt and direction that send the shuttle to a target at this speed (the flattest solution), or null.
export function solveTarget(p0, target, speed, court, flight) {
  const path = aimAt(p0, target, speed, flight, { clears: crossing => clearsNet(court.equipment.net, crossing) });
  if (!path) return null;
  const { forward, right } = hitterFrame(p0.z);
  const direction = Math.atan2(path.v0.x * right, path.v0.z * forward) * 180 / Math.PI;
  return { tilt: path.angle, direction, path };
}

// Straight-arm reach for the player figure (player.json): racket shoulder, grip hand and racket meet the contact point.
// Above full standing reach the body is lifted (the jump, capped at maxJump); below it the body steps back so the
// contact is in front. When the contact is beyond reach, tip is where the racket centre ends and shortfall is the gap.
export function reachPose(contact, height, player, maxJump = Infinity) {
  const s = player.segments;
  const { forward, right } = hitterFrame(contact.z);
  const arm = (s.upperArm + s.forearm + s.hand / 2) * height; // shoulder to the middle of the grip hand
  const racket = (player.racket.overallLengthMm - player.racket.stringAreaLengthMm / 2) / 1000; // butt to string-bed centre
  const chain = arm + racket;
  const shoulderStand = s.shoulderHeight * height;
  const rise = contact.y - shoulderStand;
  const lift = Math.min(maxJump, Math.max(0, rise - chain));
  const back = Math.sqrt(Math.max(0, chain ** 2 - Math.min(rise, chain) ** 2));
  const shoulder = { x: contact.x, y: shoulderStand + lift, z: contact.z - forward * back };
  const gap = Math.hypot(contact.x - shoulder.x, contact.y - shoulder.y, contact.z - shoulder.z);
  const along = d => ({ x: shoulder.x + (contact.x - shoulder.x) * d / gap, y: shoulder.y + (contact.y - shoulder.y) * d / gap, z: shoulder.z + (contact.z - shoulder.z) * d / gap });
  const halfWidth = s.shoulderWidth / 2 * height;
  return {
    lift, standingReach: shoulderStand + chain, maxReach: shoulderStand + chain + maxJump,
    reachable: gap <= chain + 1e-9, shortfall: Math.max(0, gap - chain),
    body: { x: shoulder.x - right * halfWidth, z: shoulder.z }, halfWidth, shoulder, hand: along(arm), tip: gap <= chain + 1e-9 ? contact : along(chain), contact
  };
}

// Estimated countermovement jump (m) from sex, height (m), mass (kg) and level, following player.json jumpModel.
export function estimateJump({ sex, height, mass, level }, model) {
  const norm = model.norms[sex];
  const { sayers, bodyFat } = model;
  const fatFree = (h, m) => {
    const fat = bodyFat.perBmi * m / h ** 2 + bodyFat.perYear * norm.ageY + (sex === 'male' ? bodyFat.male : 0) + bodyFat.constant;
    return m * (1 - fat / 100);
  };
  const power = (sayers.perCmJump * norm.percentilesCm[level] + sayers.perKgMass * norm.massKg + sayers.constant)
    * fatFree(height, mass) / fatFree(norm.heightM, norm.massKg);
  return Math.max(model.minimumCm, (power - sayers.constant - sayers.perKgMass * mass) / sayers.perCmJump) / 100;
}

// Straight-arm reach geometry of a player standing at body (x, z): racket-shoulder base, arm + racket chain length.
function reachFrame(body, height, player) {
  const s = player.segments;
  const { right } = hitterFrame(body.z);
  const racket = (player.racket.overallLengthMm - player.racket.stringAreaLengthMm / 2) / 1000;
  const arm = (s.upperArm + s.forearm + s.hand / 2) * height;
  const halfWidth = s.shoulderWidth / 2 * height;
  return { arm, chain: arm + racket, halfWidth, right, base: { x: body.x + right * halfWidth, y: s.shoulderHeight * height, z: body.z } };
}

// Lift needed for a point (x, y, z) from frame f: null if out of horizontal reach, too low (no crouch modelled), or
// with the arm flatter than minElevation (radians above horizontal) at that lift.
function liftFor([x, y, z], f, minElevation = -Infinity) {
  const d = Math.hypot(x - f.base.x, z - f.base.z);
  if (d > f.chain) return null;
  const vertical = Math.sqrt(f.chain ** 2 - d ** 2);
  if (y < f.base.y - vertical) return null;
  const lift = Math.max(0, y - f.base.y - vertical);
  return Math.atan2(y - f.base.y - lift, d) < minElevation ? null : lift;
}

function poseAt([x, y, z], f, lift, body, index) {
  const contact = { x, y, z };
  const shoulder = { ...f.base, y: f.base.y + lift };
  const gap = Math.hypot(x - shoulder.x, y - shoulder.y, z - shoulder.z) || 1;
  const t = f.arm / gap;
  const hand = { x: shoulder.x + (x - shoulder.x) * t, y: shoulder.y + (y - shoulder.y) * t, z: shoulder.z + (z - shoulder.z) * t };
  return { lift, shoulder, hand, tip: contact, contact, body, halfWidth: f.halfWidth, index };
}

// A player standing at body (x, z): the first point of the flight (on their side) within straight-arm reach plus a
// jump of up to maxJump, or null.
export function interceptPose(points, body, height, player, maxJump, minElevation) {
  const f = reachFrame(body, height, player);
  for (let i = 0; i < points.length; i++) {
    if (Math.sign(points[i][2]) !== Math.sign(body.z)) continue;
    const lift = liftFor(points[i], f, minElevation);
    if (lift !== null && lift <= maxJump) return poseAt(points[i], f, lift, body, i);
  }
  return null;
}

// The highest reachable point of an incoming flight for a player standing at body: where a smash is hit from.
// minElevation (radians) rejects contacts with the arm flatter than that, e.g. for overhead strokes.
export function highestContact(points, body, height, player, maxJump, minElevation) {
  const f = reachFrame(body, height, player);
  let best = null;
  points.forEach((point, i) => {
    if (Math.sign(point[2]) !== Math.sign(body.z)) return;
    const lift = liftFor(point, f, minElevation);
    if (lift !== null && lift <= maxJump && (!best || point[1] > best.contact.y)) best = poseAt(point, f, lift, body, i);
  });
  return best;
}

// Where to stand to meet an incoming flight at full reach (standing reach + jump) as it descends on the player's side:
// the racket shoulder directly under that point. Falls back to the highest point there if the flight stays lower.
export function suggestStand(points, side, height, player, maxJump) {
  const sign = side === 'A' ? 1 : -1;
  const f = reachFrame({ x: 0, z: sign }, height, player);
  const top = f.base.y + f.chain + maxJump;
  const own = points.filter(point => Math.sign(point[2]) === sign);
  if (!own.length) return null;
  const apex = own.reduce((best, point) => (point[1] > best[1] ? point : best));
  const target = apex[1] <= top ? apex : own.find((point, i) => i > own.indexOf(apex) && point[1] <= top) ?? apex;
  return { body: { x: target[0] - f.right * f.halfWidth, z: target[2] }, contact: { x: target[0], y: Math.min(target[1], top), z: target[2] } };
}

// When the flight is out of reach: the attempt at the moment the racket gets closest to the shuttle, jumping as needed
// up to maxJump, with the straight arm and racket stretched towards it and stopping short (a miss). Moments where the
// arm would point at least minElevation above horizontal (an overhead attempt, as for a hit) are preferred.
export function closestMiss(points, body, height, player, maxJump, minElevation = -Infinity) {
  const f = reachFrame(body, height, player);
  const attempts = [];
  points.forEach(([x, y, z], index) => {
    if (Math.sign(z) !== Math.sign(body.z)) return;
    const d = Math.hypot(x - f.base.x, z - f.base.z);
    const needed = d > f.chain ? y - f.base.y : y - f.base.y - Math.sqrt(f.chain ** 2 - d ** 2);
    const lift = Math.min(maxJump, Math.max(0, needed));
    const rise = y - f.base.y - lift;
    attempts.push({ index, contact: { x, y, z }, lift, gap: Math.hypot(d, rise), elevation: Math.atan2(rise, d) });
  });
  if (!attempts.length) return null;
  const overhead = attempts.filter(a => a.elevation >= minElevation);
  const { index, contact, lift, gap } = (overhead.length ? overhead : attempts).reduce((best, a) => (a.gap < best.gap ? a : best));
  const shoulder = { ...f.base, y: f.base.y + lift };
  const along = k => ({ x: shoulder.x + (contact.x - shoulder.x) * k / gap, y: shoulder.y + (contact.y - shoulder.y) * k / gap, z: shoulder.z + (contact.z - shoulder.z) * k / gap });
  return { lift, shoulder, hand: along(f.arm), tip: along(Math.min(f.chain, gap)), contact, body, halfWidth: f.halfWidth, index,
    reachable: false, shortfall: Math.max(0, gap - f.chain) };
}

// Position and direction along recorded flight points (one every 10 ms of flight) at time t (s).
export function sampleFlight(points, time) {
  const f = Math.max(0, Math.min(points.length - 1, time / 0.01));
  const i = Math.max(0, Math.min(Math.floor(f), points.length - 2));
  const k = f - i;
  const [a, b] = [points[i], points[i + 1] ?? points[i]];
  return { position: { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, z: a[2] + (b[2] - a[2]) * k }, direction: { x: b[0] - a[0], y: b[1] - a[1], z: b[2] - a[2] } };
}
