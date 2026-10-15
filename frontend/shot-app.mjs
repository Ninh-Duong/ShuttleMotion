import { FLIGHT_SAMPLE_S, aimAt, clearsNet, closestMiss, estimateJump, evaluateInterception, highestContact, interceptPose, launchVector, playerToWorld, reachPose, sampleFlight, shotOutcome, simulate, sixCorners, solveTarget, suggestStand } from './shuttle-physics.mjs';
import { applyText, formatNumber, getJson, loadCourt3d, loadLang, toggleLang, withCommon } from './ui.mjs';

const words = withCommon({
  vi: {
    kicker: 'MÔ PHỎNG CÚ ĐÁNH', title: 'Mặt vợt quyết định đường cầu.',
    intro: 'Nhập điểm tiếp cầu, tốc độ và góc mặt vợt. Quả cầu bay theo đúng thông số đó: qua lưới, vào lưới hay ra ngoài.',
    hint: 'Kéo để xoay, cuộn để phóng to', stageLabel: 'ĐƯỜNG CẦU THEO THÔNG SỐ',
    ready: '3D · Kéo thanh trượt để đổi cú đánh', loadError: 'Không tải được dữ liệu. Hãy làm mới trang.',
    hitterView: 'Góc người đánh', closeView: 'Cận cảnh', bodyHeight: 'Chiều cao (m)', mass: 'Cân nặng (kg)', sex: 'Giới tính', male: 'Nam', female: 'Nữ',
    level: 'Thể lực bật nhảy', weak: 'Yếu', average: 'Trung bình', good: 'Khá', jumpInput: 'Bật nhảy (cm, trống = ước lượng)', show: 'Hiện',
    playersTitle: 'NGƯỜI CHƠI', playerA: 'NGƯỜI CHƠI A · ĐÁNH', playerB: 'NGƯỜI CHƠI B · NHẬN',
    jumpEst: 'Bật nhảy ước lượng', jumpSet: 'Bật nhảy nhập', reachText: 'tầm với đứng', maxReach: 'tối đa',
    jumpNeed: 'cần bật', noJump: 'không cần bật; lùi lại để điểm tiếp cầu ở trước người (BWF Shuttle Time)',
    cannotReach: 'KHÔNG VỚI TỚI: thiếu', receives: 'B đỡ được ở độ cao', receivesJump: 'bật', bMisses: 'B không với tới đường cầu từ vị trí này', noCross: 'Cầu không sang tới sân B',
    receivesStanding: 'B đón tại chỗ ở độ cao', receivesMove: 'B di chuyển đón kịp ở độ cao', receivesRushed: 'B rướn người cứu cầu ở độ cao',
    bAced: 'B KHÔNG KỊP PHẢN XẠ (Cháy vợt)', bTooLate: 'B CHẠY KHÔNG KỊP (Cầu chạm đất trước)',
    flightTimeLabel: 'Thời gian bay', reactionTimeLabel: 'thời gian phản xạ', marginLabel: 'Dư', deficitLabel: 'Thiếu', travelDistLabel: 'chạy', needMove: 'cần chạy',
    toNet: 'về phía lưới', launch: 'hướng cầu bay', face: 'mặt vợt',
    run: '▶ Chạy thử', slow: 'Chậm ×0,25', incomingMode: 'Cầu bay tới', fixedMode: 'Cầu đứng yên', hitTitle: 'CÚ ĐÁNH CỦA A',
    incomingTitle: 'CẦU BAY TỚI · B ĐÁNH SANG', incomingHint: 'B đánh từ vị trí trong thẻ người chơi B. Chọn điểm cầu sẽ rơi xuống bên A nếu A không đánh.',
    inHeight: 'Độ cao B đánh (m)', inSpeed: 'Tốc độ cầu (m/s)', inLeft: 'Rơi: lệch trái của A (m)', inFromNet: 'Rơi: cách lưới (m)', arc: 'Kiểu cầu', arcHigh: 'Bổng (cao sâu)', arcFlat: 'Thấp (thẳng)',
    standLeft: 'Đứng: lệch trái (m)', standFromNet: 'Đứng: cách lưới (m)',
    hitOk: 'A ĐÁNH TRÚNG', hitMiss: 'A ĐÁNH HỤT', missShort: 'Bật hết sức vẫn thiếu', missFlat: 'Cầu đi quá ngang người: tay giơ chưa tới', missFlat2: 'so với phương ngang nên không đánh trên đầu được', missJump: 'bật', noIncoming: 'B không đưa được cầu tới điểm đó với tốc độ và kiểu cầu này.',
    meetAt: 'Tiếp cầu ở độ cao', afterIncoming: 'sau khi B đánh', arrive: 'cầu tới', jumpUsed: 'bật', of: 'trên khả năng', noJumpShort: 'không cần bật',
    suggest: 'Nên đứng', leftWord: 'lệch trái', netWord: 'cách lưới', moveBy: 'dời', useSuggest: 'Đứng vào vị trí gợi ý', noContact: 'A đánh hụt nên không có cú đánh; cầu rơi xuống sân.',
    contactTitle: 'ĐIỂM TIẾP CẦU', side: 'Phía sân', left: 'Lệch trái (m, âm = phải)', fromNet: 'Cách lưới (m)', height: 'Độ cao tiếp cầu (m)',
    powerTitle: 'TỐC ĐỘ CẦU RỜI VỢT', speed: 'Tốc độ', faceTitle: 'MẶT VỢT', tilt: 'Độ nghiêng', direction: 'Hướng đánh',
    down: 'chúc xuống', up: 'ngửa lên', flat: 'thẳng đứng', toLeft: 'sang trái', toRight: 'sang phải', straight: 'thẳng',
    cornersTitle: '6 GÓC SÂN · CẦN MẶT VỢT THẾ NÀO',
    note: 'Cầu bay theo pháp tuyến mặt vợt khi tiếp đúng tâm (McErlain-Naylor 2020). Lực cản không khí theo Cohen 2015. Tốc độ người mới / có tập luyện: Zhang 2016 (đập cầu đứng). Mô hình vật lý, không phải lời khuyên kỹ thuật.',
    results: { in: 'TRONG SÂN', net: 'VÀO LƯỚI', short: 'KHÔNG QUA LƯỚI', out: 'RA NGOÀI' },
    netHit: 'Chạm lưới ở độ cao', underNet: 'Đi dưới lưới ở độ cao', wide: 'Đi ra ngoài cột lưới', netAt: 'qua lưới cao', above: 'cao hơn mép lưới',
    landAt: 'Rơi tại', after: 'sau', apex: 'điểm cao nhất', landingSpeed: 'tốc độ khi chạm đất',
    reach: 'Không tới được ở tốc độ này', apply: 'Áp dụng',
    levels: { novice: 'người mới', trained: 'có tập luyện', elite: 'VĐV đỉnh cao' },
    zones: { front: 'Lưới', mid: 'Giữa sân', rear: 'Cuối sân' }
  },
  en: {
    kicker: 'SHOT LAB', title: 'The racket face decides the flight.',
    intro: 'Enter the contact point, speed and racket-face angle. The shuttle flies exactly as entered: over the net, into it, or out.',
    hint: 'Drag to orbit, scroll to zoom', stageLabel: 'FLIGHT FROM THE ENTERED HIT',
    ready: '3D · Move the sliders to change the hit', loadError: 'Data could not be loaded. Please refresh.',
    hitterView: "Hitter's view", closeView: 'Close-up', bodyHeight: 'Height (m)', mass: 'Body mass (kg)', sex: 'Sex', male: 'Male', female: 'Female',
    level: 'Jump fitness', weak: 'Weak', average: 'Average', good: 'Good', jumpInput: 'Jump (cm, empty = estimate)', show: 'Show',
    playersTitle: 'PLAYERS', playerA: 'PLAYER A · HITTER', playerB: 'PLAYER B · RECEIVER',
    jumpEst: 'Estimated jump', jumpSet: 'Entered jump', reachText: 'standing reach', maxReach: 'max',
    jumpNeed: 'needs a jump of', noJump: 'no jump needed; steps back so the contact is in front (BWF Shuttle Time)',
    cannotReach: 'OUT OF REACH: short by', receives: 'B reaches it at', receivesJump: 'jump', bMisses: 'B cannot reach the flight from this position', noCross: 'The shuttle does not reach side B',
    receivesStanding: 'B intercepts standing at', receivesMove: 'B moves and intercepts at', receivesRushed: 'B scrambles and intercepts at',
    bAced: 'B CAUGHT FLAT-FOOTED (Aced)', bTooLate: 'B OUT OF TIME (Shuttle lands first)',
    flightTimeLabel: 'Flight time', reactionTimeLabel: 'reaction time', marginLabel: 'Margin', deficitLabel: 'Short by', travelDistLabel: 'move', needMove: 'needs to move',
    toNet: 'towards the net', launch: 'launch', face: 'racket face',
    run: '▶ Run test', slow: 'Slow ×0.25', incomingMode: 'Incoming shuttle', fixedMode: 'Fixed shuttle', hitTitle: "A'S HIT",
    incomingTitle: 'INCOMING SHUTTLE · HIT BY B', incomingHint: "B hits from the position in player B's card. Choose where the shuttle would land on A's side if A did not hit it.",
    inHeight: 'B contact height (m)', inSpeed: 'Shuttle speed (m/s)', inLeft: "Lands: A's left offset (m)", inFromNet: 'Lands: from net (m)', arc: 'Trajectory', arcHigh: 'High (deep lob)', arcFlat: 'Low (flat)',
    standLeft: 'Stands: left offset (m)', standFromNet: 'Stands: from net (m)',
    hitOk: 'A HITS THE SHUTTLE', hitMiss: 'A MISSES', missShort: 'Even at a full jump the racket is short by', missFlat: 'The shuttle passes too far to the side: the arm is below', missFlat2: 'above horizontal, so no overhead contact', missJump: 'jump', noIncoming: 'B cannot send the shuttle to that point with this speed and trajectory.',
    meetAt: 'Contact at height', afterIncoming: "after B's hit", arrive: 'arriving at', jumpUsed: 'jump', of: 'of a possible', noJumpShort: 'no jump needed',
    suggest: 'Stand at', leftWord: 'left offset', netWord: 'from net', moveBy: 'move', useSuggest: 'Move to the suggested spot', noContact: 'A misses, so there is no hit; the shuttle drops to the court.',
    contactTitle: 'CONTACT POINT', side: 'Court side', left: 'Left offset (m, negative = right)', fromNet: 'From net (m)', height: 'Contact height (m)',
    powerTitle: 'SHUTTLE SPEED OFF THE RACKET', speed: 'Speed', faceTitle: 'RACKET FACE', tilt: 'Tilt', direction: 'Direction',
    down: 'closed down', up: 'open up', flat: 'vertical', toLeft: 'to the left', toRight: 'to the right', straight: 'straight',
    cornersTitle: 'SIX CORNERS · REQUIRED RACKET FACE',
    note: 'The shuttle leaves along the racket-face normal for a centred hit (McErlain-Naylor 2020). Air drag from Cohen 2015. Novice / trained speeds: Zhang 2016 (standing smash). A physics model, not coaching advice.',
    results: { in: 'IN', net: 'NET', short: 'DOES NOT CROSS', out: 'OUT' },
    netHit: 'Hits the net at', underNet: 'Passes under the net at', wide: 'Passes outside the net posts', netAt: 'crosses the net at', above: 'above the tape',
    landAt: 'Lands at', after: 'after', apex: 'apex', landingSpeed: 'landing speed',
    reach: 'Out of reach at this speed', apply: 'Apply',
    levels: { novice: 'novice', trained: 'trained', elite: 'elite' },
    zones: { front: 'Front', mid: 'Mid', rear: 'Rear' }
  }
});
const outcomeColours = { in: '#7ee081', net: '#ff6b5b', short: '#ffb347', out: '#ffb347' };

