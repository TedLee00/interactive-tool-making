// 품사·성분·유형 정의 — 교재(「영문법 기초 · 언어의 이해」) 용어와 기호를 그대로 쓴다.

/** 5품사 청크 코드 → 이름·기호·교재 색 */
export const POS = {
  N: { name: '명사', sym: '○', open: '', close: '', cls: 'pos-n', color: '#C8372D' },
  V: { name: '동사', sym: '□', open: '', close: '', cls: 'pos-v', color: '#1F5FB8' },
  A: { name: '형용사', sym: '( )', open: '(', close: ')', cls: 'pos-a', color: '#E4801A' },
  D: { name: '부사', sym: '< >', open: '<', close: '>', cls: 'pos-d', color: '#6A3FA0' },
  C: { name: '접속사', sym: '△', open: '△', close: '', cls: 'pos-c', color: '#2E8B57' },
};
export const POS_ORDER = ['N', 'V', 'A', 'D', 'C'];

/** 8품사 (유형 1·2 선택지) */
export const EIGHT_POS = ['명사', '대명사', '동사', '형용사', '부사', '전치사', '접속사', '감탄사'];

/** 청크 단위 라벨 (유형 6·7 선택지). 형용사절은 교재 범위 밖이라 쓰지 않는다. */
export const CHUNK_LABELS = ['명사', '명사구', '명사절', '동사', '형용사', '형용사구', '부사', '부사구', '부사절', '접속사'];

/** 문장 성분 (유형 5) — 원장님 결정: 서술어(동사) */
export const ROLES = {
  S: '주어(S)',
  V: '서술어(동사)(V)',
  O: '목적어(O)',
  C: '보어(C)',
  M: '수식어(M)',
};

export const ARTICLES = ['a', 'an', 'the', 'X'];

/** 유형 12종 — 기획서 2번 표 */
export const TYPES = {
  1: { name: '품사 감별소 (영어)', short: '품사 감별소', level: '하', kind: 'choice' },
  2: { name: '품사 감별소 (한글)', short: '품사 감별소', level: '하', kind: 'choice' },
  3: { name: '짝꿍 찾기 카페', short: '짝꿍 찾기 카페', level: '하~중', kind: 'choice' },
  4: { name: '관사 검문소', short: '관사 검문소', level: '하~중', kind: 'choice' },
  5: { name: '성분 조립 공장', short: '성분 조립 공장', level: '중', kind: 'choice' },
  6: { name: '청크 감정소 (한글)', short: '청크 감정소', level: '중', kind: 'choice', chunkRule: true },
  7: { name: '청크 감정소 (영어)', short: '청크 감정소', level: '중', kind: 'choice', chunkRule: true },
  8: { name: '청크 절단소 (한글)', short: '청크 절단소', level: '중상', kind: 'split', chunkRule: true },
  9: { name: '청크 절단소 (영어)', short: '청크 절단소', level: '중상', kind: 'split', chunkRule: true },
  10: { name: '오류 수리점', short: '오류 수리점', level: '중상', kind: 'repair', chunkRule: true },
  11: { name: '청크 퍼즐 광장', short: '청크 퍼즐 광장', level: '상', kind: 'puzzle', chunkRule: true },
  12: { name: '번역의 탑', short: '번역의 탑', level: '상', kind: 'tower', chunkRule: true },
};

/** 청크 유형 시작 화면 안내 (원장님 결정 2026-11-02) */
export const CHUNK_RULE_HTML = `
<h3>📌 5품사 청크 독해 법칙</h3>
<p>묶을 수 있는 건 <b>최대한 크게</b> 묶어요!</p>
<ol>
  <li>명사 앞에 있는 형용사(a, the, my 포함)는 <b>명사의 일부</b> → 통째로 <b class="pos-n-t">명사구 ○</b><br><span class="ex">○The pretty girl</span></li>
  <li>보어 자리 형용사 앞에 있는 부사는 <b>형용사의 일부</b> → 통째로 <b class="pos-a-t">형용사구 ( )</b><br><span class="ex">□was (very long)</span></li>
</ol>
<p class="goal">큰 덩어리 4~5개로 문장 뼈대를 빨리 보고, 덩어리 순서대로 머릿속에서 번역해요.</p>`;
