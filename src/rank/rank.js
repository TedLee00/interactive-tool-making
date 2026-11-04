// 순위표 — 게임이 끝날 때마다 점수를 기록하고 순위를 보여 준다.
//  · data/config.json 의 rankApi(구글 Apps Script 웹 앱 주소)가 있으면 → 반 전체가 함께 쓰는 순위표 (모든 기기)
//  · 없거나 연결이 안 되면 → 이 기기에 저장된 순위표
// 순위 기준: 학생(이름)마다 그 게임의 최고 점수. 누적 점수(모든 판 합계)와 판 수도 함께 기록한다.
import config from '../../data/config.json';
import './rank.css';

const KEY = 'cq.board.v1';
const GAME_NAME = { crane: '🧸 청크 크레인', shoot: '🎯 청크 사격장', run: '🏃 청크런', kart: '🏎️ 청크 카트', board: '🏰 품사 원정대 (코인)' };
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

const MEDAL = ['🥇', '🥈', '🥉'];
/** 순위표 HTML */
export function rankTableHTML(game, R, me = getPlayer() || '연습생', unit = '점') {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<div class="rk">
    <div class="rk-h"><b>${GAME_NAME[game] || game} 순위</b><small>${R.shared ? '🌐 우리 반 전체' : '📱 이 기기'} · ${R.count}명 · 나는 <em>${R.myRank}위</em></small></div>
    <ol>${R.list.map((r, i) => `<li class="${r.name === me ? 'me' : ''} ${i < 3 ? `top t${i + 1}` : ''}"><i>${MEDAL[i] || i + 1}</i><span>${esc(r.name)}</span><b>${r.best}${unit}</b><small>누적 ${r.total} · ${r.plays}판</small></li>`).join('')}</ol></div>`;
}