const form = document.querySelector('#shot-form');
const host = document.querySelector('#court-host');
const status = document.querySelector('#stage-status');
const state = { lang: loadLang(), mode: 'singles', preset: 'smash-novice', corners: [], scenario: 'incoming', incoming: null, poseA: null, suggestion: null, outgoing: null };
let animation = null;
let court, shuttle, player, scene;

const t = () => words[state.lang];
const fmt = (value, digits = 2) => formatNumber(state.lang, value, digits);
const num = name => Number(form.elements[name].value);
const hitterSide = () => form.elements.side.value;
const otherSide = () => (hitterSide() === 'A' ? 'B' : 'A');
// Inverse of playerToWorld for a ground position on the given side.
const toPlayerView = (side, { x, z }) => (side === 'A' ? { left: -x || 0, fromNet: z } : { left: x, fromNet: -z || 0 });

// The flight B sends over (incoming scenario), aimed at the chosen landing spot on A's side. Memoised on its inputs:
// a high aim costs ~14 ms and racket-face sliders call this on every move without changing it.
const INCOMING_INPUTS = ['side', 'B-left', 'B-fromNet', 'in-height', 'in-left', 'in-fromNet', 'in-speed', 'in-arc'];
let incomingMemo = { key: null, flight: null };
function incomingFlight() {
  const key = INCOMING_INPUTS.map(name => form.elements[name].value).join('|');
  if (key === incomingMemo.key) return incomingMemo.flight;
  const from = playerToWorld(otherSide(), { left: num('B-left'), fromNet: num('B-fromNet'), height: num('in-height') });
  const target = playerToWorld(hitterSide(), { left: num('in-left'), fromNet: num('in-fromNet'), height: 0 });
  const flight = aimAt(from, target, num('in-speed'), shuttle.flight, { clears: c => clearsNet(court.equipment.net, c), prefer: form.elements['in-arc'].value === 'high' ? 'high' : 'flat' });
  incomingMemo = { key, flight };
  return flight;
}

