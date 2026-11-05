/**
 * Ted와 함께하는 품사 원정대 · 선생님용 구글 시트 (반 전체 순위표 + 성적표)
 * 구글 시트 → 확장 프로그램 → Apps Script 에 이 코드를 통째로 붙여 넣고 "웹 앱"으로 배포하세요. (apps-script/README.md)
 *
 * 시트 탭 (처음 기록될 때 자동으로 만들어져요)
 *  - 성적표        : 원정을 끝낼 때마다 한 줄 (정답률 · 유형별 정답률 · 약한 유형 · 총점 · 회차 · 레벨 · 과자 · 게임 점수 …)
 *  - 퀴즈기록      : 퀴즈 칸(5문제)을 끝낼 때마다 한 줄 (유형 · 맞힌 수 · 틀린 문제)
 *  - 과자획득      : 미니게임에서 과자를 받을 때마다 한 줄 (과자 · 게임 · 쿠폰 번호)
 *  - 품사원정대_점수 : 미니게임 · 완주 점수가 한 판마다 한 줄 (명예의 전당 순위 계산용)
 *  - 명예의전당    : 게임별 1~10위 (점수가 기록될 때마다 새로 정리)
 */
const SHEET = '품사원정대_점수';
const GAME_NAME = { shoot: '🎯 품사 사격장', run: '🏃 청크런', kart: '🏎️ 청크 카트', crane: '🧸 청크 크레인', drum: '🥁 품사 드럼', board: '🏰 원정대 총점' };
const SNACK_NAME = { choco: '초코파이', cake: '오예스', cookie: '오예스 쿠키앤크림' };

function doPost(e) {
  const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const req = JSON.parse(e.postData.contents || '{}');
    const fns = { submitScore: submitScore, getRanking: getRanking, reportQuiz: reportQuiz, reportRun: reportRun, reportSnack: reportSnack };
    if (!fns[req.fn]) return out({ ok: false, error: 'unknown fn' });
    return out({ ok: true, result: fns[req.fn].apply(null, req.args || []) });
  } catch (err) { return out({ ok: false, error: String(err) }); }
}

/** 이름이 name인 탭 (없으면 머리줄과 함께 새로 만들기) */
function tab_(name, header, color) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(header);
    sh.getRange(1, 1, 1, header.length).setBackground(color || '#2B2350').setFontColor('#FFFFFF').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function sheet_() { return tab_(SHEET, ['기록 시각', '게임', '이름', '점수']); }
function append_(sh, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { sh.appendRow(row); } finally { lock.releaseLock(); }
}
const clean_ = (s, n) => String(s == null ? '' : s).trim().slice(0, n || 40);

/** 점수 기록 + 그 게임 순위 반환 (명예의 전당) */
function submitScore(r) {
  const name = clean_(r.name, 20);
  const game = clean_(r.game, 20);
  const score = Math.max(0, Math.min(999999, Number(r.score) || 0));
  if (!name || !game) return { list: [], myRank: 0, count: 0 };
  append_(sheet_(), [new Date(), game, name, score]);
  try { updateHall_(); } catch (e) { /* 명예의전당 탭 정리 실패해도 기록은 됨 */ }
  return getRanking(game, name);
}

/** 순위만 보기 */
function getRanking(game, me) {
  const list = rankList_(game);
  let myRank = 0;
  list.forEach(function (p, i) { if (p.name === String(me || '').trim()) myRank = i + 1; });
  return { list: list.slice(0, Math.max(10, myRank)), myRank: myRank, count: list.length };
}
function rankList_(game) {
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
  return Object.keys(by).map(function (k) { return by[k]; })
    .sort(function (a, b) { return b.best - a.best || b.total - a.total || a.at - b.at; });
}

