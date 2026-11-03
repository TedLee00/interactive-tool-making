// 영작 채점용 정규화: 대소문자·마침표·축약형·공백 차이를 없앤다 (기획서 2번, 유형 12)

const CONTRACTIONS = [
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\bi'm\b/g, 'i am'],
  [/\b(he|she|it|that|there|what|who|where)'s\b/g, '$1 is'],
  [/\b(\w+)'re\b/g, '$1 are'],
  [/\b(\w+)'ve\b/g, '$1 have'],
  [/\b(\w+)'ll\b/g, '$1 will'],
  [/\b(i|you|he|she|we|they)'d\b/g, '$1 would'],
];

export function normalize(s) {
  let t = String(s ?? '')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"');
  for (const [re, rep] of CONTRACTIONS) t = t.replace(re, rep);
  return t
    .replace(/[.,!?;:"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesAny(input, answers) {
  const n = normalize(input);
  if (!n) return false;
  return answers.some((a) => normalize(a) === n);
}

/* ---------- 비슷한 답 인정 (원장님 결정: 문법적으로 크게 틀리지 않으면 정답) ---------- */
function lev(a, b, eq = (x, y) => x === y) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1));
    }
  }
  return d[m][n];
}
/** 철자 실수 한 글자는 같은 단어로 (5글자 이상 단어만) */
const sameWord = (x, y) => x === y || (x.length >= 5 && y.length >= 5 && lev([...x], [...y]) <= 1);

/**
 * 거의 맞는 답이면 그 정답을, 아니면 null
 * - 단어 하나가 빠지거나 더해지거나 바뀐 정도 (정답이 5단어 이상이면 2개까지)
 * - 입력이 정답 단어의 절반 이상을 담고 있어야 한다
 */
export function nearMatch(input, answers) {
  const w = normalize(input).split(' ').filter(Boolean);
  if (!w.length) return null;
  let best = null;
  for (const a of answers) {
    const aw = normalize(a).split(' ').filter(Boolean);
    const dist = lev(w, aw, sameWord);
    const allow = aw.length >= 5 ? 2 : 1;
    const common = aw.filter((x) => w.some((y) => sameWord(x, y))).length;
    if (dist <= allow && common >= Math.ceil(aw.length / 2) && (!best || dist < best.dist)) best = { answer: a, dist };
  }
  return best ? best.answer : null;
}
