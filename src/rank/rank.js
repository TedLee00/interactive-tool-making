// 순위표 — 게임이 끝날 때마다 점수를 기록하고 순위를 보여 준다.
//  · data/config.json 의 rankApi(구글 Apps Script 웹 앱 주소)가 있으면 → 반 전체가 함께 쓰는 순위표 (모든 기기)
//  · 없거나 연결이 안 되면 → 이 기기에 저장된 순위표
// 순위 기준: 학생(이름)마다 그 게임의 최고 점수. 누적 점수(모든 판 합계)와 판 수도 함께 기록한다.
import config from '../../data/config.json';
import './rank.css';

const KEY = 'cq.board.v1';
const GAME_NAME = { crane: '🧸 청크 크레인', shoot: '🎯 품사 사격장', run: '🏃 청크런', kart: '🏎️ 청크 카트', drum: '🥁 품사 드럼', board: '🏰 품사 원정대 총점' };
let current = '';

export function setPlayer(name) { current = (name || '').trim(); }
export function getPlayer() {
  if (current) return current;
  try { return (JSON.parse(localStorage.getItem('cq.game.v1')) || {}).name || ''; } catch { return ''; }
}

const loadLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const saveLocal = (b) => { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* 저장 불가 */ } };

function rankOf(rows, me) {
  const list = rows.slice().sort((a, b) => b.best - a.best || b.total - a.total || a.at - b.at);
  const myRank = list.findIndex((r) => r.name === me) + 1;
  return { list: list.slice(0, Math.max(10, myRank)), myRank, count: list.length };
}

function submitLocal(game, name, score) {
  const B = loadLocal();
  const G = (B[game] ||= {});
  const r = (G[name] ||= { name, best: 0, total: 0, plays: 0, at: Date.now() });
  r.plays++; r.total += score;
  if (score > r.best) { r.best = score; r.at = Date.now(); }
  saveLocal(B);
  return { ...rankOf(Object.values(G), name), shared: false };
}

async function callApi(fn, args) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 7000);
  try {
    const res = await fetch(config.rankApi, { method: 'POST', body: JSON.stringify({ fn, args }), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: ctl.signal });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error);
    return j.result;
  } finally { clearTimeout(tm); }
}

/** 점수 기록 + 순위 → { list:[{name,best,total,plays}], myRank, count, shared } */
export async function submitScore(game, score, name = getPlayer() || '연습생') {
  const local = submitLocal(game, name, Math.round(score) || 0);
  if (!config.rankApi) return local;
  try {
    const r = await callApi('submitScore', [{ game, name, score: Math.round(score) || 0 }]);
    return { ...r, shared: true };
  } catch { return local; }
}

/** 기록하지 않고 순위만 보기 */
export async function getRanking(game, name = getPlayer() || '연습생') {
  const local = { ...rankOf(Object.values(loadLocal()[game] || {}), name), shared: false };
  if (!config.rankApi) return local;
  try { return { ...(await callApi('getRanking', [game, name])), shared: true }; } catch { return local; }
}

/** 🏆 명예의 전당 HTML — 1~3위는 시상대(왕관 · 금은동), 4~10위는 목록, 10위 밖이면 내 순위를 따로 */
export function rankTableHTML(game, R, me = getPlayer() || '연습생', unit = '점') {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const top = R.list.slice(0, 10);
  const P = [top[1], top[0], top[2]]; // 시상대: 2위 · 1위 · 3위
  const RK = [2, 1, 3];
  const podium = P.map((r, k) => {
    const n = RK[k];
    if (!r) return `<div class="pd p${n} empty"><div class="pd-who"><i>${['', '👑', '🥈', '🥉'][n]}</i><span>비어 있어요</span></div><div class="pd-block"><em>${n}</em></div></div>`;
    return `<div class="pd p${n} ${r.name === me ? 'me' : ''}"><div class="pd-who"><i>${['', '👑', '🥈', '🥉'][n]}</i><span>${esc(r.name)}</span><b>${r.best}<small>${unit}</small></b></div><div class="pd-block"><em>${n}</em></div></div>`;
  }).join('');
  const rest = top.slice(3).map((r, i) => `<li class="${r.name === me ? 'me' : ''}"><i>${i + 4}</i><span>${esc(r.name)}</span><b>${r.best}${unit}</b><small>누적 ${r.total} · ${r.plays}판</small></li>`).join('');
  const meRow = R.myRank > 10 ? (() => { const r = R.list.find((x) => x.name === me); return r ? `<div class="hof-me"><i>${R.myRank}</i><span>${esc(r.name)} (나)</span><b>${r.best}${unit}</b></div>` : ''; })() : '';
  return `<div class="hof">
    <div class="hof-h"><div class="hof-t">🏆 명예의 전당 🏆</div><b>${GAME_NAME[game] || game}</b><small>${R.shared ? '🌐 우리 반 전체' : '📱 이 기기'} · ${R.count}명 도전${R.myRank ? ` · 나는 <em>${R.myRank}위</em>` : ''}</small></div>
    <div class="podium">${podium}</div>
    ${rest ? `<ol class="hof-list">${rest}</ol>` : ''}${meRow}</div>`;
}
