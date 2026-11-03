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

/**
 * @param type   유형 번호
 * @param n      뽑을 수
 * @param used   이번 판에서 이미 낸 id 집합 (뽑은 id가 추가된다)
 * 남은 문제가 모자라면 그 유형의 기록만 비우고 다시 뽑는다.
 */
export function draw(type, n, used = new Set()) {
  const list = BANK[type] || [];
  let pool = list.filter((q) => !used.has(q.id));
  if (pool.length < n) {
    list.forEach((q) => used.delete(q.id));
    pool = list.slice();
  }
  // 쉬운 문제부터 (level 오름차순, 같은 level 안에서는 무작위)
  const picked = shuffle(pool).slice(0, n).sort((a, b) => a.level - b.level);
  picked.forEach((q) => used.add(q.id));
  return picked;
}
