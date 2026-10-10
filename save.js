// Saved progress and the stars board rules. No 3D code here, so it can be checked on its own.
const KEY = 'qattoura-game-v1';
export const MAX_BANK = 99999;        // the bank never holds more, when saving and when loading

// Stars are earned by what the pupil does. They can never be bought.
export const STARS = [
  { id: 'cloud', name: 'نجمة صانع الغيوم', how: 'أكمل الرحلة وكوّن الغيمة' },
  { id: 'scientist', name: 'نجمة العالِم الصغير', how: 'أجب عن البوابات الثلاث من أول مرة' },
  { id: 'cool', name: 'نجمة البرودة', how: 'أنهِ محطة البرودة دون أن تلمس الحرارة' },
  { id: 'climb', name: 'نجمة الصعود', how: 'أنهِ محطة الصعود دون أن تلمس الغيوم المنخفضة' },
  { id: 'collector', name: 'نجمة جامع القطع', how: 'اجمع ٢٨٠ قطعة نقدية في رحلة واحدة' },
  { id: 'persist', name: 'نجمة المثابرة', how: 'أكمل الرحلة مرتين' }
];
export const COLLECTOR_COINS = 280;

export function freshState() {
  return { bank: 0, owned: [], worn: [], stars: [], runs: 0 };
}

const wholeNumber = (v, max) => (Number.isFinite(v) && v > 0 ? Math.min(max, Math.floor(v)) : 0);
const uniqueKnown = (list, known) => (Array.isArray(list) ? [...new Set(list)].filter((id) => known.includes(id)) : []);

// Turns anything read from storage into a valid state. goods: [{ id, slot }]
export function sanitize(raw, goods) {
  const s = freshState();
  if (!raw || typeof raw !== 'object') { return s; }
  s.bank = wholeNumber(raw.bank, MAX_BANK);
  s.runs = wholeNumber(raw.runs, MAX_BANK);
  s.owned = uniqueKnown(raw.owned, goods.map((g) => g.id));
  s.stars = uniqueKnown(raw.stars, STARS.map((st) => st.id));
  const slots = new Set();
  uniqueKnown(raw.worn, s.owned).forEach((id) => {
    const slot = goods.find((g) => g.id === id).slot;
    if (!slots.has(slot)) { slots.add(slot); s.worn.push(id); }
  });
  return s;
}

export function loadState(goods) {
  try {
    return sanitize(JSON.parse(globalThis.localStorage.getItem(KEY)), goods);
  } catch (e) {
    return freshState();
  }
}

export function saveState(state) {
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export function resetState() {
  try { globalThis.localStorage.removeItem(KEY); } catch (e) { /* storage is blocked: nothing was saved */ }
  return freshState();
}

// run: { finished, firstTries, heatHits, cloudHits, score }. state.runs already counts this run.
export function earnedStars(run, state) {
  if (!run.finished) { return []; }
  const ids = ['cloud'];
  if (run.firstTries === 3) { ids.push('scientist'); }
  if (run.heatHits === 0) { ids.push('cool'); }
  if (run.cloudHits === 0) { ids.push('climb'); }
  if (run.score >= COLLECTOR_COINS) { ids.push('collector'); }
  if (state.runs >= 2) { ids.push('persist'); }
  return ids;
}
