import { courtMetrics, courtSvg } from './court-geometry.mjs';
import { averageForce, candidatePaths, failedAttempts, minimumHeight, playerToWorld, receive, strokeColours } from './shuttle-physics.mjs';

const words = {
  vi: {
    edition: 'COURT LAB / 01', kicker: 'KHÁM PHÁ SÂN CẦU LÔNG',
    title: 'Sân cầu lông, nhìn rõ từng vạch.',
    intro: 'Khám phá sân tiêu chuẩn trong không gian 2D và 3D. Mọi số đo đều lấy từ cùng một bộ dữ liệu tham chiếu.',
    singles: 'Đơn', doubles: 'Đôi', hint2d: 'Nhìn từ trên xuống', hint3d: 'Xoay để khám phá',
    stageLabel: 'SƠ ĐỒ SÂN TIÊU CHUẨN', reset: 'Đặt lại', loading: 'Đang tải dữ liệu sân…',
    ready2d: '2D · Sân nhìn từ trên xuống', ready3d: '3D · Kéo để xoay, cuộn để phóng to',
    noWebgl: 'Không thể mở 3D trên trình duyệt này. Đã chuyển về 2D.',
    loadError: 'Không tải được dữ liệu sân. Hãy làm mới trang.',
    reference: 'THÔNG SỐ THAM CHIẾU', detailsTitle: 'Một sân. Hai góc nhìn.',
    detailsIntro: 'Các vạch vẫn giữ nguyên kích thước khi chuyển giữa 2D và 3D.',
    courtLength: 'Chiều dài sân', doublesWidth: 'Bề ngang sân đôi', singlesWidth: 'Bề ngang sân đơn',
    lineWidth: 'Bề rộng vạch', shortService: 'Vạch giao cầu ngắn từ lưới',
    longService: 'Vạch giao cầu dài đôi từ biên cuối', netCentre: 'Lưới cao tại giữa sân',
    netDepth: 'Chiều sâu lưới', postHeight: 'Cột lưới cao', legend: 'CHÚ GIẢI',
    boundary: 'Biên thi đấu đang chọn', service: 'Vạch giao cầu áp dụng', otherLines: 'Các vạch sân còn lại',
    sourceTitle: 'NGUỒN KÍCH THƯỚC', sourceNote: 'BWF Laws 5.0 (1), hiệu lực 26/04/2025. Chưa xác nhận đây là bản mới nhất.',
    sourceLink: 'Xem tài liệu BWF ↗', court: 'Sân cầu lông nhìn từ trên xuống', court3d: 'Mô hình sân cầu lông 3D',
    home: 'Trang chủ ShuttleMotion', controls: 'Điều khiển sân', viewGroup: 'Chế độ xem', modeGroup: 'Thể thức', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ', language: 'Chuyển sang tiếng Anh',
    shotLink: 'Mô phỏng cú đánh', trainingLink: 'Luyện tập đánh đôi', shuttleTitle: 'QUẢ CẦU', playerTitle: 'NGƯỜI CHƠI', side: 'Phía sân', left: 'Lệch trái (m, âm = phải)', fromNet: 'Cách lưới (m)',
    height: 'Độ cao (m)', bodyHeight: 'Chiều cao (m)', placeShuttle: 'Đặt quả cầu', placePlayer: 'Đặt người chơi', clear: 'Xoá',
    pathNote: 'Đường bay ứng viên theo vật lý, dùng tốc độ VĐV đỉnh cao đã công bố. Hướng trái/phải tính theo người đánh. Không phải lời khuyên kỹ thuật.',
    world: 'Tọa độ sân', noPaths: 'Không có đường bay hợp lệ từ vị trí này.',
    speed: 'Tốc độ đầu (m/s, trống = số đã công bố)', contactHeight: 'Độ cao bên kia đỡ cầu (m)', contactMs: 'Thời gian chạm vợt (ms, giả định)',
    selectHint: 'Chọn một đường để xem bên kia nhận cầu và phản cầu.', receptionTitle: 'BÊN NHẬN CẦU', returnsTitle: 'HƯỚNG PHẢN CẦU',
    receivedAt: 'Nhận cầu tại', after: 'sau', arrival: 'Tốc độ tới', descent: 'góc rơi', cork: 'Đế cầu hướng theo',
    momentum: 'Động lượng', energy: 'động năng', force: 'Lực TB', assumed: 'giả định',
    noReception: 'Cầu không rơi qua độ cao này ở sân bên kia.',
    attemptsTitle: 'Nếu vẫn đánh cú này:', verdicts: { net: 'VÀO LƯỚI', out: 'RA NGOÀI', short: 'KHÔNG QUA LƯỚI' }, netAtShort: 'chạm lưới ở', landsIn: 'rơi', notReach: 'không tới',
    pickStroke: 'Chọn loại cú đánh để xem đường bay.', pickReturn: 'Chọn loại phản cầu để xem đường bay.',
    noStrokePaths: 'Không có đường hợp lệ cho cú này từ vị trí hiện tại.', needHeight: 'Cần tiếp cầu ở độ cao từ', strokeGroup: 'Loại cú đánh', returnGroup: 'Loại phản cầu',
    returnNote: 'Phản cầu dùng tốc độ VĐV đỉnh cao, chưa tính ảnh hưởng của tốc độ cầu tới. Quả cầu vẽ đúng kích thước thật.',
    strokes: { smash: 'Đập cầu', clear: 'Phông cầu', drop: 'Bỏ nhỏ' },
    zones: { front: 'sân trước', mid: 'giữa sân', rear: 'cuối sân' }, lanes: { left: 'trái', centre: 'giữa', right: 'phải' },
    lineNames: { 'doubles-side': 'Biên dọc đôi', 'singles-side': 'Biên dọc đơn', baseline: 'Biên cuối sân', 'short-service': 'Vạch giao cầu ngắn', 'doubles-long-service': 'Vạch giao cầu dài đôi', centre: 'Vạch giữa ô giao cầu' }
  },
  en: {
    edition: 'COURT LAB / 01', kicker: 'EXPLORE THE BADMINTON COURT',
    title: 'The badminton court, line by line.',
    intro: 'Explore a standard court in 2D and 3D. Every measurement comes from the same reference dataset.',
    singles: 'Singles', doubles: 'Doubles', hint2d: 'Top-down view', hint3d: 'Orbit to explore',
    stageLabel: 'STANDARD COURT DIAGRAM', reset: 'Reset', loading: 'Loading court data…',
    ready2d: '2D · Top-down court view', ready3d: '3D · Drag to orbit, scroll to zoom',
    noWebgl: '3D is unavailable in this browser. Switched to 2D.',
    loadError: 'Court data could not be loaded. Please refresh the page.',
    reference: 'REFERENCE DIMENSIONS', detailsTitle: 'One court. Two views.',
    detailsIntro: 'Court markings keep the same dimensions when switching between 2D and 3D.',
    courtLength: 'Court length', doublesWidth: 'Doubles width', singlesWidth: 'Singles width',
    lineWidth: 'Line width', shortService: 'Short service line from net',
    longService: 'Doubles long service line from back', netCentre: 'Net height at centre',
    netDepth: 'Net depth', postHeight: 'Post height', legend: 'LEGEND',
    boundary: 'Selected rally boundary', service: 'Applicable service line', otherLines: 'Other court markings',
    sourceTitle: 'DIMENSION SOURCE', sourceNote: 'BWF Laws 5.0 (1), effective 26 April 2025. The latest version has not been confirmed.',
    sourceLink: 'View BWF document ↗', court: 'Top-down badminton court', court3d: '3D badminton court model',
    home: 'ShuttleMotion home', controls: 'Court controls', viewGroup: 'View mode', modeGroup: 'Match type', zoomIn: 'Zoom in', zoomOut: 'Zoom out', language: 'Switch to Vietnamese',
    shotLink: 'Shot lab', trainingLink: 'Doubles training', shuttleTitle: 'SHUTTLE', playerTitle: 'PLAYER', side: 'Court side', left: 'Left offset (m, negative = right)', fromNet: 'From net (m)',
    height: 'Height (m)', bodyHeight: 'Body height (m)', placeShuttle: 'Place shuttle', placePlayer: 'Place player', clear: 'Clear',
    pathNote: 'Physics candidate paths using published elite launch speeds. Left and right are from the hitter\'s view. Not coaching advice.',
    world: 'Court coordinates', noPaths: 'No valid path from this position.',
    speed: 'Launch speed (m/s, empty = published)', contactHeight: 'Receiver contact height (m)', contactMs: 'Racket contact time (ms, assumption)',
    selectHint: 'Select a path to see the reception and the return options.', receptionTitle: 'RECEPTION', returnsTitle: 'RETURN OPTIONS',
    receivedAt: 'Received at', after: 'after', arrival: 'Arrival speed', descent: 'descent', cork: 'Cork points along',
    momentum: 'Momentum', energy: 'energy', force: 'Average force', assumed: 'assumed',
    noReception: 'The shuttle does not descend through this height on the far side.',
    attemptsTitle: 'If the stroke is played anyway:', verdicts: { net: 'NET', out: 'OUT', short: 'DOES NOT CROSS' }, netAtShort: 'hits the net at', landsIn: 'lands', notReach: 'misses',
    pickStroke: 'Choose a stroke type to see its paths.', pickReturn: 'Choose a return stroke to see its paths.',
    noStrokePaths: 'No valid path for this stroke from the current position.', needHeight: 'Needs a contact height of at least', strokeGroup: 'Stroke type', returnGroup: 'Return stroke',
    returnNote: 'Returns use elite launch speeds and ignore the incoming speed. The shuttle is drawn life size.',
    strokes: { smash: 'Smash', clear: 'Clear', drop: 'Drop' },
    zones: { front: 'forecourt', mid: 'midcourt', rear: 'rearcourt' }, lanes: { left: 'left', centre: 'centre', right: 'right' },
    lineNames: { 'doubles-side': 'Doubles sideline', 'singles-side': 'Singles sideline', baseline: 'Back boundary', 'short-service': 'Short service line', 'doubles-long-service': 'Doubles long service line', centre: 'Centre service line' }
  }
};

