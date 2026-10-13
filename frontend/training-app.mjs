import { buildTimeline, playerPosition } from './lesson-timeline.mjs';
import { estimateJump, sampleFlight } from './shuttle-physics.mjs';

const words = {
  vi: {
    courtLink: 'Sân', shotLink: 'Mô phỏng cú đánh', kicker: 'LUYỆN TẬP ĐÁNH ĐÔI', draft: 'Bản nháp từ giáo trình BWF · chờ HLV duyệt',
    stageLabel: 'DI CHUYỂN 2 ĐẤU 2', loading: 'Đang tải…', ready: '3D · Phát, xem từng bước hoặc quay chậm', noWebgl: 'Trình duyệt này không mở được 3D.',
    loadError: 'Không tải được bài học. Hãy làm mới trang.', lessonError: 'Bài học này có dữ liệu không hợp lệ:',
    playAll: '▶ Phát', pause: '⏸ Dừng', topView: 'Nhìn từ trên', reset: 'Đặt lại',
    libraryTitle: 'BÀI HỌC', playersTitle: 'NGƯỜI CHƠI', notesTitle: 'GHI CHÚ', sourcesTitle: 'NGUỒN',
    step: 'Bước', page: 'tr.', speedsNote: 'Tốc độ minh họa (chưa có số đo)', end: 'Kết thúc: vị trí cuối của hai cặp',
    categories: { 'serve-receive': 'Giao & nhận giao', attack: 'Tấn công & đập cầu', defence: 'Phòng thủ & phản công', 'rotation-mixed': 'Xoay vị trí & đôi nam nữ' },
    shots: { lowServe: 'giao thấp', flickServe: 'giao bổng (flick)', lift: 'lốp cầu', smash: 'đập cầu', drop: 'bỏ nhỏ', block: 'chặn cầu', net: 'bỏ nhỏ lưới', clear: 'phông cầu' },
    teams: { A: 'Cặp A', B: 'Cặp B' },
    notes: {
      status: 'Tất cả bài đều là bản nháp soạn từ trang giáo trình được trích; cần huấn luyện viên duyệt.',
      positions: 'Vị trí đứng là cách dự án diễn giải mô tả bằng lời của giáo trình (ví dụ "gần chữ T"); giáo trình không cho khoảng cách mét.',
      sequence: 'Mỗi chuỗi cầu được chọn để minh họa vai trò được trích; giáo trình mô tả vai trò và lựa chọn, không phải pha cầu cố định.',
      translation: 'Câu trích là nguyên văn tiếng Anh; lời giải thích tiếng Việt do dự án dịch.'
    }
  },
  en: {
    courtLink: 'Court', shotLink: 'Shot lab', kicker: 'DOUBLES TRAINING', draft: 'Draft from BWF coaching material · awaiting coach review',
    stageLabel: '2 VS 2 MOVEMENT', loading: 'Loading…', ready: '3D · Play, step through or slow down', noWebgl: '3D is unavailable in this browser.',
    loadError: 'Lessons could not be loaded. Please refresh.', lessonError: 'This lesson has invalid data:',
    playAll: '▶ Play', pause: '⏸ Pause', topView: 'Top view', reset: 'Reset',
    libraryTitle: 'LESSONS', playersTitle: 'PLAYERS', notesTitle: 'NOTES', sourcesTitle: 'SOURCES',
    step: 'Step', page: 'p.', speedsNote: 'Illustrative speeds (not measured)', end: 'End: final positions of both pairs',
    categories: { 'serve-receive': 'Serve & receive', attack: 'Attack & smash', defence: 'Defence & counter-attack', 'rotation-mixed': 'Rotation & mixed doubles' },
    shots: { lowServe: 'low serve', flickServe: 'flick serve', lift: 'lift', smash: 'smash', drop: 'drop', block: 'block', net: 'net shot', clear: 'clear' },
    teams: { A: 'Pair A', B: 'Pair B' },
    notes: null
  }
};
const kits = { A1: 0x2d6cdf, A2: 0x8fb6ff, B1: 0xd8573c, B2: 0xf4a17d };

const host = document.querySelector('#court-host');
const status = document.querySelector('#stage-status');
const playButton = document.querySelector('#play');
const state = { lang: 'vi', list: null, id: null, detail: null, segments: [], step: 0, error: null };
let court, shuttle, player, scene, animation = null;
try { if (localStorage.getItem('shuttlemotion-language') === 'en') state.lang = 'en'; } catch {}