// Where A meets the shuttle: typed (fixed scenario) or the highest reachable point of the incoming flight.
// A miss is still played out: missPose is the closest attempt (incoming) or the capped reach (fixed shuttle).
function resolveContact() {
  state.incoming = state.poseA = state.suggestion = state.missPose = null;
  const a = profile('A');
  if (state.scenario === 'fixed') {
    const pose = reachPose(contact(), a.height, player, a.jump);
    if (form.elements['A-show'].checked && !pose.reachable) state.missPose = pose;
    return;
  }
  state.incoming = incomingFlight();
  if (!state.incoming) return;
  const body = playerToWorld(hitterSide(), { left: num('A-left'), fromNet: num('A-fromNet'), height: 0 });
  const overhead = player.overhead.minArmElevationDeg * Math.PI / 180;
  state.poseA = highestContact(state.incoming.points, body, a.height, player, a.jump, overhead);
  if (state.poseA) return;
  state.missPose = closestMiss(state.incoming.points, body, a.height, player, a.jump, overhead);
  state.suggestion = suggestStand(state.incoming.points, hitterSide(), a.height, player, a.jump);
}
const fixedContact = () => playerToWorld(hitterSide(), { left: num('left'), fromNet: num('fromNet'), height: num('height') });
const contact = () => state.scenario === 'fixed' ? fixedContact() : state.poseA?.contact ?? null;
// The shuttle is hit only when A reaches it; a missed fixed shuttle simply drops.
const hitPoint = () => (state.missPose ? null : contact());
const tiltText = a => Math.abs(a) < 0.25 ? t().flat : `${a < 0 ? t().down : t().up} ${fmt(Math.abs(a), 1)}°`;
const directionText = a => Math.abs(a) < 0.25 ? t().straight : `${a < 0 ? t().toLeft : t().toRight} ${fmt(Math.abs(a), 1)}°`;

