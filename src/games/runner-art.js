// 기존 앱 쿠키런의 옆모습 달리기 캐릭터 (legacy/index.html sideSVG 그대로)
/* eslint-disable */
import { tedSVG } from '../fx/legacy.js';
export function sideSVG(kind) {
  const O = 'stroke="#1B2F4E" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
  const g = (cls, ox, oy, inner) => `<g class="${cls}" style="transform-origin:${ox}px ${oy}px">${inner}</g>`;
  const limb = (x1, y1, x2, y2, col, w) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1B2F4E" stroke-width="${w + 3}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  if (kind === 'ted') {
    const HX = 31, HY = 58;   // hip under the skirt
    const leg = (c, d) => g('svLeg' + c, HX, HY, limb(HX, HY, HX, HY + 9, '#2A2A30', 4) + g('svShin' + c, HX, HY + 9, limb(HX, HY + 9, HX, HY + 19, '#2A2A30', 4) + `<ellipse cx="${HX + 3}" cy="${HY + 21}" rx="5" ry="2.6" fill="#0E0E12"/>`));
    const arm = (c, col, extra) => g('svArm' + c, 31, 36, limb(31, 36, 31, 45, col, 5) + g('svFore' + c, 31, 45, limb(31, 45, 31, 53, col, 4.5) + `<circle cx="31" cy="55" r="3" fill="#FFE0C2" ${O}/>` + extra));
    return `<svg viewBox="0 0 64 84"><g class="svBody" style="transform-origin:32px 80px">${leg('B')}${arm('B', '#EDEAE6', `<rect x="25" y="53" width="12" height="9" rx="1.5" fill="#8E2222" ${O}/>`)}
      <path d="M19 61 Q22 51 31 50 Q40 51 43 61 Z" fill="#FFD3DF" ${O}/>
      <rect x="23" y="33" width="17" height="20" rx="5" fill="#fff" ${O}/><path d="M28 34 L33 39 L37 34" fill="none" stroke="#CFC9C2" stroke-width="1.6"/>
      ${leg('F')}
      <circle cx="33" cy="20" r="14" fill="#FFE0C2" ${O}/>
      <path d="M19 19 Q17 9 24 5 L24 1 L28 4 L30 0 L33 4 L36 0 L38 4 L42 2 L42 7 Q47 10 46 15 Q40 11 32 12 Q26 13 24 21 Z" fill="#2B2724"/>
      <circle cx="26" cy="21" r="3" fill="#F7CFAE" ${O}/>
      <rect x="37" y="15" width="9" height="7" rx="1.5" fill="none" stroke="#111012" stroke-width="2.2"/><path d="M37 17 L31 16" stroke="#111012" stroke-width="1.8"/>
      <rect x="41" y="18" width="2" height="2.6" fill="#2A1E1C"/>
      <path d="M31 24 Q40 22 47 24 Q47 31 40 33 Q34 33 31 30 Z" fill="#fff" ${O}/>
      ${arm('F', '#fff', '')}</g></svg>`;
  }
  const HX = 30, HY = 50;
  const leg = (c, col) => g('svLeg' + c, HX, HY, limb(HX, HY, HX, HY + 14, col, 7) + g('svShin' + c, HX, HY + 14, limb(HX, HY + 14, HX, HY + 27, col, 6) + `<ellipse cx="${HX + 3}" cy="${HY + 29}" rx="6.5" ry="3.4" fill="#fff" ${O}/>`));
  const arm = (c, sk) => g('svArm' + c, 30, 33, limb(30, 33, 30, 42, '#28A064', 6) + g('svFore' + c, 30, 42, limb(30, 42, 30, 51, sk, 5) + `<circle cx="30" cy="53" r="3.4" fill="${sk}" ${O}/>`));
  return `<svg viewBox="0 0 64 84"><g class="svBody" style="transform-origin:32px 80px">${leg('B', '#16253F')}${arm('B', '#4A2E1E')}
    <rect x="21" y="29" width="18" height="24" rx="6" fill="#28A064" ${O}/><path d="M28 30 Q33 40 38 31" stroke="#F2C14E" stroke-width="2.4" fill="none"/>
    ${leg('F', '#1B2F4E')}
    <circle cx="32" cy="18" r="12" fill="#5A3824" ${O}/>
    <path d="M20 15 Q22 4 33 4 Q43 5 44 14 Z" fill="#E0453A" ${O}/><rect x="10" y="12" width="12" height="4" rx="2" fill="#1B2F4E"/>
    <circle cx="29" cy="19" r="3" fill="#4A2E1E" ${O}/>
    <circle cx="38" cy="17" r="1.8" fill="#111"/><path d="M37 23 Q40 25 43 22" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${arm('F', '#5A3824')}</g></svg>`;
}
export { tedSVG };