const host = document.querySelector('#court-host');
const status = document.querySelector('#stage-status');
const langButton = document.querySelector('#language');
const hint = document.querySelector('#view-hint');
const state = { view: '2d', mode: 'singles', lang: 'vi', zoom: 1, shuttle: null, paths: [], hidden: new Set(), player: null, selected: null, reception: null, returns: [], stroke: null, returnStroke: null, minHeight: null, failed: [], failedReturns: [] };
const failColours = { net: '#ff4d4d', out: '#ffb347', short: '#ffb347', in: '#ffb347' };
const shuttleForm = document.querySelector('#shuttle-form');
const playerForm = document.querySelector('#player-form');
let court;
let shuttleData;
let scene3d;

try { if (localStorage.getItem('shuttlemotion-language') === 'en') state.lang = 'en'; } catch {}

function translate() {
  const t = words[state.lang];
  document.documentElement.lang = state.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t[el.dataset.i18n];
  langButton.textContent = state.lang === 'vi' ? 'EN' : 'VI';
  langButton.setAttribute('aria-label', t.language);
  document.querySelector('.brand').setAttribute('aria-label', t.home);
  document.querySelector('.toolbar').setAttribute('aria-label', t.controls);
  const groups = document.querySelectorAll('.segmented');
  groups[0].setAttribute('aria-label', t.viewGroup);
  groups[1].setAttribute('aria-label', t.modeGroup);
  document.querySelector('#zoom-in').setAttribute('aria-label', t.zoomIn);
  document.querySelector('#zoom-out').setAttribute('aria-label', t.zoomOut);
  hint.textContent = t[state.view === '2d' ? 'hint2d' : 'hint3d'];
  status.textContent = t[court ? state.view === '2d' ? 'ready2d' : 'ready3d' : 'loading'];
  if (court) { renderMetrics(); renderPaths(); }
  if (scene3d) host.querySelector('canvas')?.setAttribute('aria-label', t.court3d);
}