function translate() {
  applyText(t(), state.lang);
  if (shuttle) { renderPresets(); simulateHit(); renderCorners(); }
}

function renderPresets() {
  const box = document.querySelector('#presets');
  box.replaceChildren(...shuttle.presets.items.map(preset => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state.preset === preset.id));
    button.textContent = `${t().strokes[preset.stroke]} · ${t().levels[preset.level]} · ${fmt(preset.speed, 0)} m/s`;
    button.addEventListener('click', () => {
      state.preset = preset.id;
      form.elements.speed.value = preset.speed;
      if (preset.tilt !== undefined) form.elements.tilt.value = preset.tilt;
      renderPresets();
      update(true);
    });
    return button;
  }));
}

// Forward simulation of exactly what was entered; cheap enough to run on every slider move.
function simulateHit() {
  stopAnimation();
  resolveContact();
  renderRunResult();
  document.querySelector('#speed-out').textContent = `${fmt(num('speed'), 1)} m/s · ${fmt(num('speed') * 3.6, 0)} km/h`;
  document.querySelector('#tilt-out').textContent = tiltText(num('tilt'));
  document.querySelector('#direction-out').textContent = directionText(num('direction'));
  renderFaceDiagram();
  const p0 = hitPoint();
  const incomingPath = state.incoming ? [{ points: state.poseA ? state.incoming.points.slice(0, state.poseA.index + 1) : state.incoming.points, landing: state.poseA ? null : state.incoming.landing, color: '#d7e3de', opacity: 0.3 }] : [];
  state.drop = null;
  if (state.scenario === 'fixed' && state.missPose) {
    const hanging = fixedContact();
    state.drop = simulate(hanging, { x: 0, y: 0, z: 0 }, shuttle.flight).points;
    incomingPath.push({ points: state.drop, color: '#d7e3de', opacity: 0.3 });
  }
  if (!p0) {
    state.outgoing = null;
    const box = document.querySelector('#result');
    box.dataset.result = 'out';
    box.innerHTML = '<p></p>';
    box.querySelector('p').textContent = t().noContact;
    renderPlayers(null, null);
    if (!scene) return;
    scene.setShuttle(state.scenario === 'fixed' ? fixedContact() : null);
    scene.setRacket(null);
    scene.setPaths(incomingPath);
    scene.setTargets([]);
    return;
  }
  const v0 = launchVector(p0, num('speed'), num('tilt'), num('direction'));
  const o = shotOutcome(p0, v0, court, shuttle.flight, state.mode);
  state.outgoing = { ...o, v0 };

  const w = t();
  const net = court.equipment.net;
  const lines = [];
  if (o.result === 'net') {
    const c = o.netCrossing;
    lines.push(Math.abs(c.x) > net.widthMin / 2 ? w.wide : `${c.y < net.centreTopHeight - net.depth ? w.underNet : w.netHit} ${fmt(c.y)} m`);
  } else if (o.netCrossing) {
    lines.push(`${w.netAt} ${fmt(o.netCrossing.y)} m`);
  }
  if (o.landing) lines.push(`${w.landAt} (${fmt(o.landing.x)}; ${fmt(o.landing.z)}) m ${w.after} ${fmt(o.time)} s`);
  if (o.result === 'in') lines.push(`${w.zones[o.zone]} ${w.lanes[o.lane]}`);
  lines.push(`${w.apex} ${fmt(o.apex)} m · ${w.landingSpeed} ${fmt(o.speed, 1)} m/s`);
  const box = document.querySelector('#result');
  box.dataset.result = o.result;
  box.innerHTML = '<strong></strong>' + lines.map(() => '<p></p>').join('');
  box.querySelector('strong').textContent = w.results[o.result];
  [...box.querySelectorAll('p')].forEach((p, i) => { p.textContent = lines[i]; });

  renderPlayers(p0, o);
  if (!scene) return;
  scene.setShuttle(p0, v0);
  scene.setRacket(form.elements['A-show'].checked ? null : p0, v0, player.racket);
  scene.setPaths([...incomingPath, { ...o, color: outcomeColours[o.result], v0 }]);
  const active = o.result === 'in' ? `${o.zone}-${o.lane}` : null;
  scene.setTargets(state.corners, active);
}

