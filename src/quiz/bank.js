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

/** 비슷한 문제로 볼 기준: 같은 정답 · 같은 해설 · 같은 단어 */
function simKey(q) {
  return [q.answer ?? '', q.word ?? q.chunk ?? ''];
}

/**
 * @param type   유형 번호
 * @param n      뽑을 수
 * @param used   이번 판에서 이미 낸 id 집합 (뽑은 id가 추가된다)
 * - 같은 판에서는 같은 문제를 다시 내지 않는다 (모자라면 그 유형만 비우고 다시).
 * - 한 번에 뽑는 문제끼리는 정답이 2번 넘게 겹치지 않고, 같은 해설·같은 단어도 피한다.
 */
/** 난이도 코스: 'low'(하: 1·2단계, 쉬운 것부터) · 'mid'(중: 1·2·3단계 고루) · 'high'(상: 3단계 어려운 문제만) */
let LEVEL = 'mid';
export const setLevel = (m) => { LEVEL = ['low', 'mid', 'high'].includes(m) ? m : 'mid'; };
export const getLevel = () => LEVEL;

/** 후보 순서: 상 = 3단계 먼저, 그다음 2단계 / 중 = 1·2·3단계를 번갈아 */
function order(pool, mode) {
  const by = [1, 2, 3].map((lv) => shuffle(pool.filter((q) => (q.level || 1) === lv)));
  if (mode === 'high') return [...by[2], ...by[1]];
  if (mode === 'low') return [...by[0], ...by[1]];
  const out = [];
  for (let i = 0; by.some((b) => i < b.length); i++) by.forEach((b) => { if (i < b.length) out.push(b[i]); });
  // 한 칸 안에서 섞이되 늘 1·2·3 순서로만 나오지 않게 앞쪽 몇 개는 살짝 섞는다
  return [...shuffle(out.slice(0, 6)), ...out.slice(6)];
}

export function draw(type, n, used = new Set(), mode = LEVEL) {
  const all = BANK[type] || [];
  // 상: 3단계만 (모자라면 2·3단계) / 하: 1·2단계만 / 중: 전부
  const lv3 = all.filter((q) => (q.level || 1) === 3);
  const lv23 = all.filter((q) => (q.level || 1) >= 2);
  const lv12 = all.filter((q) => (q.level || 1) <= 2);
  const list = mode === 'high' ? (lv3.length >= n * 2 ? lv3 : lv23) : mode === 'low' ? lv12 : all;
  let pool = list.filter((q) => !used.has(q.id));
  if (pool.length < n) {
    list.forEach((q) => used.delete(q.id));
    pool = list.slice();
  }
  const picked = [];
  const ansCount = new Map();
  const explains = new Set();
  const words = new Set();
  const cand = order(pool, mode);
  const maxSameAnswer = n >= 5 ? 2 : 1;
  for (const q of cand) {
    if (picked.length >= n) break;
    const [ans, word] = simKey(q);
    if (ans && (ansCount.get(ans) || 0) >= maxSameAnswer) continue;
    if (explains.has(q.explain)) continue;
    if (word && words.has(word)) continue;
    picked.push(q);
    ansCount.set(ans, (ansCount.get(ans) || 0) + 1);
    explains.add(q.explain);
    if (word) words.add(word);
  }
  for (const q of cand) { if (picked.length >= n) break; if (!picked.includes(q)) picked.push(q); }
  picked.sort((a, b) => a.level - b.level);
  picked.forEach((q) => used.add(q.id));
  return picked;
}

/** 미니게임용: 여러 유형에서 1문제씩 돌아가며 (같은 판에서 반복 없음) */
const sessionUsed = new Set();
let typeTurn = [];
export function drawMixed(types, used = sessionUsed, mode = LEVEL) {
  if (!typeTurn.length) typeTurn = shuffle(types);
  const t = typeTurn.pop();
  return draw(t, 1, used, mode)[0];
}
/** 한 단계 어렵게 (하 → 중, 중 · 상 → 상) — 미니게임 속 퀴즈용 */
export const harderLevel = () => (LEVEL === 'low' ? 'mid' : 'high');