const fmt = (value, digits = 2) => new Intl.NumberFormat(state.lang === 'vi' ? 'vi-VN' : 'en-US', {
  minimumFractionDigits: digits, maximumFractionDigits: digits
}).format(value);

function renderMetrics() {
  const m = courtMetrics(court);
  for (const [id, value] of Object.entries({
    length: `${fmt(m.length)} m`, doubles: `${fmt(m.doublesWidth)} m`, singles: `${fmt(m.singlesWidth)} m`,
    line: `${fmt(m.lineWidth * 1000, 0)} mm`, short: `${fmt(m.shortServiceFromNet)} m`,
    long: `${fmt(m.doublesLongServiceFromBack)} m`, net: `${fmt(m.netCentreHeight, 3)} m`,
    depth: `${fmt(m.netDepth)} m`, post: `${fmt(m.postHeight)} m`
  })) document.querySelector(`#metric-${id}`).textContent = value;
}

function updateButtons() {
  for (const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
  for (const button of document.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
  hint.textContent = words[state.lang][state.view === '2d' ? 'hint2d' : 'hint3d'];
}

function show2d() {
  scene3d?.dispose();
  scene3d = undefined;
  host.innerHTML = courtSvg(court, state.mode, words[state.lang], state.lang === 'vi' ? 'vi-VN' : 'en-US', overlay2d());
  host.querySelector('svg').style.transform = `scale(${state.zoom})`;
  status.textContent = words[state.lang].ready2d;
}

async function show3d() {
  try {
    if (!document.createElement('canvas').getContext('webgl2')) throw new Error('WebGL2 unavailable');
    const { mountCourt3d } = await import('./court-3d.mjs');
    if (state.view !== '3d') return;
    host.replaceChildren();
    scene3d = mountCourt3d(host, court, state.mode, words[state.lang].court3d, shuttleData.specification);
    applyScene();
    status.textContent = words[state.lang].ready3d;
  } catch (error) {
    console.error('3D court unavailable:', error);
    state.view = '2d';
    state.zoom = 1;
    updateButtons();
    show2d();
    status.textContent = words[state.lang].noWebgl;
  }
}

async function setView(view) {
  if (!court || view === state.view) return;
  state.view = view;
  state.zoom = 1;
  updateButtons();
  if (view === '3d') await show3d(); else show2d();
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  if (!court) return;
  state.mode = button.dataset.mode;
  updateButtons();
  updatePaths();
  if (state.view === '2d') show2d(); else { scene3d?.setMode(state.mode); applyScene(); }
}));
langButton.addEventListener('click', () => {
  state.lang = state.lang === 'vi' ? 'en' : 'vi';
  try { localStorage.setItem('shuttlemotion-language', state.lang); } catch {}
  translate();
  if (court && state.view === '2d') show2d();
});
document.querySelector('#zoom-in').addEventListener('click', () => zoom(1));
document.querySelector('#zoom-out').addEventListener('click', () => zoom(-1));
document.querySelector('#reset-view').addEventListener('click', () => {
  if (state.view === '3d') scene3d?.reset();
  else { state.zoom = 1; show2d(); }
});