// The figure only shows reach and jump height from body proportions; it is not a technique model.
// A player's profile; the jump is entered, or estimated from sex, height, mass and level (player.json jumpModel).
function profile(id) {
  const height = num(`${id}-height`);
  const entered = form.elements[`${id}-jump`].value;
  const level = form.elements[`${id}-level`].value;
  const estimate = estimateJump({ sex: form.elements[`${id}-sex`].value, height, mass: num(`${id}-mass`), level }, player.jumpModel);
  form.elements[`${id}-jump`].placeholder = fmt(estimate * 100, 0);
  return { height, jump: entered === '' ? estimate : Number(entered) / 100, estimated: entered === '', level };
}

// The figures show reach and jump height from body proportions only; they are not a technique model.
function renderPlayers(p0, outcome) {
  const w = t();
  const jumpLine = pr => `${pr.estimated ? w.jumpEst : w.jumpSet}: ${fmt(pr.jump * 100, 0)} cm`;
  const boxA = document.querySelector('#reach-A');
  boxA.classList.remove('warn');
  if (!form.elements['A-show'].checked) { boxA.textContent = ''; scene?.setPlayer(null, 'A'); }
  else if (state.scenario === 'incoming') {
    const a = profile('A');
    boxA.textContent = jumpLine(a);
    drawA((state.poseA ?? state.missPose)?.lift ?? 0);
  } else {
    const a = profile('A');
    const pose = reachPose(fixedContact(), a.height, player, a.jump);
    const status = !pose.reachable ? `${w.cannotReach} ${fmt(pose.shortfall * 100, 0)} cm` : pose.lift > 0 ? `${w.jumpNeed} ${fmt(pose.lift * 100, 0)} cm` : w.noJump;
    boxA.textContent = `${jumpLine(a)} · ${w.reachText} ${fmt(pose.standingReach)} m, ${w.maxReach} ${fmt(pose.maxReach)} m · ${status}`;
    boxA.classList.toggle('warn', !pose.reachable);
    scene?.setPlayer({ x: pose.body.x, z: pose.body.z, height: a.height, lift: pose.lift, halfWidth: pose.halfWidth, arm: { ...pose, normal: state.outgoing?.v0 }, racket: player.racket }, 'A');
  }
  const boxB = document.querySelector('#reach-B');
  boxB.classList.remove('warn');
  if (!form.elements['B-show'].checked) { boxB.textContent = ''; scene?.setPlayer(null, 'B'); return; }
  const b = profile('B');
  const body = playerToWorld(otherSide(), { left: num('B-left'), fromNet: num('B-fromNet'), height: 0 });
  const evalB = !outcome || outcome.result === 'net' || outcome.result === 'short'
    ? null
    : evaluateInterception(outcome.points, body, b.height, player, b.jump, { level: b.level });

  let status = '';
  if (!outcome) {
    status = '';
  } else if (outcome.result === 'net' || outcome.result === 'short') {
    status = w.noCross;
  } else if (evalB) {
    const jumpText = evalB.pose?.lift > 0 ? ` (${w.receivesJump} ${fmt(evalB.pose.lift * 100, 0)} cm)` : '';
    if (evalB.status === 'standing') {
      status = `${w.receivesStanding} ${fmt(evalB.pose.contact.y)} m${jumpText} · ${w.flightTimeLabel}: ${fmt(evalB.flightTime, 2)} s (${w.marginLabel} +${fmt(evalB.margin, 2)} s)`;
    } else if (evalB.status === 'comfortable' || evalB.status === 'rushed') {
      const verb = evalB.status === 'rushed' ? w.receivesRushed : w.receivesMove;
      status = `${verb} ${fmt(evalB.pose.contact.y)} m${jumpText} (${w.travelDistLabel} ${fmt(evalB.travelDistance, 1)} m) · ${w.marginLabel} +${fmt(evalB.margin, 2)} s`;
    } else if (evalB.status === 'too_fast') {
      status = `${w.bAced} · ${w.flightTimeLabel}: ${fmt(evalB.flightTime, 2)} s < ${fmt(evalB.reactionTime, 2)} s ${w.reactionTimeLabel} (${w.deficitLabel} -${fmt(evalB.timeDeficit, 2)} s)`;
      boxB.classList.add('warn');
    } else if (evalB.status === 'too_late') {
      status = `${w.bTooLate} (${w.needMove} ${fmt(evalB.travelDistance, 1)} m, ${w.deficitLabel} -${fmt(evalB.timeDeficit, 2)} s)`;
      boxB.classList.add('warn');
    } else {
      status = w.bMisses;
      boxB.classList.add('warn');
    }
  }

  boxB.textContent = status ? `${jumpLine(b)} · ${status}` : jumpLine(b);
  if (!evalB || !evalB.feasible || !evalB.pose) {
    const missPose = evalB?.closestMiss;
    scene?.setPlayer(missPose
      ? { x: body.x, z: body.z, height: b.height, lift: missPose.lift, halfWidth: missPose.halfWidth, arm: missPose, kit: 0xd8573c, racket: player.racket }
      : { x: body.x, z: body.z, height: b.height, kit: 0xd8573c, racket: player.racket }, 'B');
  } else {
    scene?.setPlayer({
      x: evalB.destBody.x, z: evalB.destBody.z, height: b.height,
      lift: evalB.pose.lift, halfWidth: evalB.pose.halfWidth, arm: evalB.pose, kit: 0xd8573c, racket: player.racket
    }, 'B');
  }
}

