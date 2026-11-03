import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalize, matchesAny } from '../src/quiz/normalize.js';
import { parseChunks, chunksToTokens } from '../src/quiz/notation.js';
import {
  gradeSplit, gradeRepair, buildRepair, gradePuzzle, gradeTowerOrder, gradeTowerTyping, cellReward,
} from '../src/quiz/grade.js';
import { validateBank } from '../src/quiz/validate.js';

const dir = join(__dirname, '..', 'data', 'questions');
const BANK = {};
for (const f of readdirSync(dir)) BANK[Number(f.replace('.json', ''))] = JSON.parse(readFileSync(join(dir, f), 'utf8'));
const config = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'config.json'), 'utf8'));

describe('normalize', () => {
  it('ignores case, punctuation and contractions', () => {
    expect(normalize("I'm  Hungry.")).toBe('i am hungry');
    expect(normalize("don't")).toBe(normalize('do not'));
    expect(normalize('can’t')).toBe('can not');
    expect(matchesAny('At Seven', ['at 7', 'at seven'])).toBe(true);
    expect(matchesAny('', ['x'])).toBe(false);
  });
});

describe('split grading (8·9)', () => {
  const q = { type: 9, en: 'N:My little brother | V:plays | N:mobile games | D:after dinner | D:every day', end: '.' };
  const { cuts, labels } = chunksToTokens(parseChunks(q.en));
  it('accepts the canonical answer', () => {
    expect(gradeSplit(q, cuts, labels).ok).toBe(true);
  });
  it('accepts merging adjacent adverb chunks', () => {
    const c2 = cuts.filter((g) => g !== cuts[cuts.length - 1]);
    expect(gradeSplit(q, c2, ['N', 'V', 'N', 'D']).ok).toBe(true);
  });
  it('rejects splitting a noun phrase (rule ①)', () => {
    const r = gradeSplit(q, [...cuts, 1], ['N', 'N', 'V', 'N', 'D', 'D']);
    expect(r.ok).toBe(false);
  });
  it('rejects a wrong label and marks that chunk', () => {
    const r = gradeSplit(q, cuts, ['N', 'V', 'D', 'D', 'D']);
    expect(r.ok).toBe(false);
    expect(r.chunkOk).toEqual([true, true, false, true, true]);
  });
});

describe('repair / puzzle / tower', () => {
  it('repair builds a split error and grades the merge', () => {
    const q = { type: 10, en: 'N:The new student | V:sits | D:next to me', error: { kind: 'split', chunk: 0, after: 2, shown: ['A', 'N'] } };
    const r = buildRepair(q);
    expect(r.shown.map((c) => c.text)).toEqual(['The new', 'student', 'sits', 'next to me']);
    expect(gradeRepair(q, 1, 'N').ok).toBe(true);
    expect(gradeRepair(q, 2, 'N').ok).toBe(false);
    expect(gradeRepair(q, 0, 'A').ok).toBe(false);
  });
  it('puzzle honours alts', () => {
    const q = { en: 'N:I | V:watched | N:TV | D:after school', alts: [[3, 0, 1, 2]] };
    expect(gradePuzzle(q, [0, 1, 2, 3])).toBe(true);
    expect(gradePuzzle(q, [3, 0, 1, 2])).toBe(true);
    expect(gradePuzzle(q, [1, 0, 2, 3])).toBe(false);
  });
  it('tower order + typing', () => {
    const q = { ko: 'N:나는=I | D:매일=every day | V:먹는다=eat/have', order: [0, 2, 1] };
    expect(gradeTowerOrder(q, [0, 2, 1])).toBe(true);
    expect(gradeTowerOrder(q, [0, 1, 2])).toBe(false);
    expect(gradeTowerTyping(q, { 0: 'i', 1: 'Every day.', 2: 'have' }).ok).toBe(true);
    expect(gradeTowerTyping(q, { 0: 'I', 1: 'everyday', 2: 'eat' }).each).toEqual([true, false, true]);
  });
});

describe('cell reward rule (기획서 2번)', () => {
  it('5/5 → 2칸 + bonus, 4/5 → 1칸, ≤3 → 정답 수만큼 코인', () => {
    expect(cellReward(5, 5, config)).toMatchObject({ move: 2, perfect: true });
    expect(cellReward(4, 5, config)).toMatchObject({ move: 1, perfect: false });
    expect(cellReward(3, 5, config)).toMatchObject({ move: 0, coins: 3 });
    expect(cellReward(0, 5, config)).toMatchObject({ move: 0, coins: 0 });
  });
});

describe('question bank', () => {
  it('passes validation with ≥40 per type', () => {
    expect(validateBank(BANK)).toEqual([]);
    for (let t = 1; t <= 12; t++) expect(BANK[t].length).toBeGreaterThanOrEqual(40);
  });
  it('every chunk question accepts its own answer', () => {
    for (const q of [...BANK[8], ...BANK[9]]) {
      const { cuts, labels } = chunksToTokens(parseChunks(q.ko ?? q.en));
      expect(gradeSplit(q, cuts, labels).ok, q.id).toBe(true);
    }
    for (const q of BANK[10]) {
      const r = buildRepair(q);
      expect(gradeRepair(q, r.wrongIdx[0], r.answerPos).ok, q.id).toBe(true);
    }
    for (const q of BANK[11]) expect(gradePuzzle(q, parseChunks(q.en).map((_, i) => i)), q.id).toBe(true);
    for (const q of BANK[12]) {
      const ko = parseChunks(q.ko);
      expect(gradeTowerOrder(q, q.order), q.id).toBe(true);
      const inputs = Object.fromEntries(ko.map((c, i) => [i, c.answers[0]]));
      expect(gradeTowerTyping(q, inputs).ok, q.id).toBe(true);
    }
  });
  it('chunk questions keep rule ①: no bare article/possessive A chunk before a noun', () => {
    const det = /^(a|an|the|my|our|your|his|her|their|this|that)$/i;
    for (const q of [...BANK[9], ...BANK[11]]) {
      parseChunks(q.en).forEach((c, i, arr) => {
        if (c.pos === 'A' && det.test(c.text) && arr[i + 1]?.pos === 'N') throw new Error(`${q.id}: ${c.text}`);
      });
    }
  });
});

import { nearMatch } from '../src/quiz/normalize.js';
describe('lenient answers', () => {
  it('nearMatch accepts a dropped modifier word', () => {
    expect(nearMatch('my brother', ['my little brother'])).toBeTruthy();
    expect(nearMatch('your sister', ['my little brother'])).toBeFalsy();
  });
  it('tower order: trailing adverb chunks may swap / move to front', () => {
    const q = { ko: 'N:그는=He | D:공원에서=in the park | D:어제=yesterday | V:달렸다=ran', order: [0, 3, 1, 2] };
    expect(gradeTowerOrder(q, [0, 3, 2, 1])).toBe(true);
    expect(gradeTowerOrder(q, [2, 0, 3, 1])).toBe(true);
    expect(gradeTowerOrder(q, [0, 1, 3, 2])).toBe(false);
  });
});