const visible = paths => paths.filter(path => !state.hidden.has(path.id));
const selectedPath = () => state.paths.find(path => path.id === state.selected);

// Top-down overlay in world x/z, matching the SVG court coordinates.
function overlay2d() {
  const lines = (paths, extra) => paths.map(path => {
    const colour = path.color ?? strokeColours[path.stroke];
    const end = path.landing ?? path.position;
    return `<polyline class="shot${extra}" stroke="${colour}" points="${path.points.map(p => `${p[0].toFixed(3)},${p[2].toFixed(3)}`).join(' ')}"/>` + (end ? `<circle cx="${end.x.toFixed(3)}" cy="${end.z.toFixed(3)}" r="0.1" fill="${colour}"/>` : '');
  }).join('');
  const player = state.player ? `<circle class="player" cx="${state.player.x}" cy="${state.player.z}" r="0.22"/>` : '';
  const shuttle = state.shuttle ? `<circle class="shuttle" cx="${state.shuttle.x}" cy="${state.shuttle.z}" r="0.09"/>` : '';
  const r = state.reception?.position;
  const reception = r ? `<circle class="reception" cx="${r.x.toFixed(3)}" cy="${r.z.toFixed(3)}" r="0.12"/>` : '';
  return player + lines([...visible(state.paths), ...state.failed], '') + lines([...visible(state.returns), ...state.failedReturns], ' return') + shuttle + reception;
}

function applyScene() {
  if (state.view === '2d') return show2d();
  scene3d?.setShuttle(state.shuttle, selectedPath()?.v0);
  scene3d?.setPaths([...visible(state.paths), ...state.failed]);
  scene3d?.setReception(state.reception, [...visible(state.returns), ...state.failedReturns]);
  scene3d?.setPlayer(state.player);
}

const field = name => shuttleForm.elements[name].value === '' ? undefined : Number(shuttleForm.elements[name].value);

function updateReception() {
  const path = selectedPath();
  state.reception = path ? receive(path, field('contactHeight'), shuttleData.flight) : null;
  const returnOptions = { strokes: [state.returnStroke] };
  state.returns = state.reception && state.returnStroke ? candidatePaths(state.reception.position, court, shuttleData, state.mode, returnOptions).map(path => ({ ...path, id: `return-${path.id}` })) : [];
  state.failedReturns = state.reception && state.returnStroke && !state.returns.length ? failures(state.reception.position, returnOptions) : [];
  renderReception();
}

