/**
 * Step Up 4 · Movie Quiz — 백년지대계
 * 어느 방식으로 설치해도 성적표가 자동으로 만들어집니다.
 *  · 시트 → 확장 프로그램 → Apps Script 로 만들었으면 → 그 시트 안에 탭 생성
 *  · script.google.com 에서 따로 만들었으면 → 내 드라이브에 'Step Up 4 퀴즈 성적표' 파일을 자동 생성
 *  - StepUp4_성적표 : 단계를 끝낼 때마다 한 줄씩 저장
 *  - StepUp4_순위   : 1~3단계를 모두 끝내고 '최종 결과'를 열면 저장 → 시상대 순위 계산
 *  - StepUp4_상품   : 인형뽑기(연속 15문제 정답) · 초코파이 찬스로 받은 상품
 */
const SHEET_SCORE = 'StepUp4_성적표';
const SHEET_RANK  = 'StepUp4_순위';
const SHEET_PRIZE = 'StepUp4_상품';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Step Up 4 · Movie Quiz')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 성적표 파일: 시트에 붙은 스크립트면 그 시트, 아니면 드라이브에 자동 생성(한 번만) */
/** 외부 웹사이트(GitHub Pages 등)에 올린 퀴즈 화면이 점수를 보내는 입구.
 *  본문: {"fn": "saveResult" | "savePrize" | "saveFinal" | "getRanking", "args": [...]} */
function doPost(e) {
  const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    const fns = {saveResult: saveResult, savePrize: savePrize, saveFinal: saveFinal, getRanking: getRanking};
    if (!fns[req.fn]) return out({ok: false, error: 'unknown fn'});
    return out({ok: true, result: fns[req.fn].apply(null, req.args || [])});
  } catch (err) { return out({ok: false, error: String(err)}); }
}

function book_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('BOOK_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }   // 지워졌으면 새로 만듦
  const ss = SpreadsheetApp.create('Step Up 4 퀴즈 성적표');
  props.setProperty('BOOK_ID', ss.getId());
  return ss;
}

/** 선생님용: 편집기에서 이 함수를 한 번 실행하면 성적표 파일 주소가 로그에 나옵니다 */
function showSheetUrl() { Logger.log(book_().getUrl()); }

function sheet_(name, headers) {
  const ss = book_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setBackground('#1B2F4E').setFontColor('#FFFFFF').setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 150);
  }
  return sh;
}

/** 단계별 결과 저장 */
function saveResult(r) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_(SHEET_SCORE, ['제출 시각', '이름', '단계', '점수', '만점', '걸린 시간(초)', '오답 목록'])
      .appendRow([new Date(), r.name, r.stage, r.score, r.max, r.seconds, r.wrong]);
  } finally { lock.releaseLock(); }
  return true;
}

/** 상품 기록 (인형뽑기 · 초코파이 찬스) */
function savePrize(r) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_(SHEET_PRIZE, ['획득 시각', '이름', '상품', '획득 방법', '지급 완료']);
    sh.appendRow([new Date(), r.name, r.prize, r.how, false]);
    sh.getRange(sh.getLastRow(), 5).insertCheckboxes();   // 상품을 주면 체크
  } finally { lock.releaseLock(); }
  return true;
}

/** 최종 점수 저장 + 순위 반환 (이름별 최고 점수 기준, 동점이면 시간이 짧은 학생이 위) */
function saveFinal(r) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let rows;
  try {
    const sh = sheet_(SHEET_RANK, ['제출 시각', '이름', '1단계', '2단계', '3단계', '총점', '걸린 시간(초)']);
    sh.appendRow([new Date(), r.name, r.s1, r.s2, r.s3, r.total, r.seconds]);
    rows = sh.getDataRange().getValues().slice(1);
  } finally { lock.releaseLock(); }
  return rank_(rows, r.name);
}

/** 순위만 다시 보기 (선생님용·필요 시) */
function getRanking(name) {
  const sh = book_().getSheetByName(SHEET_RANK);
  if (!sh) return {list: [], myRank: 0, count: 0};
  return rank_(sh.getDataRange().getValues().slice(1), name);
}

function rank_(rows, me) {
  const best = {};
  rows.forEach(function (row) {
    const name = String(row[1]).trim(), total = Number(row[5]) || 0, sec = Number(row[6]) || 99999;
    if (!name) return;
    const b = best[name];
    if (!b || total > b.total || (total === b.total && sec < b.seconds)) best[name] = {name: name, total: total, seconds: sec};
  });
  const list = Object.keys(best).map(function (k) { return best[k]; })
    .sort(function (a, b) { return b.total - a.total || a.seconds - b.seconds; });
  let myRank = 0;
  list.forEach(function (p, i) { if (p.name === String(me).trim()) myRank = i + 1; });
  return {list: list.slice(0, Math.max(10, myRank)), myRank: myRank, count: list.length};
}