const t = () => words[state.lang];
const local = value => value?.[state.lang] ?? value?.en ?? '';
const getJson = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
};

function translate() {
  document.documentElement.lang = state.lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t()[el.dataset.i18n];
  document.querySelector('#language').textContent = state.lang === 'vi' ? 'EN' : 'VI';
  playButton.textContent = animation ? t().pause : t().playAll;
  if (state.list) renderLibrary();
  if (state.detail) renderLesson();
}

function renderLibrary() {
  const nav = document.querySelector('#library');
  nav.replaceChildren(...state.list.categories.map(category => {
    const group = document.createElement('section');
    group.innerHTML = '<h4></h4>';
    group.querySelector('h4').textContent = t().categories[category] ?? category;
    for (const lesson of state.list.lessons.filter(item => item.category === category)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(lesson.id === state.id));
      button.textContent = local(lesson.title);
      button.addEventListener('click', () => selectLesson(lesson.id));
      group.append(button);
    }
    return group;
  }));
}

function renderLesson() {
  const { lesson, sources, speeds, notes } = state.detail;
  document.querySelector('#lesson-title').textContent = local(lesson.title);
  document.querySelector('#lesson-objective').textContent = local(lesson.objective);
  document.querySelector('#legend').replaceChildren(...Object.entries(lesson.players).map(([id, p]) => {
    const item = document.createElement('li');
    item.innerHTML = `<i style="background:#${kits[id].toString(16).padStart(6, '0')}"></i><span></span>`;
    item.querySelector('span').textContent = `${id} · ${t().teams[p.team]}${p.role ? ` · ${local(p.role)}` : ''}`;
    return item;
  }));
  const noteText = t().notes ?? notes;
  const illustrative = Object.entries(speeds).filter(([, s]) => s.status === 'illustrative').map(([type, s]) => `${t().shots[type] ?? type} ${s.speed} m/s`);
  document.querySelector('#notes').replaceChildren(...[...Object.values(noteText), `${t().speedsNote}: ${illustrative.join(', ')}`].map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  const used = new Map(lesson.sources.map(ref => [ref.sourceId, ref.pages]));
  document.querySelector('#sources').replaceChildren(...sources.filter(source => used.has(source.id)).map(source => {
    const item = document.createElement('li');
    item.innerHTML = '<a target="_blank" rel="noopener noreferrer"></a>';
    const link = item.querySelector('a');
    link.href = source.url;
    link.textContent = `${source.title} · ${t().page} ${used.get(source.id)}`;
    return item;
  }));
  renderStepCard();
}

function renderStepCard() {
  const { lesson } = state.detail;
  const step = lesson.steps[state.step];
  const shot = step.shot;
  document.querySelector('#step-count').textContent = state.error
    ? `${t().lessonError} ${state.error}`
    : `${t().step} ${state.step + 1}/${lesson.steps.length}` + (shot ? ` · ${shot.by} ${t().shots[shot.type] ?? shot.type}` : ` · ${t().end}`);
  document.querySelector('#step-caption').textContent = local(step.caption);
  document.querySelector('#step-quote p').textContent = `“${step.quote.text}”`;
  const source = state.detail.sources.find(s => s.id === (step.quote.sourceId ?? lesson.sources[0].sourceId));
  document.querySelector('#step-quote cite').textContent = `${source?.title.split(',')[0] ?? ''} · ${t().page} ${step.quote.pages}`;
  for (const button of document.querySelectorAll('#library button')) button.setAttribute('aria-pressed', String(button.textContent === local(lesson.title)));
}

// Players move linearly from this step's positions to the next step's over the segment; the shuttle follows the flight.
function draw(stepIndex, time) {
  if (!scene) return;
  const { lesson } = state.detail;
  const step = lesson.steps[stepIndex];
  const next = lesson.steps[stepIndex + 1] ?? step;
  const segment = state.segments.find(s => s.step === stepIndex);
  const k = segment && segment.duration ? Math.min(1, time / segment.duration) : 0;
  for (const id of Object.keys(lesson.players)) {
    const a = playerPosition(lesson, step, id), b = playerPosition(lesson, next, id);
    scene.setPlayer({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, height: player.defaultProfile.heightM, kit: kits[id], racket: player.racket }, id);
  }
  if (!segment) {
    const last = state.segments.at(-1);
    const end = last?.points.at(-1);
    scene.setShuttle(end ? { x: end[0], y: end[1], z: end[2] } : null);
    scene.setTrail(null);
    return;
  }
  const at = sampleFlight(segment.points, Math.min(time, segment.duration));
  scene.setShuttle(at.position, at.direction);
  const trail = [];
  for (let s = Math.max(0, time - 0.4); s <= Math.min(time, segment.duration) + 1e-9; s += 0.01) trail.push({ ...sampleFlight(segment.points, s).position, color: '#e8f1ec' });
  scene.setTrail(trail.length > 1 ? trail : null);
}

function stop() {
  if (animation) cancelAnimationFrame(animation);
  animation = null;
  playButton.textContent = t().playAll;
}

function show(stepIndex) {
  stop();
  state.step = Math.max(0, Math.min(stepIndex, state.detail.lesson.steps.length - 1));
  renderStepCard();
  draw(state.step, 0);
}

// Plays from the current step; with all = false it plays one segment and stops at the next step.
function play(all) {
  stop();
  if (state.error) return;
  const rate = Number(document.querySelector('#rate').value);
  let start = performance.now();
  playButton.textContent = t().pause;
  const frame = now => {
    const segment = state.segments.find(s => s.step === state.step);
    if (!segment) { draw(state.step, 0); stop(); return; }
    const time = (now - start) / 1000 * rate;
    draw(state.step, time);
    if (time < segment.duration) { animation = requestAnimationFrame(frame); return; }
    if (state.step >= state.detail.lesson.steps.length - 1) { draw(state.step, segment.duration); stop(); return; }
    state.step += 1;
    renderStepCard();
    draw(state.step, 0);
    if (!all || !state.segments.find(s => s.step === state.step)) { stop(); return; }
    start = now;
    animation = requestAnimationFrame(frame);
  };
  animation = requestAnimationFrame(frame);
}

async function selectLesson(id) {
  stop();
  state.id = id;
  state.detail = await getJson(`/api/lessons/${encodeURIComponent(id)}`);
  const p = player.defaultProfile;
  const jump = estimateJump({ sex: p.sex, height: p.heightM, mass: p.massKg, level: p.level }, player.jumpModel);
  try {
    state.segments = buildTimeline(state.detail.lesson, { court, flight: shuttle.flight, speeds: state.detail.speeds, player, height: p.heightM, jump });
    state.error = null;
  } catch (error) {
    state.segments = [];
    state.error = error.message;
  }
  try { history.replaceState(null, '', `#${id}`); } catch {}
  renderLesson();
  show(0);
}

playButton.addEventListener('click', () => (animation ? stop() : play(true)));
document.querySelector('#next').addEventListener('click', () => play(false));
document.querySelector('#prev').addEventListener('click', () => show(state.step - 1));
document.querySelector('#top-view').addEventListener('click', () => scene?.focus({ x: 0, y: 0, z: 0 }, { x: 0, y: 17, z: 0.01 }));
document.querySelector('#reset-view').addEventListener('click', () => scene?.reset());
document.querySelector('#language').addEventListener('click', () => {
  state.lang = state.lang === 'vi' ? 'en' : 'vi';
  try { localStorage.setItem('shuttlemotion-language', state.lang); } catch {}
  translate();
});

translate();
try {
  [court, shuttle, player, state.list] = await Promise.all(['/assets/court.json', '/assets/shuttle.json', '/assets/player.json', '/api/lessons'].map(getJson));
  renderLibrary();
  try {
    if (!document.createElement('canvas').getContext('webgl2')) throw new Error('WebGL2 unavailable');
    const { mountCourt3d } = await import('./court-3d.mjs');
    scene = mountCourt3d(host, court, 'doubles', t().stageLabel, shuttle.specification);
    status.textContent = t().ready;
  } catch (error) {
    console.error('3D unavailable:', error);
    status.textContent = t().noWebgl;
  }
  const wanted = decodeURIComponent(location.hash.slice(1));
  await selectLesson(state.list.lessons.some(lesson => lesson.id === wanted) ? wanted : state.list.lessons[0].id);
} catch (error) {
  console.error('Training unavailable:', error);
  status.textContent = t().loadError;
}
