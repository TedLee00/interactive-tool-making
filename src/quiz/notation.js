// 청크 표기법
//   "N:The pretty girl | A:in the red clothes | V:was smiling | D:at me"
//   번역의 탑:  "N:나는=I | V:먹는다=eat/have"  (= 뒤는 허용 답안, / 로 구분)
import { POS } from './constants.js';

/** @returns {{pos:string,text:string,words:string[],answers?:string[]}[]} */
export function parseChunks(notation) {
  return notation.split('|').map((raw) => {
    const s = raw.trim();
    const m = /^([NVADC]):(.+)$/.exec(s);
    if (!m) throw new Error(`청크 표기 오류: "${s}"`);
    const [textPart, ansPart] = m[2].split('=');
    const text = textPart.trim();
    const c = { pos: m[1], text, words: text.split(/\s+/) };
    if (ansPart !== undefined) c.answers = ansPart.split('/').map((a) => a.trim()).filter(Boolean);
    return c;
  });
}

/** 청크 목록 → 단어 배열 + 경계(각 청크가 끝나는 단어 위치 뒤의 틈 번호) */
export function chunksToTokens(chunks) {
  const tokens = [];
  const cuts = []; // gap index g = 단어 g 와 g+1 사이
  chunks.forEach((c, i) => {
    tokens.push(...c.words);
    if (i < chunks.length - 1) cuts.push(tokens.length - 1);
  });
  return { tokens, cuts, labels: chunks.map((c) => c.pos) };
}

/** 틈 번호 집합 + 라벨 → 청크 목록 */
export function tokensToChunks(tokens, cuts, labels) {
  const sorted = [...cuts].sort((a, b) => a - b);
  const out = [];
  let start = 0;
  [...sorted, tokens.length - 1].forEach((end, i) => {
    out.push({ pos: labels ? labels[i] : null, words: tokens.slice(start, end + 1), text: tokens.slice(start, end + 1).join(' ') });
    start = end + 1;
  });
  return out;
}

/** 기호를 붙인 문자열: ○I □was (hungry) */
export function chunkPlain(c) {
  const p = POS[c.pos];
  if (c.pos === 'N') return `○${c.text}`;
  if (c.pos === 'V') return `□${c.text}`;
  if (c.pos === 'C') return `△${c.text}`;
  return `${p.open}${c.text}${p.close}`;
}

export function chunksPlain(chunks) {
  return chunks.map(chunkPlain).join(' ');
}

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
export { esc };

/** 교재식 색 + 기호 HTML */
export function chunkHTML(c, extraCls = '') {
  const pos = c.pos ? POS[c.pos] : null;
  if (!pos) return `<span class="ck ck-none ${extraCls}">${esc(c.text)}</span>`;
  const open = c.pos === 'C' ? '△' : pos.open;
  return `<span class="ck ${pos.cls} ${extraCls}"><i class="br">${esc(open)}</i>${esc(c.text)}<i class="br">${esc(pos.close)}</i></span>`;
}

export function chunksHTML(chunks, end = '') {
  return chunks.map((c) => chunkHTML(c)).join(' ') + (end ? `<span class="end">${esc(end)}</span>` : '');
}

/** [대괄호] 부분을 강조 표시 (유형 5·7) */
export function bracketHTML(sentence) {
  return esc(sentence).replace(/\[([^\]]+)\]/g, '<mark class="target">$1</mark>');
}
export function bracketPlain(sentence) {
  return sentence.replace(/\[([^\]]+)\]/g, '[$1]');
}
