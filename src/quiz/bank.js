// 문제 은행 로드 + 같은 판에서 반복되지 않게 뽑기
import config from '../../data/config.json';

const mods = import.meta.glob('../../data/questions/*.json', { eager: true, import: 'default' });

export const BANK = {};
for (const [path, list] of Object.entries(mods)) {
  const type = Number(path.match(/(\d+)\.json$/)[1]);
  BANK[type] = list;
}
export { config };

export function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** 문제의 「갈래」: 같은 갈래가 몰리지 않게 (예: 품사 감별소에서 명사 문제만 줄줄이 X) */
function catOf(q) {
  if (q.type === 3) return q.pair ? `${q.pair.modPos}${q.pair.headPos}` : '';
  if ([1, 2, 4, 5, 6, 7].includes(q.type)) return String(q.answer ?? '');
  return '';
}
/** 비슷한 문제 판단용 낱말들 (영어 4글자 이상 · 한글 2글자 이상) */
function tokens(q) {
  const txt = [q.word, q.sentence, q.chunk, q.prompt, q.en, q.ko].filter((x) => typeof x === 'string').join(' ').toLowerCase();
  return new Set((txt.match(/[a-z]{4,}|[가-힣]{2,}/g) || []));
}
const similar = (A, B) => { if (!A.size || !B.size) return false; let n = 0; A.forEach((t) => { if (B.has(t)) n++; }); return n / Math.min(A.size, B.size) >= 0.6; };
/** 지금 페이지에서 낸 문제 기록 — 유형별 갈래 횟수 · 최근 문제(비슷한 문제 연속 방지) */
const catSeen = {};
const recent = [];
const remember = (q) => { const c = catOf(q); (catSeen[q.type] ||= {})[c] = ((catSeen[q.type] || {})[c] || 0) + 1; recent.push({ type: q.type, word: q.word, tok: tokens(q), cat: c }); if (recent.length > 14) recent.shift(); };

/** 난이도 코스: 'low'(하: 1·2단계, 쉬운 것부터) · 'mid'(중: 2·3단계 위주 + 1단계 조금) · 'high'(상: 3단계 중에서도 긴·어려운 문제 위주) */
let LEVEL = 'mid';
export const setLevel = (m) => { LEVEL = ['low', 'mid', 'high'].includes(m) ? m : 'mid'; };
export const getLevel = () => LEVEL;
const textLen = (q) => String(q.sentence || q.en || q.ko || q.chunk || q.prompt || q.word || '').length;

/** 난이도에 맞는 후보 목록 */
function poolFor(all, mode, n) {
  const L = (lv) => all.filter((q) => (q.level || 1) === lv);
  if (mode === 'low') return [...L(1), ...L(2)];
  if (mode === 'high') {
    const l3 = L(3).sort((a, b) => textLen(b) - textLen(a));
    if ([1, 2, 3].includes(all[0]?.type)) return l3; // 단어 문제는 길이와 난이도가 상관없음
    const hard = l3.slice(0, Math.max(n * 3, Math.ceil(l3.length * 0.75))); // 문장 문제: 3단계 중 더 길고 어려운 쪽
    return hard.length >= n * 2 ? hard : l3;
  }
  // 중: 2·3단계 전부 + 1단계는 1/4만
  const l1 = shuffle(L(1)); return [...l1.slice(0, Math.ceil(l1.length / 4)), ...L(2), ...L(3)];
}

/**
 * @param type   유형 번호
 * @param n      뽑을 수
 * @param used   이번 판에서 이미 낸 id 집합 (뽑은 id가 추가된다)
 * - 같은 판에서는 같은 문제를 다시 내지 않는다 (모자라면 그 유형만 비우고 다시).
 * - 갈래(정답 품사 · 성분 · 관사 …)가 골고루: 이번 판에서 적게 나온 갈래를 먼저, 같은 갈래는 연달아 X.
 * - 최근에 낸 문제와 같은 단어 · 비슷한 문장은 피한다.
 */
export function draw(type, n, used = new Set(), mode = LEVEL) {
  const all = BANK[type] || [];
  const list = poolFor(all, mode, n);
  let pool = list.filter((q) => !used.has(q.id));
  if (pool.length < n) {
    list.forEach((q) => used.delete(q.id));
    pool = list.slice();
  }
  pool = shuffle(pool);
  const picked = [];
  const local = {};
  const seen = catSeen[type] || {};
  let lastCat = recent.length ? recent[recent.length - 1].cat : null;
  const tooSimilar = (q) => {
    const T = tokens(q);
    return recent.some((r) => (q.word && r.word === q.word) || similar(T, r.tok)) || picked.some((p) => (q.word && p.word === q.word) || similar(T, tokens(p)) || p.explain === q.explain);
  };
  while (picked.length < n && pool.length) {
    // 점수가 낮을수록 먼저: 이번 판에서 덜 나온 갈래 · 이 칸에서 아직 안 나온 갈래 · 직전과 다른 갈래 · 비슷하지 않은 문제
    let best = null; let bestS = Infinity;
    for (const q of pool.slice(0, 60)) {
      const c = catOf(q);
      const s = (c ? (seen[c] || 0) + 3 * (local[c] || 0) + (c === lastCat ? 4 : 0) : 0) + (tooSimilar(q) ? 10 : 0) + Math.random() * 0.9;
      if (s < bestS) { bestS = s; best = q; }
    }
    picked.push(best); pool.splice(pool.indexOf(best), 1);
    const c = catOf(best); if (c) local[c] = (local[c] || 0) + 1; lastCat = c;
    remember(best);
  }
  // 한 칸 안에서는 쉬운 것 → 어려운 것 (같은 단계 안에서는 섞인 그대로)
  picked.sort((a, b) => (a.level || 1) - (b.level || 1));
  for (let i = 1; i < picked.length; i++) { // 정렬 뒤에도 같은 갈래가 붙어 있으면 뒤쪽과 자리 바꾸기
    const c = catOf(picked[i]); if (!c || c !== catOf(picked[i - 1])) continue;
    const j = picked.findIndex((q, k) => k > i && catOf(q) !== c && catOf(q) !== catOf(picked[k - 1] || {}));
    if (j > 0) [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  picked.forEach((q) => used.add(q.id));
  return picked;
}

/** 미니게임용: 여러 유형에서 1문제씩 돌아가며 (유형이 골고루 · 같은 판에서 반복 없음) */
const sessionUsed = new Set();
const typeTurns = {};
export function drawMixed(types, used = sessionUsed, mode = LEVEL) {
  const key = types.join(',');
  if (!typeTurns[key]?.length) { let t = shuffle(types); if (typeTurns[key + '#last'] === t[t.length - 1] && t.length > 1) t = [t[t.length - 1], ...t.slice(0, -1)]; typeTurns[key] = t; }
  const t = typeTurns[key].pop(); typeTurns[key + '#last'] = t;
  return draw(t, 1, used, mode)[0];
}
/** 한 단계 어렵게 (하 → 중, 중 · 상 → 상) — 미니게임 속 퀴즈용 */
export const harderLevel = () => (LEVEL === 'low' ? 'mid' : 'high');