function renderReception() {
  const t = words[state.lang];
  const box = document.querySelector('#reception');
  const r = state.reception;
  for (const el of document.querySelectorAll('.returns-only')) el.hidden = !r;
  if (!state.selected) { box.textContent = state.paths.length ? t.selectHint : ''; renderList('#return-list', [], false); return; }
  if (!r) { box.textContent = t.noReception; renderList('#return-list', [], false); return; }
  renderFilter('#return-filter', 'returnStroke', t.returnGroup);
  const v = (p, d = 2) => `(${fmt(p.x, d)}, ${fmt(p.y, d)}, ${fmt(p.z, d)})`;
  const contactMs = field('contactMs');
  const force = contactMs > 0 ? averageForce(r.momentum, contactMs, shuttleData.flight.gravity) : null;
  box.innerHTML = `<h4></h4><p></p><p></p><p></p><p></p>`;
  const [title, ...rows] = box.children;
  title.textContent = t.receptionTitle;
  rows[0].textContent = `${t.receivedAt} ${v(r.position)} m ${t.after} ${fmt(r.time)} s`;
  rows[1].textContent = `${t.arrival}: ${fmt(r.speed, 1)} m/s (${fmt(r.speed * 3.6, 0)} km/h) · ${t.descent} ${fmt(r.descentAngle, 1)}°`;
  rows[2].textContent = `${t.cork} ${v(r.corkDirection)}`;
  rows[3].textContent = `${t.momentum} ${fmt(r.momentum, 3)} kg·m/s · ${t.energy} ${fmt(r.energy)} J` + (force ? ` · ${t.force} (${t.assumed} ${fmt(contactMs, 1)} ms): ${fmt(force.newtons, 0)} N ≈ ${fmt(force.kgf, 1)} kgf` : '');
  renderList('#return-list', state.returns, false);
  if (!state.returnStroke) message('#return-list', t.pickReturn);
  else if (!state.returns.length) { message('#return-list', t.noStrokePaths); renderFailures('#return-list', state.failedReturns); }
}

// Every impossible stroke is still drawn with its real outcome so the coach can show why it fails.
const failures = (p0, options) => failedAttempts(p0, court, shuttleData, state.mode, options).map(a => ({ ...a, id: `fail-${a.id}`, color: failColours[a.result] }));

function renderFailures(selector, attempts) {
  if (!attempts.length) return;
  const t = words[state.lang];
  const list = document.querySelector(selector);
  const head = document.createElement('li');
  head.className = 'path-message';
  head.textContent = t.attemptsTitle;
  list.append(head, ...attempts.map(a => {
    const item = document.createElement('li');
    item.className = 'failed-attempt';
    item.innerHTML = `<i style="background:${a.color}"></i><span></span>`;
    const verdict = a.result === 'in'
      ? `${t.landsIn} ${t.zones[a.landingZone]}, ${t.notReach} ${t.zones[a.zone]}`
      : t.verdicts[a.result] + (a.result === 'net' && a.netCrossing ? ` (${t.netAtShort} ${fmt(a.netCrossing.y)} m)` : '');
    item.querySelector('span').textContent = `${t.strokes[a.stroke]} · ${t.zones[a.zone]} ${t.lanes[a.lane]} · ${fmt(a.angle, 0)}° · ${verdict}`;
    return item;
  }));
}

const message = (selector, text) => { const item = document.createElement('li'); item.className = 'path-message'; item.textContent = text; document.querySelector(selector).replaceChildren(item); };

// One toggle button per published stroke; clicking the active one clears the filter.
function renderFilter(selector, key, label) {
  const t = words[state.lang];
  const group = document.querySelector(selector);
  group.setAttribute('aria-label', label);
  group.replaceChildren(...shuttleData.strokes.items.map(({ id }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(state[key] === id));
    button.innerHTML = `<i style="background:${strokeColours[id]}"></i><span></span>`;
    button.querySelector('span').textContent = t.strokes[id];
    button.addEventListener('click', () => {
      state[key] = state[key] === id ? null : id;
      if (key === 'stroke') updatePaths(); else { updateReception(); }
      applyScene();
    });
    return button;
  }));
}