/** 🏆 명예의전당 탭: 게임별 1~10위를 옆으로 나란히 */
function updateHall_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('명예의전당');
  if (!sh) sh = ss.insertSheet('명예의전당');
  sh.clear();
  const games = Object.keys(GAME_NAME);
  const medal = ['🥇', '🥈', '🥉'];
  games.forEach(function (g, k) {
    const col = 1 + k * 4;
    const list = rankList_(g).slice(0, 10);
    sh.getRange(1, col, 1, 3).merge().setValue(GAME_NAME[g]).setBackground('#2B2350').setFontColor('#FFD43B').setFontWeight('bold').setHorizontalAlignment('center');
    sh.getRange(2, col, 1, 3).setValues([['순위', '이름', '최고 점수']]).setFontWeight('bold').setBackground('#EDE6FF');
    const rows = list.map(function (p, i) { return [medal[i] || (i + 1), p.name, p.best]; });
    if (rows.length) sh.getRange(3, col, rows.length, 3).setValues(rows);
    if (rows.length >= 1) sh.getRange(3, col, 1, 3).setBackground('#FFF1C2');
    if (rows.length >= 2) sh.getRange(4, col, 1, 3).setBackground('#EEF1F6');
    if (rows.length >= 3) sh.getRange(5, col, 1, 3).setBackground('#F8E3D2');
  });
  sh.getRange(14, 1).setValue('※ 점수가 기록될 때마다 자동으로 새로 정리돼요 · 학생마다 그 게임의 최고 점수 기준').setFontColor('#6B5F8A');
}

/** 📝 퀴즈기록: 퀴즈 칸 하나 */
function reportQuiz(r) {
  const sh = tab_('퀴즈기록', ['기록 시각', '이름', '난이도', '회차', '지역', '칸', '유형', '유형 이름', '맞힌 수', '문항 수', '정답률(%)', '틀린 문제 (질문 → 내 답 / 정답)'], '#2E7BC4');
  const acc = r.total ? Math.round((r.correct / r.total) * 100) : 0;
  append_(sh, [new Date(), clean_(r.name, 20), clean_(r.level, 10), Number(r.run) || 1, clean_(r.where, 20), Number(r.cell) || 0,
    Number(r.type) || 0, clean_(r.typeName, 30), Number(r.correct) || 0, Number(r.total) || 0, acc, clean_(r.wrongs, 1500)]);
  return true;
}

/** 📊 성적표: 원정 완주 */
function reportRun(r) {
  const T = []; for (let t = 1; t <= 12; t++) T.push('유형' + t + '(%)');
  const header = ['기록 시각', '이름', '난이도', '회차', '정답', '문항', '정답률(%)'].concat(T)
    .concat(['약한 유형', '코인', '턴', '총점', '누적 점수', '레벨', '과자 수', '받은 과자', '펫 수', '아너스 미션', '걸린 시간(분)',
      '사격장', '청크런', '카트', '크레인', '드럼']);
  const sh = tab_('성적표', header, '#7A3FA8');
  const bt = r.byType || {}; const gm = r.games || {};
  const row = [new Date(), clean_(r.name, 20), clean_(r.level, 10), Number(r.run) || 1, Number(r.correct) || 0, Number(r.answered) || 0, Number(r.acc) || 0];
  for (let t = 1; t <= 12; t++) row.push(bt[t] === undefined ? '' : bt[t]);
  row.push(clean_(r.weak, 80), Number(r.coins) || 0, Number(r.turns) || 0, Number(r.total) || 0, Number(r.xp) || 0, clean_(r.careerLevel, 30),
    Number(r.snackN) || 0, clean_(r.snacks, 300), Number(r.pets) || 0, clean_(r.honors, 10), r.minutes || '',
    gm.shoot || '', gm.run || '', gm.kart || '', gm.crane || '', gm.drum || '');
  append_(sh, row);
  return true;
}

/** 🍫 과자획득 */
function reportSnack(r) {
  const sh = tab_('과자획득', ['기록 시각', '이름', '난이도', '회차', '과자', '받은 곳', '쿠폰 번호', '지급 확인'], '#D9822B');
  append_(sh, [new Date(), clean_(r.name, 20), clean_(r.level, 10), Number(r.run) || 1, SNACK_NAME[r.kind] || clean_(r.kind, 20), clean_(r.how, 30), clean_(r.code, 20), '']);
  return true;
}
