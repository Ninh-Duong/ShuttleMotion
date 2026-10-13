// Turns a lesson (backend/lessons/*.json) into flight segments, one per step, with the same physics as the shot lab.
// Step 0's contact is in front of its hitter at shot.contactHeight; every later contact is where that step's hitter
// intercepts the previous flight. A final step may have no shot: its receivedBy player takes the last flight, or the
// shuttle lands when there is no receivedBy. Throws with the lesson and step when a shot cannot be played or reached, so lesson
// data is checked by the tests and never silently drawn wrong.
import { aimAt, clearsNet, highestContact, interceptPose, playerToWorld } from './shuttle-physics.mjs';

// Overhead strokes are taken as high as the player can reach (with a jump, arm at least minArmElevationDeg up).
const OVERHEAD = new Set(['smash', 'clear', 'drop']);

const other = team => (team === 'A' ? 'B' : 'A');

export function playerPosition(lesson, step, id) {
  return playerToWorld(lesson.players[id].team, { ...step.positions[id], height: 0 });
}

// First contact: in front of the hitter, towards the net (ponytail: fixed 0.4 m, an illustration, not a technique).
function firstContact(lesson, step) {
  const { by, contactHeight } = step.shot;
  const p = step.positions[by];
  return playerToWorld(lesson.players[by].team, { left: p.left, fromNet: p.fromNet - 0.4, height: contactHeight });
}

export function buildTimeline(lesson, { court, flight, speeds, player, height, jump }) {
  const clears = crossing => clearsNet(court.equipment.net, crossing);
  const segments = [];
  let contact = firstContact(lesson, lesson.steps[0]);
  lesson.steps.forEach((step, i) => {
    if (!step.shot) return;
    const { by, type, to, arc } = step.shot;
    const where = `${lesson.id} step ${i + 1}`;
    const target = playerToWorld(other(lesson.players[by].team), { ...to, height: 0 });
    const path = aimAt(contact, target, step.shot.speed ?? speeds[type].speed, flight, { clears, prefer: arc === 'high' ? 'high' : 'flat' });
    if (!path) throw new Error(`${where}: the ${type} cannot reach its target over the net`);
    const next = lesson.steps[i + 1];
    let end = path.points.length - 1;
    let receiver = null;
    const catcher = next?.shot?.by ?? next?.receivedBy;
    if (catcher) {
      // Other strokes are taken without jumping when possible, and with a jump only when they must.
      const body = playerPosition(lesson, next, catcher);
      const overhead = OVERHEAD.has(next.shot?.type) && highestContact(path.points, body, height, player, jump, player.overhead.minArmElevationDeg * Math.PI / 180);
      const pose = overhead || interceptPose(path.points, body, height, player, 0) || interceptPose(path.points, body, height, player, jump);
      if (!pose) throw new Error(`${where}: ${catcher} cannot reach the ${type} from their next position`);
      end = pose.index;
      receiver = { id: catcher, pose };
    }
    segments.push({ step: i, contact, points: path.points.slice(0, end + 1), duration: end * 0.01, receiver, landing: catcher ? null : path.landing });
    contact = receiver?.pose.contact;
  });
  return segments;
}
