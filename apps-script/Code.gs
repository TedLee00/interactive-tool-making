/**
 * TED와 함께하는 품사 원정대 · 반 전체 순위표
 * 구글 시트 → 확장 프로그램 → Apps Script 에 이 코드를 붙여 넣고 "웹 앱"으로 배포하세요. (apps-script/README.md)
 *  - 품사원정대_점수 : 게임이 끝날 때마다 한 줄씩 (시각 · 게임 · 이름 · 점수)
 *  - 순위는 학생(이름)마다 그 게임의 최고 점수, 누적 점수 · 판 수도 함께 계산
 */
const SHEET = '품사원정대_점수';

function doPost(e) {
  const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    const fns = { submitScore: submitScore, getRanking: getRanking };
    if (!fns[req.fn]) return out({ ok: false, error: 'unknown fn' });
    return out({ ok: true, result: fns[req.fn].apply(null, req.args || []) });
  } catch (err) { return out({ ok: false, error: String(err) }); }
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['기록 시각', '게임', '이름', '점수']);
    sh.getRange(1, 1, 1, 4).setBackground('#2B2350').setFontColor('#FFFFFF').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** 점수 기록 + 그 게임 순위 반환 */
function submitScore(r) {
  const name = String(r.name || '').trim().slice(0, 20);
  const game = String(r.game || '').trim().slice(0, 20);
  const score = Math.max(0, Math.min(999999, Number(r.score) || 0));
  if (!name || !game) return { list: [], myRank: 0, count: 0 };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { sheet_().appendRow([new Date(), game, name, score]); } finally { lock.releaseLock(); }
  return getRanking(game, name);
}

/** 순위만 보기 */
function getRanking(game, me) {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const by = {};
  rows.forEach(function (row) {
    if (String(row[1]) !== String(game)) return;
    const name = String(row[2]).trim(); const sc = Number(row[3]) || 0; const at = new Date(row[0]).getTime() || 0;
    if (!name) return;
    const b = by[name] || (by[name] = { name: name, best: 0, total: 0, plays: 0, at: at });
    b.plays++; b.total += sc;
    if (sc > b.best) { b.best = sc; b.at = at; }
  });
  const list = Object.keys(by).map(function (k) { return by[k]; })
    .sort(function (a, b) { return b.best - a.best || b.total - a.total || a.at - b.at; });
  let myRank = 0;
  list.forEach(function (p, i) { if (p.name === String(me || '').trim()) myRank = i + 1; });
  return { list: list.slice(0, Math.max(10, myRank)), myRank: myRank, count: list.length };
}