// Player A in the incoming scenario at a given lift: reaching for the contact, or standing where they were placed.
// The arm is drawn for the contact lift and shifted with the body during the jump animation.
function drawA(lift) {
  if (!scene || !form.elements['A-show'].checked || state.scenario !== 'incoming') return;
  const a = profile('A');
  const pose = state.poseA ?? state.missPose;
  if (!pose) {
    const body = playerToWorld(hitterSide(), { left: num('A-left'), fromNet: num('A-fromNet'), height: 0 });
    return scene.setPlayer({ x: body.x, z: body.z, height: a.height, racket: player.racket }, 'A');
  }
  const dy = lift - pose.lift;
  const up = point => ({ ...point, y: point.y + dy });
  scene.setPlayer({ x: pose.body.x, z: pose.body.z, height: a.height, lift, halfWidth: pose.halfWidth,
    arm: { ...pose, shoulder: up(pose.shoulder), hand: up(pose.hand), tip: up(pose.tip), normal: state.outgoing?.v0 }, racket: player.racket }, 'A');
}

function renderRunResult() {
  const box = document.querySelector('#run-result');
  if (state.scenario !== 'incoming') { box.textContent = ''; return; }
  const w = t();
  const lines = [];
  let title;
  if (!state.incoming) { title = w.hitMiss; lines.push(w.noIncoming); }
  else if (state.poseA) {
    const pose = state.poseA;
    const pts = state.incoming.points;
    const next = pts[Math.min(pose.index + 1, pts.length - 1)], here = pts[pose.index];
    const speed = Math.hypot(next[0] - here[0], next[1] - here[1], next[2] - here[2]) / FLIGHT_SAMPLE_S;
    const a = profile('A');
    title = w.hitOk;
    lines.push(`${w.meetAt} ${fmt(pose.contact.y)} m, ${fmt(pose.index * FLIGHT_SAMPLE_S)} s ${w.afterIncoming} · ${w.arrive} ${fmt(speed, 1)} m/s`);
    lines.push(pose.lift > 0 ? `${w.jumpUsed} ${fmt(pose.lift * 100, 0)} cm ${w.of} ${fmt(a.jump * 100, 0)} cm` : w.noJumpShort);
  } else {
    title = w.hitMiss;
    const m = state.missPose;
    if (m) lines.push(m.shortfall > 0
      ? `${w.missShort} ${fmt(m.shortfall * 100, 0)} cm (${w.missJump} ${fmt(m.lift * 100, 0)} cm)`
      : `${w.missFlat} ${player.overhead.minArmElevationDeg}° ${w.missFlat2}`);
    const sg = state.suggestion;
    if (sg) {
      const view = toPlayerView(hitterSide(), sg.body);
      const now = playerToWorld(hitterSide(), { left: num('A-left'), fromNet: num('A-fromNet'), height: 0 });
      lines.push(`${w.suggest}: ${w.leftWord} ${fmt(view.left)} m, ${w.netWord} ${fmt(view.fromNet)} m (${w.moveBy} ${fmt(Math.hypot(sg.body.x - now.x, sg.body.z - now.z))} m)`);
    }
  }
  box.dataset.result = state.poseA ? 'in' : 'miss';
  box.innerHTML = '<strong></strong>' + lines.map(() => '<p></p>').join('');
  box.querySelector('strong').textContent = title;
  [...box.querySelectorAll('p')].forEach((el, i) => { el.textContent = lines[i]; });
  if (!state.poseA && state.suggestion) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = w.useSuggest;
    button.addEventListener('click', () => {
      const view = toPlayerView(hitterSide(), state.suggestion.body);
      form.elements['A-left'].value = view.left.toFixed(2);
      form.elements['A-fromNet'].value = view.fromNet.toFixed(2);
      update(true);
    });
    box.append(button);
  }
}

