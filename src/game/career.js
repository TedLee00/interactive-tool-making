// 🔁 다회차 기록 — 같은 이름으로 다시 하면 누적 점수가 쌓여 캐릭터 레벨이 오르고, 새 옷 · 장식이 생기며, 안 풀어 본 새 문제가 나온다
// (이 기기의 localStorage에 이름별로 저장)
const KEY = 'cq.career.v1';

/** 레벨표: 누적 점수(회차마다 총점이 더해짐) → 칭호 · 새로 입는 옷/장식 */
export const CAREER_LEVELS = [
  { lv: 1, xp: 0, title: '새싹 원정대원', outfit: '기본 옷' },
  { lv: 2, xp: 2500, title: '견습 탐험가', outfit: '🧣 탐험가 스카프' },
  { lv: 3, xp: 6000, title: '청크 탐험가', outfit: '🦸 영웅 망토' },
  { lv: 4, xp: 11000, title: '품사 기사', outfit: '⭐ 별 배지 + 반짝 금빛 신발' },
  { lv: 5, xp: 17000, title: '문장 마법사', outfit: '👑 황금 왕관' },
  { lv: 6, xp: 25000, title: '전설의 원정대장', outfit: '✨ 황금 오라 (몸 주위 빛 고리)' },
];

const keyOf = (name) => String(name || '').trim().toLowerCase();
const loadAll = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saveAll = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* 저장 불가 */ } };

/** 이름의 기록 (없으면 새 기록) */
export function getCareer(name) {
  const c = loadAll()[keyOf(name)];
  return c || { name, runs: 0, xp: 0, best: 0, seen: [], lastChar: null, lastLevel: null };
}

export function levelOf(xp) {
  let cur = CAREER_LEVELS[0];
  CAREER_LEVELS.forEach((L) => { if (xp >= L.xp) cur = L; });
  const next = CAREER_LEVELS.find((L) => L.xp > xp) || null;
  const pct = next ? Math.round(((xp - cur.xp) / (next.xp - cur.xp)) * 100) : 100;
  return { ...cur, next, pct };
}

/** 한 회차를 마쳤을 때: 총점을 누적하고, 푼 문제를 기억한다 → { before, after, career } */
export function finishRun(name, { score, used, char, level }) {
  const all = loadAll();
  const k = keyOf(name);
  const c = all[k] || { name, runs: 0, xp: 0, best: 0, seen: [] };
  const before = levelOf(c.xp);
  c.name = name; c.runs++; c.xp += Math.max(0, Math.round(score)); c.best = Math.max(c.best, score);
  c.seen = [...new Set([...(c.seen || []), ...(used || [])])];
  c.lastChar = char; c.lastLevel = level;
  all[k] = c; saveAll(all);
  return { before, after: levelOf(c.xp), career: c };
}
