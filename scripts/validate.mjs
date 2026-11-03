// 문제 은행 검사: node scripts/validate.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBank } from '../src/quiz/validate.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'questions');
const bank = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const type = Number(f.replace('.json', ''));
  bank[type] = JSON.parse(readFileSync(join(dir, f), 'utf8'));
}
const report = validateBank(bank);
const total = Object.values(bank).reduce((s, l) => s + l.length, 0);
for (const [t, l] of Object.entries(bank)) console.log(`유형 ${String(t).padStart(2)}: ${l.length}문제`);
console.log(`합계 ${total}문제`);
if (report.length) {
  report.forEach((r) => console.error(`✘ ${r.id}: ${r.errs.join(' / ')}`));
  process.exit(1);
}
console.log('✔ 검사 통과');