function stopAnimation() {
  if (animation) cancelAnimationFrame(animation);
  animation = null;
  scene?.setTrail(null);
}

// Run test: the incoming flight (if any) plays to the contact, A's jump peaks at the contact
// (lift = h - g t^2 / 2 around it), then the shuttle follows A's hit. While it flies only a fading trail is drawn;
// the static paths come back once the trail has faded.
const TRAIL_SECONDS = 0.4;
function runTest() {
  simulateHit();
  if (!scene) return;
  const g = shuttle.flight.gravity;
  const rate = document.querySelector('#slow').checked ? 0.25 : 1;
  const incoming = state.scenario === 'incoming' ? state.incoming?.points : null;
  if (state.scenario === 'incoming' && !incoming) return;
  // pose: the hit (incoming) or the missed attempt; A's jump peaks at its moment either way.
  const pose = state.scenario === 'incoming' ? state.poseA ?? state.missPose : state.missPose;
  const jumper = state.scenario === 'incoming' || state.missPose;
  const lift = pose?.lift ?? 0;
  const half = Math.sqrt(2 * lift / g);
  const duration = points => (points.length - 1) * FLIGHT_SAMPLE_S;
  const contactTime = incoming ? (pose ? pose.index * FLIGHT_SAMPLE_S : duration(incoming)) : Math.max(0.4, half);
  const out = state.outgoing;
  const after = out ? out.points : state.drop ?? null;
  const flightEnd = incoming && !out ? duration(incoming) : contactTime + (after ? duration(after) : 0);
  const outColour = out ? outcomeColours[out.result] : '#e8f1ec';
  const hanging = fixedContact();
  const at = time => incoming && !out ? sampleFlight(incoming, time)
    : time < contactTime ? (incoming ? sampleFlight(incoming, time) : { position: hanging, direction: { x: 0, y: -1, z: 0 } })
    : after ? sampleFlight(after, time - contactTime) : { position: hanging, direction: { x: 0, y: -1, z: 0 } };
  scene.setPaths([]);
  const start = performance.now();
  const frame = now => {
    const time = (now - start) / 1000 * rate;
    const head = Math.min(time, flightEnd);
    const trail = [];
    for (let k = Math.max(0, time - TRAIL_SECONDS); k <= head + 1e-9; k += FLIGHT_SAMPLE_S) {
      trail.push({ ...at(k).position, color: k < contactTime ? '#e8f1ec' : outColour });
    }
    scene.setTrail(trail.length > 1 ? trail : null);
    const shuttleNow = at(head);
    scene.setShuttle(shuttleNow.position, shuttleNow.direction);
    const jumpLift = Math.abs(time - contactTime) <= half ? lift - g / 2 * (time - contactTime) ** 2 : 0;
    if (pose && jumper) drawA(jumpLift);
    if (time < flightEnd + TRAIL_SECONDS) animation = requestAnimationFrame(frame);
    else { animation = null; scene.setTrail(null); simulateHit(); }
  };
  animation = requestAnimationFrame(frame);
}

// Side view of the racket face: the shuttle leaves along the face normal, tilt degrees above or below horizontal.
function renderFaceDiagram() {
  const w = t();
  const a = num('tilt') * Math.PI / 180;
  const nx = Math.cos(a), ny = -Math.sin(a); // SVG y points down
  const face = (k, sign) => (sign * 22 * (k === 'x' ? -ny : nx)).toFixed(1);
  document.querySelector('#face-diagram').innerHTML = `
    <line x1="-65" y1="20" x2="65" y2="20" stroke="#4d7a70" stroke-width="1"/>
    <text x="64" y="16" text-anchor="end">${w.toNet} →</text>
    <line x1="${face('x', -1)}" y1="${face('y', -1)}" x2="${face('x', 1)}" y2="${face('y', 1)}" stroke="#ff8a3d" stroke-width="4" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="${(nx * 40).toFixed(1)}" y2="${(ny * 40).toFixed(1)}" stroke="#7ee081" stroke-width="2"/>
    <circle cx="${(nx * 40).toFixed(1)}" cy="${(ny * 40).toFixed(1)}" r="3" fill="#7ee081"/>
    <text x="-64" y="-45">${w.face}: ${tiltText(num('tilt'))}</text>
    <text x="-64" y="-36" fill="#7ee081">${w.launch}</text>`;
}

// Inverse problem for the six corners at the current speed: run on contact or speed changes, not on face moves.
function solveCorners() {
  const p0 = contact();
  if (!p0) { state.corners = []; renderCorners(); return; }
  state.corners = sixCorners(p0, court, state.mode).map(corner => ({ ...corner, solution: solveTarget(p0, corner, num('speed'), court, shuttle.flight) }));
  renderCorners();
}

