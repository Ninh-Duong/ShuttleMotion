import { readFile } from 'node:fs/promises';

// Lesson content and its business rules. Lessons are drafts derived from cited sources until a coach reviews them.
const STATUSES = new Set(['draft-source-derived', 'coach-reviewed']);
const SERVES = new Set(['lowServe', 'flickServe']);
const ARCS = new Set(['flat', 'high']);
// Players may stand this far behind the back boundary (a project choice, not a BWF run-off requirement).
const RUN_OFF_M = 0.8;

// Same convention as playerToWorld in frontend/shuttle-physics.mjs: side A is z > 0 and faces -z (left is -x).
const toWorld = (team, { left, fromNet }) => (team === 'A' ? { x: -left, z: fromNet } : { x: left, z: -fromNet });
const inside = (box, { x, z }) => x >= box.xMin && x <= box.xMax && z >= box.zMin && z <= box.zMax;

export async function loadLessons(url = new URL('./lessons/doubles.json', import.meta.url)) {
  return JSON.parse(await readFile(url, 'utf8'));
}

// Returns a list of problems; an empty list means the lesson set is valid.
export function validateLessons(data, { court, rules }) {
  const errors = [];
  const fail = (where, message) => errors.push(`${where}: ${message}`);
  const text = (where, value) => {
    if (!value?.en?.trim() || !value?.vi?.trim()) fail(where, 'needs non-empty en and vi text');
  };
  const sources = new Map((data.sources ?? []).map(source => [source.id, source]));
  const usable = id => sources.has(id) && sources.get(id).status !== 'notUsedYet';
  for (const [type, entry] of Object.entries(data.speeds ?? {})) {
    if (!(entry.speed > 0)) fail(`speed ${type}`, 'needs a positive speed');
    if (!(entry.sourceId ? usable(entry.sourceId) : entry.status === 'illustrative')) fail(`speed ${type}`, 'needs a usable sourceId or status "illustrative"');
  }
  const maxServeHeight = rules.rules.find(rule => rule.id === 'service-action')?.limits?.maxShuttleHeightAtContactM;
  const serviceAreas = court.serviceAreas.rectangles.filter(area => area.mode === 'doubles');
  const halfWidth = court.dimensions.doublesWidth / 2;
  const halfLength = court.dimensions.length / 2;
  const ids = new Set();

  for (const lesson of data.lessons ?? []) {
    const at = lesson.id ?? '(lesson without id)';
    if (!lesson.id || ids.has(lesson.id)) fail(at, 'needs a unique id');
    ids.add(lesson.id);
    if (!data.categories?.includes(lesson.category)) fail(at, `unknown category ${lesson.category}`);
    if (!STATUSES.has(lesson.status)) fail(at, `unknown status ${lesson.status}`);
    text(`${at} title`, lesson.title);
    text(`${at} objective`, lesson.objective);
    if (!lesson.sources?.length || !lesson.sources.every(ref => usable(ref.sourceId) && ref.pages)) fail(at, 'every source needs a usable sourceId and pages');
    const players = lesson.players ?? {};
    const team = id => players[id]?.team;
    for (const side of ['A', 'B']) {
      if (Object.values(players).filter(p => p.team === side).length !== 2) fail(at, `needs two players on side ${side}`);
    }
    const steps = lesson.steps ?? [];
    if (steps.length < 2) fail(at, 'needs at least two steps');

    steps.forEach((step, i) => {
      const where = `${at} step ${i + 1}`;
      text(`${where} caption`, step.caption);
      if (!step.quote?.text?.trim() || !step.quote?.pages) fail(where, 'needs a verbatim quote with pages');
      // A quote comes from the lesson's first source unless it names another of the lesson's sources.
      if (step.quote?.sourceId && !lesson.sources?.some(ref => ref.sourceId === step.quote.sourceId)) fail(where, 'quote sourceId must be one of the lesson sources');
      for (const id of Object.keys(players)) {
        const p = step.positions?.[id];
        if (!p || Math.abs(p.left) > halfWidth || !(p.fromNet > 0 && p.fromNet <= halfLength + RUN_OFF_M)) fail(where, `position of ${id} is missing or off the court area`);
      }
      const last = i === steps.length - 1;
      const shot = step.shot;
      if (!shot) {
        if (!last) fail(where, 'only the last step may have no shot');
        if (step.receivedBy && !players[step.receivedBy]) fail(where, `unknown receivedBy ${step.receivedBy}`);
        return;
      }
      if (!players[shot.by]) fail(where, `unknown hitter ${shot.by}`);
      if (!data.speeds?.[shot.type]) fail(where, `no speed for shot type ${shot.type}`);
      if (!ARCS.has(shot.arc)) fail(where, `arc must be flat or high`);
      if (!shot.to || Math.abs(shot.to.left) > halfWidth || !(shot.to.fromNet > 0 && shot.to.fromNet <= halfLength)) fail(where, 'target is missing or outside the court');
      if (shot.speed !== undefined && !(shot.speed > 0 && shot.speed <= 80)) fail(where, 'speed override must be between 0 and 80 m/s');
      const next = steps[i + 1];
      const catcher = next?.shot?.by ?? next?.receivedBy;
      if (catcher && team(catcher) === team(shot.by)) fail(where, `${catcher} must be on the other side from ${shot.by}`);
    });

    const first = steps[0]?.shot;
    if (!first || !(first.contactHeight > 0)) fail(`${at} step 1`, 'the first shot needs a contactHeight');
    else if (SERVES.has(first.type)) {
      const where = `${at} step 1`;
      if (!(first.contactHeight <= maxServeHeight)) fail(where, `serve contact must be at most ${maxServeHeight} m (Law 9.1.6)`);
      const server = toWorld(team(first.by), steps[0].positions[first.by]);
      const serviceCourt = serviceAreas.find(area => inside(area.standing, server));
      if (!serviceCourt) fail(where, 'the server must stand inside a doubles service court');
      else {
        const diagonal = serviceAreas.find(area => area.id === serviceCourt.diagonalReceiverId);
        const receiverId = steps[1]?.shot?.by ?? steps[1]?.receivedBy;
        const target = toWorld(team(first.by) === 'A' ? 'B' : 'A', first.to);
        if (!inside(diagonal.landing, target)) fail(where, 'the serve must land in the diagonally opposite service court');
        if (receiverId && !inside(diagonal.standing, toWorld(team(receiverId), steps[0].positions[receiverId]))) fail(where, `the receiver ${receiverId} must stand in the diagonally opposite service court`);
      }
    }
  }
  return errors;
}