function renderList(selector, paths, selectable) {
  const t = words[state.lang];
  const list = document.querySelector(selector);
  list.replaceChildren(...paths.map(path => {
    const item = document.createElement('li');
    item.innerHTML = `<label>${selectable ? `<input type="radio" name="shot" ${state.selected === path.id ? 'checked' : ''} aria-label="select">` : ''}<input type="checkbox" ${state.hidden.has(path.id) ? '' : 'checked'} aria-label="show"><i style="background:${strokeColours[path.stroke]}"></i><span></span></label>`;
    item.querySelector('span').textContent = `${t.strokes[path.stroke]} · ${t.zones[path.zone]} ${t.lanes[path.lane]} · ${fmt(Math.hypot(path.v0.x, path.v0.y, path.v0.z), 0)} m/s · ${fmt(path.angle, 0)}° · ${fmt(path.time)} s`;
    item.querySelector('[type=checkbox]').addEventListener('change', event => {
      if (event.target.checked) state.hidden.delete(path.id); else state.hidden.add(path.id);
      applyScene();
    });
    item.querySelector('[type=radio]')?.addEventListener('change', () => {
      state.selected = path.id;
      updateReception();
      applyScene();
    });
    return item;
  }));
}

function renderPaths() {
  const t = words[state.lang];
  const s = state.shuttle;
  document.querySelector('#shuttle-world').textContent = s ? `${t.world}: x = ${fmt(s.x)}, y = ${fmt(s.y)}, z = ${fmt(s.z)} m` : '';
  for (const el of document.querySelectorAll('.shuttle-only')) el.hidden = !s;
  renderFilter('#stroke-filter', 'stroke', t.strokeGroup);
  renderList('#path-list', state.paths, true);
  if (s && !state.stroke) message('#path-list', t.pickStroke);
  else if (s && !state.paths.length) {
    message('#path-list', state.minHeight ? `${t.noStrokePaths} ${t.needHeight} ${fmt(state.minHeight)} m.` : t.noStrokePaths);
    renderFailures('#path-list', state.failed);
  }
  renderReception();
}

function updatePaths() {
  const options = { speed: field('speed'), strokes: [state.stroke] };
  state.paths = state.shuttle && state.stroke ? candidatePaths(state.shuttle, court, shuttleData, state.mode, options) : [];
  state.minHeight = state.shuttle && state.stroke && !state.paths.length ? minimumHeight(state.shuttle, court, shuttleData, state.mode, options) : null;
  state.failed = state.shuttle && state.stroke && !state.paths.length ? failures(state.shuttle, options) : [];
  state.hidden.clear();
  if (!selectedPath()) state.selected = null;
  renderPaths();
  updateReception();
}

const formPosition = form => {
  const data = new FormData(form);
  return playerToWorld(data.get('side'), { left: Number(data.get('left')), fromNet: Number(data.get('fromNet')), height: Number(data.get('height')) });
};
shuttleForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!court) return;
  state.shuttle = formPosition(shuttleForm);
  updatePaths();
  applyScene();
});
shuttleForm.addEventListener('reset', () => { state.shuttle = null; if (court) { updatePaths(); applyScene(); } });
for (const name of ['contactHeight', 'contactMs']) shuttleForm.elements[name].addEventListener('change', () => {
  if (!court || !shuttleForm.elements[name].checkValidity()) return;
  updateReception();
  applyScene();
});
playerForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!court) return;
  const p = formPosition(playerForm);
  state.player = { x: p.x, z: p.z, height: p.y };
  applyScene();
});
playerForm.addEventListener('reset', () => { state.player = null; if (court) applyScene(); });

function zoom(direction) {
  if (!court) return;
  if (state.view === '3d') scene3d?.zoom(direction);
  else {
    state.zoom = Math.min(2.4, Math.max(1, state.zoom + direction * 0.2));
    host.querySelector('svg').style.transform = `scale(${state.zoom})`;
  }
}

translate();
try {
  const [courtResponse, shuttleResponse] = await Promise.all([fetch('/assets/court.json'), fetch('/assets/shuttle.json')]);
  if (!courtResponse.ok || !shuttleResponse.ok) throw new Error(`HTTP ${courtResponse.status}/${shuttleResponse.status}`);
  [court, shuttleData] = await Promise.all([courtResponse.json(), shuttleResponse.json()]);
  if (court.unit !== 'm' || !Array.isArray(court.markings?.rectangles)) throw new Error('Invalid court data');
  renderMetrics();
  show2d();
} catch (error) {
  console.error('Court data unavailable:', error);
  status.textContent = words[state.lang].loadError;
}
