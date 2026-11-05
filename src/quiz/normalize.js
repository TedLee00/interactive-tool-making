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
/* 원장님 결정 (2026-11-05): 깐깐하게 채점하지 말고 비슷하면 정답 — 타이핑 실수 · 관사 · 단수/복수 · -s/-ed/-ing · 띄어쓰기 · 단어 순서 정도는 봐준다 */
const STOP = new Set(['a', 'an', 'the']);
const stem = (w) => (w.length <= 3 ? w : w.replace(/ies$/, 'y').replace(/(es|s|ed|ing|d)$/, ''));
/** 같은 단어로 보기: 철자 실수(4글자 이상 1개, 7글자 이상 2개) · 어미(-s/-es/-ed/-ing) 차이 */
const sameWord = (x, y) => {
  if (x === y) return true;
  if (x.length >= 3 && y.length >= 3 && stem(x) === stem(y)) return true;
  const L = Math.min(x.length, y.length);
  return L >= 4 && lev([...x], [...y]) <= (L >= 7 ? 2 : 1);
};
const words = (s) => {
  const w = normalize(s).split(' ').filter(Boolean);
  const k = w.filter((x) => !STOP.has(x));
  return k.length ? k : w; // 관사는 빼고 비교 (관사만 있는 답이면 그대로)
};

/**
 * 비슷한 답이면 그 정답을, 아니면 null
 * 1) 띄어쓰기 · 철자만 조금 다름 (everyday ≈ every day)
 * 2) 같은 단어들인데 순서만 다름
 * 3) 단어 하나~몇 개가 빠지거나 더해지거나 바뀐 정도 (정답 2단어 이하 1개 · 4단어 이하 2개 · 그 이상 3개)
 *    — 단, 입력이 정답 단어의 절반 이상은 담고 있어야 한다
 */
export function nearMatch(input, answers) {
  const w = words(input);
  if (!w.length || !normalize(input)) return null;
  let best = null;
  const NEG = /\b(not|never|no)\b/;
  for (const a of answers) {
    const aw = words(a);
    if (NEG.test(normalize(a)) !== NEG.test(normalize(input))) continue; // not · never · no 가 빠지면 뜻이 반대 → 봐주지 않음
    const cs = w.join(''); const ca = aw.join('');
    if (ca.length >= 4 && lev([...cs], [...ca]) <= Math.max(1, Math.floor(ca.length / 8))) return a;
    if (w.length === aw.length) {
      const left = [...aw];
      if (w.every((x) => { const k = left.findIndex((y) => sameWord(x, y)); if (k < 0) return false; left.splice(k, 1); return true; })) return a;
    }
    const dist = lev(w, aw, sameWord);
    const allow = aw.length <= 2 ? 1 : aw.length <= 4 ? 2 : 3;
    const common = aw.filter((x) => w.some((y) => sameWord(x, y))).length;
    if (dist <= allow && common >= Math.ceil(aw.length / 2) && (!best || dist < best.dist)) best = { answer: a, dist };
  }
  return best ? best.answer : null;
}
