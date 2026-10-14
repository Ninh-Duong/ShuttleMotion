// Shared helpers for the learner pages: UI language, words common to every page, number format, JSON fetch and the
// 3D scene mount. DOM access stays inside functions so the module also loads in Node tests.
const LANG_KEY = 'shuttlemotion-language';

const common = {
  vi: {
    courtLink: 'Sân', shotLink: 'Mô phỏng cú đánh', trainingLink: 'Luyện tập đánh đôi', singles: 'Đơn', doubles: 'Đôi', reset: 'Đặt lại',
    loading: 'Đang tải…', noWebgl: 'Trình duyệt này không mở được 3D.',
    strokes: { smash: 'Đập cầu', clear: 'Phông cầu', drop: 'Bỏ nhỏ' }, lanes: { left: 'trái', centre: 'giữa', right: 'phải' }
  },
  en: {
    courtLink: 'Court', shotLink: 'Shot lab', trainingLink: 'Doubles training', singles: 'Singles', doubles: 'Doubles', reset: 'Reset',
    loading: 'Loading…', noWebgl: '3D is unavailable in this browser.',
    strokes: { smash: 'Smash', clear: 'Clear', drop: 'Drop' }, lanes: { left: 'left', centre: 'centre', right: 'right' }
  }
};

// A page's words on top of the common ones; page entries win.
export const withCommon = page => ({ vi: { ...common.vi, ...page.vi }, en: { ...common.en, ...page.en } });

export function loadLang() {
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'vi'; } catch { return 'vi'; }
}

// Switches to the other language, remembers it in this browser and returns it.
export function toggleLang(lang) {
  const next = lang === 'vi' ? 'en' : 'vi';
  try { localStorage.setItem(LANG_KEY, next); } catch {}
  return next;
}

// Sets <html lang>, every [data-i18n] text and the language button, which names the other language.
export function applyText(words, lang) {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = words[el.dataset.i18n];
  document.querySelector('#language').textContent = lang === 'vi' ? 'EN' : 'VI';
}

export const locale = lang => (lang === 'vi' ? 'vi-VN' : 'en-US');

const formats = new Map();
export function formatNumber(lang, value, digits = 2) {
  const key = `${lang}:${digits}`;
  if (!formats.has(key)) formats.set(key, new Intl.NumberFormat(locale(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits }));
  return formats.get(key).format(value);
}

export async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

// mountCourt3d from the shared Three.js court (court-3d.mjs), loaded on demand. Throws when WebGL2 or the module is
// unavailable so the page can fall back.
export async function loadCourt3d() {
  if (!document.createElement('canvas').getContext('webgl2')) throw new Error('WebGL2 unavailable');
  return (await import('./court-3d.mjs')).mountCourt3d;
}
