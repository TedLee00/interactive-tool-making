// 청크런 — 횡스크롤 러너. 미션에 맞는 "바르게 꾸민" 음식만 먹고, 장애물은 점프·슬라이드로 피한다.
import { openGame, loadImage, asset, charSprite, rand, pick, clamp, roundRect, tag } from './engine.js';
import data from '../../data/minigames.json';
import { sideSVG, tedSVG } from './runner-art.js';
import '../fx/legacy-run.css';

const iconFor = (label) => { const I = data.run.icons; const k = Object.keys(I).sort((a, b) => b.length - a.length).find((n) => label.endsWith(n)); return k ? I[k] : '🍽️'; };

const MISSION_SEC = 30; // 미션 하나 30초 × 6 + 보스 30초 ≈ 3분 30초
const BOSS_SEC = 30;

export function playRun({ charId = 'bboy' } = {}) {
  return openGame({
    id: 'run',
    title: '🏃 청크런',
    subtitle: '바르게 꾸민 음식만 먹으며 끝까지 달려라!',
    music: 'mgRun',
    howto: [
      '화면 위쪽 <b>미션</b>에 맞는 음식만 먹어요 (예: <b>달콤한 케이크</b> ⭕ / 달콤하게 케이크 ❌)',
      '<b>⬆ 점프</b> (두 번 누르면 2단 점프) · <b>⬇ 슬라이드</b>로 장애물 피하기',
      '🌮 <b>타코</b>를 먹으면 Ted 선생님으로 변신! 잠깐 무적 + 자석',
      '하트 5개 (💗 하트를 먹으면 회복) · 미션 6개 → 마지막 <b>보스</b>를 지나 초코파이 깃발에 도착하면 클리어!',
    ],
    async setup(ctx) {
      const { g } = ctx;
      const [me, ted, mukeon, yeosin, daejang, choco, cake, cookie] = await Promise.all([
        charSprite(charId), charSprite('ted'), charSprite('mukeon'), charSprite('yeosin'), charSprite('daejang'),
        loadImage(asset('snacks/choco.svg')), loadImage(asset('snacks/cake.svg')), loadImage(asset('snacks/cookie.svg')),
      ]);
      const SN = [choco, cake, cookie];
      const KIDS = [[mukeon, '…'], [yeosin, '반짝!'], [daejang, '보강 와라!']];
      const missions = data.run.missions;
      const GY = () => ctx.H * 0.74; // 땅 높이
      const S = {
        x: 0, speed: 220, y: 0, vy: 0, jumps: 0, slide: 0, hearts: 5, inv: 0, score: 0, combo: 0, best: 0,
        good: 0, bad: 0, mission: 0, phase: 'run', t: 0, taco: 0, ents: [], nextSpawn: 1.2, bossHP: 0, goalX: 0, finished: false, msgT: 0,
      };
      const PX = 86;
      const PH = 74; // 캐릭터 키

      const banner = document.createElement('div');
      banner.className = 'mg-mission';
      ctx.layer.appendChild(banner);
      // 기존 앱 쿠키런의 옆모습 달리기 캐릭터 (팔다리가 움직인다)
      const P = document.createElement('div');
      P.className = 'rg-p sv run';
      P.innerHTML = sideSVG('bboy');
      ctx.layer.appendChild(P);
      let form = 'bboy';
      const setForm = (f) => { form = f; P.className = f === 'ted' ? 'rg-p ted tr' : 'rg-p sv run'; P.innerHTML = f === 'ted' ? tedSVG() : sideSVG('bboy'); };
      function setMission(i) {
        S.mission = i;
        const m = missions[i];
        banner.innerHTML = `<small>미션 ${i + 1}/${missions.length}</small><b>${m.title}</b><em>💡 ${m.hint}</em>`;
        banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
      }
      setMission(0);

      const jump = () => {
        if (S.finished) return;
        if (S.y === 0 && S.slide <= 0) { S.vy = -560; S.jumps = 1; ctx.sfx('hop'); }
        else if (S.jumps === 1) { S.vy = -500; S.jumps = 2; ctx.sfx('hop'); ctx.burst(PX, GY() + S.y - 20, 8, ['#fff', '#8FD8FF']); }
      };
      ctx.button('⬇<small>슬라이드</small>', 'slide', { onDown: () => { if (S.y === 0) S.slide = 0.55; } });
      ctx.button('⬆<small>점프</small>', 'jump', { onDown: jump });

      function spawn() {
        const gy = GY();
        const r = Math.random();
        const m = missions[S.mission];
        if (S.phase === 'boss') return; // 보스 구간은 보스가 던진다
        if (r < 0.52) {
          const good = Math.random() < 0.58;
          const air = Math.random() < 0.4;
          { const label = pick(good ? m.good : m.bad); S.ents.push({ kind: 'food', good, label, icon: iconFor(label), x: ctx.W + 40, y: air ? gy - 120 : gy - 30, w: 50, h: 40 }); }
        } else if (r < 0.74) {
          const k = pick(KIDS);
          S.ents.push({ kind: 'kid', img: k[0], say: k[1], x: ctx.W + 40, y: gy, w: 40, h: 58 });
        } else if (r < 0.9) {
          S.ents.push({ kind: Math.random() < 0.5 ? 'cone' : 'crate', x: ctx.W + 40, y: gy, w: 30, h: 32 });
        } else if (r < 0.97) {
          S.ents.push({ kind: 'bar', x: ctx.W + 40, y: gy - 70, w: 70, h: 18 }); // 슬라이드로 통과
        } else if (S.hearts < 5 && Math.random() < 0.7) {
          S.ents.push({ kind: 'heart', x: ctx.W + 40, y: gy - 100, w: 30, h: 28 });
        } else if (!S.taco) {
          S.ents.push({ kind: 'taco', x: ctx.W + 40, y: gy - 110, w: 34, h: 26 });
        }
      }

      function hurt(msg) {
        if (S.inv > 0 || S.taco > 0) return;
        S.hearts--; S.inv = 1.3; S.combo = 0;
        ctx.shake(8); ctx.sfx('no'); ctx.floatText(msg, PX + 30, GY() - 100, '#E0453A', 18);
        if (S.hearts <= 0) { S.finished = true; ctx.end(result(false)); }
      }

      function result(cleared) {
        const coins = Math.min(30, Math.round(S.score / 300)) + (cleared ? 10 : 0);
        return {
          score: S.score, cleared, coins,
          snack: cleared && S.good >= 25 ? 'choco' : null,
          headline: cleared ? (S.bad === 0 ? '노 미스 클리어!' : '청크런 완주!') : '하트를 모두 잃었어요',
          legendAt: 3200,
          lines: [`바른 음식 <b>${S.good}</b>개 · 잘못 꾸민 음식 ${S.bad}개`, `최고 콤보 <b>${S.best}</b>`],
        };
      }

      const hit = (a, px, py, pw, ph) => px < a.x + a.w / 2 && px + pw > a.x - a.w / 2 && py < a.y && py + ph > a.y - a.h;

      return {
        update(dt) {
          if (S.finished && S.phase !== 'goal') return;
          S.t += dt;
          if (ctx.input.taps.some((p) => p.y < ctx.H * 0.72)) jump();
          if (ctx.input.keys.ArrowUp || ctx.input.keys[' ']) { if (!S.kh) jump(); S.kh = true; } else S.kh = false;
          if (ctx.input.keys.ArrowDown && S.y === 0) S.slide = 0.4;

          // 구간 진행
          const total = missions.length * MISSION_SEC;
          if (S.phase === 'run') {
            const mi = Math.min(missions.length - 1, Math.floor(S.t / MISSION_SEC));
            if (mi !== S.mission) { setMission(mi); ctx.callout('nice', `미션 ${mi + 1}`); }
            if (S.t > total) {
              S.phase = 'boss'; S.bossHP = BOSS_SEC; S.bossT = 0;
              banner.innerHTML = '<small>BOSS</small><b>오답 몬스터 등장! <span class="tg">잘못 꾸민 음식을 피해라!</span></b><em>💡 날아오는 음식은 모두 오답이에요</em>';
              banner.classList.remove('pop'); void banner.offsetWidth; banner.classList.add('pop');
              ctx.shake(10, 0.5);
            }
          } else if (S.phase === 'boss') {
            S.bossT += dt;
            if (S.bossT > BOSS_SEC) { S.phase = 'goal'; S.goalX = ctx.W + 60; }
            if (Math.random() < dt * 1.6) {
              const m = missions[Math.floor(Math.random() * missions.length)];
              { const label = pick(m.bad); S.ents.push({ kind: 'shot', good: false, label, icon: iconFor(label), x: ctx.W - 60, y: GY() - 170, vx: -rand(160, 240), vy: rand(-80, 40), w: 46, h: 38 }); }
            }
            if (Math.random() < dt * 0.5) {
              const m = missions[Math.floor(Math.random() * missions.length)];
              { const label = pick(m.good); S.ents.push({ kind: 'food', good: true, label, icon: iconFor(label), x: ctx.W + 40, y: GY() - (Math.random() < 0.5 ? 30 : 120), w: 50, h: 40 }); }
            }
          }

          // 속도·위치
          S.speed = Math.min(330, 220 + S.t * 1.4) * (S.taco > 0 ? 1.15 : 1);
          const move = S.speed * dt;
          S.x += move;
          S.vy += 1500 * dt;
          S.y = Math.min(0, S.y + S.vy * dt);
          if (S.y === 0) { S.vy = 0; S.jumps = 0; }
          S.slide = Math.max(0, S.slide - dt);
          S.inv = Math.max(0, S.inv - dt);
          if (S.taco > 0) { S.taco -= dt; if (S.taco <= 0) { setForm('bboy'); ctx.floatText('변신 끝!', PX, GY() - 120, '#6B5F8A'); } }

          S.nextSpawn -= dt;
          if (S.nextSpawn <= 0 && S.phase === 'run') { spawn(); const ease = S.t < MISSION_SEC ? 1.35 : 1; S.nextSpawn = rand(0.6, 1.1) * ease * (240 / S.speed); }

          const gy = GY();
          const ph = S.slide > 0 ? PH * 0.5 : PH;
          const px = PX - 18;
          const py = gy + S.y - ph;
          for (let k = S.ents.length - 1; k >= 0; k--) {
            const e = S.ents[k];
            if (e.kind === 'shot') { e.x += e.vx * dt - move; e.vy += 200 * dt; e.y = Math.min(gy - 20, e.y + e.vy * dt); } else e.x -= move;
            if (S.taco > 0 && (e.kind === 'food' && e.good)) { e.x += (PX - e.x) * dt * 4; e.y += (gy + S.y - 40 - e.y) * dt * 4; }
            if (e.x < -80) { S.ents.splice(k, 1); continue; }
            if (e.done || !hit(e, px, py, 36, ph)) continue;
            if (e.kind === 'food' || e.kind === 'shot') {
              e.done = true;
              if (e.good) {
                S.good++; S.combo++; S.best = Math.max(S.best, S.combo);
                const pts = 100 + Math.min(10, S.combo) * 20;
                S.score += pts;
                ctx.burst(e.x, e.y - 15, 14);
                ctx.floatText(`+${pts} ${e.label}`, e.x, e.y - 40, '#1E9B5B', 16);
                ctx.sfx('ok');
                if (S.combo % 5 === 0) ctx.callout('yar', `${S.combo} 콤보!`);
              } else {
                S.bad++;
                ctx.floatText(`✘ ${e.label}`, e.x, e.y - 40, '#E0453A', 16);
                hurt('잘못 꾸민 음식!');
              }
              S.ents.splice(k, 1);
            } else if (e.kind === 'heart') {
              S.hearts = Math.min(5, S.hearts + 1); S.ents.splice(k, 1); ctx.sfx('reveal'); ctx.floatText('💗 +1', PX, gy - 110, '#E21E8C', 20);
            } else if (e.kind === 'taco') {
              S.taco = 6; S.ents.splice(k, 1); setForm('ted'); ctx.burst(PX, gy - 60, 30, ['#FFD43B', '#E21E8C', '#fff']);
              ctx.callout('yar', 'Ted 선생님 변신!'); S.score += 200;
            } else if (e.kind === 'bar') {
              if (S.slide <= 0) { e.done = true; hurt('쿵! 슬라이드!'); }
            } else {
              e.done = true;
              hurt(e.kind === 'kid' ? `${e.say} 부딪혔다!` : '쿵!');
            }
          }

          if (S.phase === 'goal') {
            S.goalX -= move;
            if (S.goalX < PX + 10 && !S.finished) {
              S.finished = true; S.score += 500 + S.hearts * 300;
              ctx.burst(PX, gy - 60, 40); ctx.end(result(true));
            }
          }
          ctx.hud(`❤️×${Math.max(0, S.hearts)} <b>${S.score}</b>${S.combo > 1 ? ` <i>🔥${S.combo}</i>` : ''}`);
        },
        draw(gc) {
          const { W, H } = ctx;
          const gy = GY();
          const sky = gc.createLinearGradient(0, 0, 0, gy);
          sky.addColorStop(0, S.phase === 'boss' ? '#C9A2FF' : '#8FD3FF');
          sky.addColorStop(1, S.phase === 'boss' ? '#FFD0E6' : '#FFE9F3');
          gc.fillStyle = sky; gc.fillRect(0, 0, W, gy);
          // 구름 · 언덕 (시차 스크롤)
          gc.fillStyle = 'rgba(255,255,255,.9)';
          for (let k = 0; k < 5; k++) {
            const x = ((k * 160 - S.x * 0.15) % (W + 160) + W + 160) % (W + 160) - 80;
            const y = 60 + (k % 3) * 40;
            gc.beginPath(); gc.arc(x, y, 22, 0, 7); gc.arc(x + 24, y - 8, 26, 0, 7); gc.arc(x + 50, y, 20, 0, 7); gc.fill();
          }
          ['#B6E88E', '#9BDB7A'].forEach((c, layerI) => {
            gc.fillStyle = c;
            gc.beginPath(); gc.moveTo(0, gy);
            for (let x = 0; x <= W + 10; x += 10) gc.lineTo(x, gy - 50 - layerI * -20 - 30 * Math.sin((x + S.x * (0.3 + layerI * 0.2)) / (90 - layerI * 20)));
            gc.lineTo(W, gy); gc.fill();
          });
          // 나무
          for (let k = 0; k < 6; k++) {
            const x = ((k * 130 - S.x * 0.6) % (W + 130) + W + 130) % (W + 130) - 50;
            gc.fillStyle = '#B07A4F'; gc.fillRect(x - 3, gy - 46, 6, 46);
            gc.fillStyle = k % 2 ? '#FFB7D5' : '#7ED07A';
            gc.beginPath(); gc.arc(x, gy - 56, 22, 0, 7); gc.fill();
          }
          // 땅 (사탕 줄무늬)
          gc.fillStyle = '#FFE1B8'; gc.fillRect(0, gy, W, H - gy);
          gc.fillStyle = '#FFC98A';
          for (let x = -((S.x) % 40); x < W; x += 40) gc.fillRect(x, gy, 20, 10);
          gc.fillStyle = '#F2B84B'; gc.fillRect(0, gy, W, 3);

          // 결승 깃발 + 초코파이
          if (S.phase === 'goal') {
            gc.fillStyle = '#6B4F2A'; gc.fillRect(S.goalX, gy - 140, 6, 140);
            gc.fillStyle = '#FF9ECB'; gc.beginPath(); gc.moveTo(S.goalX + 6, gy - 140); gc.lineTo(S.goalX + 60, gy - 122); gc.lineTo(S.goalX + 6, gy - 104); gc.fill();
            if (choco) gc.drawImage(choco, S.goalX + 14, gy - 80, 80, 48);
            tag(gc, 'GOAL!', S.goalX + 40, gy - 160, { bg: '#FFD43B' });
          }
          // 보스
          if (S.phase === 'boss') {
            const bx = W - 70;
            const by = gy - 190 + Math.sin(S.t * 3) * 14;
            gc.fillStyle = '#7A3FA8'; gc.beginPath(); gc.ellipse(bx, by, 52, 46, 0, 0, 7); gc.fill();
            gc.fillStyle = '#9B6BE0'; gc.beginPath(); gc.ellipse(bx - 8, by - 10, 30, 22, 0, 0, 7); gc.fill();
            gc.fillStyle = '#fff'; [-16, 14].forEach((dx) => { gc.beginPath(); gc.arc(bx + dx, by - 6, 11, 0, 7); gc.fill(); });
            gc.fillStyle = '#2B2350'; [-14, 16].forEach((dx) => { gc.beginPath(); gc.arc(bx + dx - 4, by - 4, 5, 0, 7); gc.fill(); });
            gc.strokeStyle = '#2B2350'; gc.lineWidth = 4; gc.beginPath(); gc.arc(bx, by + 18, 14, 3.4, 6); gc.stroke();
            tag(gc, '오답 몬스터', bx, by - 62, { bg: '#FF8A8A', fg: '#fff', border: '#7A1F1F', size: 13 });
            const left = Math.max(0, 1 - S.bossT / BOSS_SEC);
            roundRect(gc, 20, 70, W - 40, 10, 5); gc.fillStyle = 'rgba(255,255,255,.6)'; gc.fill();
            roundRect(gc, 20, 70, (W - 40) * left, 10, 5); gc.fillStyle = '#E0453A'; gc.fill();
          }

          // 물체
          for (const e of S.ents) {
            if (e.kind === 'food' || e.kind === 'shot') {
              gc.fillStyle = 'rgba(255,255,255,.85)'; gc.beginPath(); gc.arc(e.x, e.y - e.h / 2, 22, 0, 7); gc.fill();
              gc.font = "30px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; gc.textAlign = 'center'; gc.textBaseline = 'middle';
              gc.fillText(e.icon, e.x, e.y - e.h / 2 + 2);
              tag(gc, e.label, e.x, e.y - e.h - 16, { size: 16, bg: e.kind === 'shot' ? '#FFE3E3' : '#FFFBF0', pad: 7 });
            } else if (e.kind === 'kid') {
              if (e.img) gc.drawImage(e.img, e.x - e.w / 2, e.y - e.h, e.w, e.h);
            } else if (e.kind === 'cone') {
              gc.fillStyle = '#FF8A3D'; gc.beginPath(); gc.moveTo(e.x, e.y - e.h); gc.lineTo(e.x + 14, e.y); gc.lineTo(e.x - 14, e.y); gc.fill();
              gc.fillStyle = '#fff'; gc.fillRect(e.x - 8, e.y - 16, 16, 5);
            } else if (e.kind === 'crate') {
              roundRect(gc, e.x - 15, e.y - 30, 30, 30, 5); gc.fillStyle = '#E8B47E'; gc.fill(); gc.strokeStyle = '#B07A4F'; gc.lineWidth = 3; gc.stroke();
            } else if (e.kind === 'bar') {
              gc.fillStyle = '#B07A4F'; gc.fillRect(e.x - e.w / 2, e.y - e.h, 6, gy - e.y + e.h); gc.fillRect(e.x + e.w / 2 - 6, e.y - e.h, 6, gy - e.y + e.h);
              roundRect(gc, e.x - e.w / 2, e.y - e.h, e.w, e.h, 6);
              gc.fillStyle = '#FF9ECB'; gc.fill();
              tag(gc, '⬇ 슬라이드', e.x, e.y - e.h - 12, { size: 11, bg: '#fff' });
            } else if (e.kind === 'heart') {
              const hy = e.y - 14 + Math.sin(S.t * 6) * 4;
              gc.fillStyle = '#FF6FA8'; gc.beginPath(); gc.moveTo(e.x, hy + 10);
              gc.bezierCurveTo(e.x - 18, hy - 2, e.x - 10, hy - 16, e.x, hy - 6); gc.bezierCurveTo(e.x + 10, hy - 16, e.x + 18, hy - 2, e.x, hy + 10); gc.fill();
              gc.strokeStyle = '#fff'; gc.lineWidth = 2; gc.stroke();
            } else if (e.kind === 'taco') {
              gc.fillStyle = '#F2C14E'; gc.beginPath(); gc.arc(e.x, e.y - 6, 17, Math.PI, 0); gc.fill();
              gc.fillStyle = '#7ED07A'; gc.fillRect(e.x - 14, e.y - 9, 28, 4);
              gc.fillStyle = '#E0453A'; gc.fillRect(e.x - 10, e.y - 12, 6, 3); gc.fillRect(e.x + 3, e.y - 12, 6, 3);
              tag(gc, '🌮 타코', e.x, e.y - 34, { size: 12, bg: '#FFF4D6' });
            }
          }

          // 플레이어 (DOM 캐릭터를 캔버스 좌표에 맞춘다)
          {
            const sc = ctx.scale || 1;
            const PW = form === 'ted' ? 64 : 52;
            const FOOT = form === 'ted' ? PW * 146 / 105 * (141 - 2.6) / 146 : PW * 82 / 64;
            const want = form === 'ted' ? (S.y < 0 ? 'tj' : 'tr') : (S.y < 0 ? 'jump' : 'run');
            if (!P.classList.contains(want)) { P.classList.remove('run', 'jump', 'idle', 'tr', 'tj', 'ti'); P.classList.add(want); }
            const squash = S.slide > 0 ? ' scale(1.15,0.58)' : '';
            P.style.width = `${PW * sc}px`;
            P.style.transformOrigin = '50% 100%';
            P.style.transform = `translate(${(PX - PW / 2) * sc}px,${(gy + S.y - FOOT) * sc}px)${squash}`;
            P.style.opacity = S.inv > 0 && Math.floor(S.inv * 12) % 2 ? 0.35 : 1;
            if (S.taco > 0) { gc.strokeStyle = `rgba(255,212,59,${0.5 + 0.4 * Math.sin(S.t * 20)})`; gc.lineWidth = 4; gc.beginPath(); gc.arc(PX, gy + S.y - PH / 2, PH * 0.62, 0, 7); gc.stroke(); }
          }
          gc.fillStyle = 'rgba(43,35,80,.18)'; gc.beginPath(); gc.ellipse(PX, gy + 3, 22 + S.y * 0.05, 5, 0, 0, 7); gc.fill();
        },
      };
    },
  });
}