function renderCorners() {
  const list = document.querySelector('#corners');
  list.replaceChildren(...state.corners.map(corner => {
    const item = document.createElement('li');
    const s = corner.solution;
    item.innerHTML = '<span></span><small></small>';
    item.querySelector('span').textContent = `${t().zones[corner.zone]} ${t().lanes[corner.lane]}`;
    item.querySelector('small').textContent = s ? `${tiltText(s.tilt)} · ${directionText(s.direction)} · ${fmt(s.path.time)} s` : t().reach;
    if (s) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = t().apply;
      button.addEventListener('click', () => {
        form.elements.tilt.value = s.tilt;
        form.elements.direction.value = s.direction;
        simulateHit();
      });
      item.append(button);
    } else item.classList.add('unreachable');
    return item;
  }));
}

function update(resolve) {
  if (!court || ![...form.elements].every(el => el.checkValidity())) return;
  simulateHit();
  if (resolve) { solveCorners(); simulateHit(); }
}

function setScenario(scenario) {
  state.scenario = scenario;
  document.querySelectorAll('[data-scenario]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scenario === scenario)));
  document.querySelectorAll('.incoming-only').forEach(el => { el.hidden = scenario !== 'incoming'; });
  document.querySelectorAll('.fixed-only').forEach(el => { el.hidden = scenario !== 'fixed'; });
  update(true);
}
document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => setScenario(button.dataset.scenario)));
document.querySelector('#run').addEventListener('click', runTest);

form.addEventListener('input', event => {
  if (event.target.name === 'speed') state.preset = null, renderPresets();
  update(false);
});
form.addEventListener('change', event => { if (!['tilt', 'direction'].includes(event.target.name) && !/^B-|^A-(sex|level|height|mass|jump|show)$/.test(event.target.name)) update(true); });
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  state.mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  scene?.setMode(state.mode);
  update(true);
}));
document.querySelector('#language').addEventListener('click', () => {
  state.lang = toggleLang(state.lang);
  translate();
});
document.querySelector('#zoom-in').addEventListener('click', () => scene?.zoom(1));
document.querySelector('#zoom-out').addEventListener('click', () => scene?.zoom(-1));
document.querySelector('#reset-view').addEventListener('click', () => scene?.reset());
document.querySelector('#hitter-view').addEventListener('click', hitterView);
document.querySelector('#close-view').addEventListener('click', closeView);

// Close-up of A's racket at the contact, from A's racket side and slightly behind.
function closeView() {
  if (!scene) return;
  const p = contact() ?? { ...playerToWorld(hitterSide(), { left: num('A-left'), fromNet: num('A-fromNet'), height: 0 }), y: 1.6 };
  const back = Math.sign(p.z) || 1;
  scene.focus(p, { x: p.x + back * 1.7, y: p.y + 0.15, z: p.z + back * 1.3 });
}

// Camera behind and above the hitter's racket side, looking towards the far court.
function hitterView() {
  if (!scene) return;
  const p0 = contact() ?? { ...playerToWorld(hitterSide(), { left: num('A-left'), fromNet: num('A-fromNet'), height: 0 }), y: 2 };
  const back = Math.sign(p0.z) || 1;
  scene.focus({ x: p0.x * 0.5, y: 1.2, z: -back * 1.5 }, { x: p0.x + 2.2, y: p0.y + 2.2, z: p0.z + back * 5.5 });
}

translate();
try {
  [court, shuttle, player] = await Promise.all(['/assets/court.json', '/assets/shuttle.json', '/assets/player.json'].map(getJson));
  renderPresets();
  try {
    scene = (await loadCourt3d())(host, court, state.mode, t().stageLabel, shuttle.specification);
    scene.enableInteraction({
      getShuttle: () => hitPoint() ?? fixedContact(),
      onMove: ({ x, z }) => {
        if (state.scenario === 'fixed') {
          const side = hitterSide();
          form.elements.left.value = (side === 'A' ? -x : x).toFixed(2);
          form.elements.fromNet.value = Math.abs(z).toFixed(2);
          update(true);
        } else {
          const onHitterSide = (hitterSide() === 'A' ? z > 0 : z < 0);
          if (onHitterSide) {
            form.elements['in-left'].value = (hitterSide() === 'A' ? -x : x).toFixed(2);
            form.elements['in-fromNet'].value = Math.abs(z).toFixed(2);
          } else {
            form.elements['B-left'].value = (otherSide() === 'A' ? -x : x).toFixed(2);
            form.elements['B-fromNet'].value = Math.abs(z).toFixed(2);
          }
          incomingMemo = { key: null, flight: null };
          update(true);
        }
      }
    });
    status.textContent = t().ready;
    hitterView();
  } catch (error) {
    console.error('3D unavailable:', error);
    status.textContent = t().noWebgl;
  }
  update(true);
} catch (error) {
  console.error('Data unavailable:', error);
  status.textContent = t().loadError;
}
