import { describe, it, expect } from 'vitest';
import { documentDiff } from '@/lib/diff/documentDiff';
import type { ParsedDoc, ParagraphNode, RunFormat } from '@/lib/parser/types';

const baseRun: RunFormat = {
  bold: false, italic: false, underline: false, strikethrough: false,
  fontSize: null, color: null, fontFamily: null,
};

function makePara(
  index: number,
  text: string,
  overrides: Partial<ParagraphNode> = {}
): ParagraphNode {
  return {
    index,
    text,
    style: 'Normal',
    alignment: 'left',
    indentLeft: 0,
    indentRight: 0,
    numId: '',
    runs: [{ ...baseRun }],
    ...overrides,
  };
}

function makeDoc(texts: string[], overridesList: Partial<ParagraphNode>[] = []): ParsedDoc {
  return {
    paragraphs: texts.map((t, i) => makePara(i, t, overridesList[i] ?? {})),
    rawText: texts.join('\n'),
    filename: 'test.docx',
  };
}

describe('documentDiff', () => {
  it('returns zero changes for identical documents', () => {
    const doc = makeDoc(['Hello', 'World']);
    const result = documentDiff(doc, doc);
    expect(result.totalChanges).toBe(0);
    expect(result.changes).toHaveLength(0);
  });

  it('detects an added paragraph', () => {
    const orig = makeDoc(['Hello']);
    const changed = makeDoc(['Hello', 'New paragraph']);
    const result = documentDiff(orig, changed);
    const added = result.changes.filter((c) => c.type === 'added');
    expect(added).toHaveLength(1);
    expect(added[0].changedText).toBe('New paragraph');
    expect(result.addedCount).toBe(1);
    expect(result.contentChanges).toBe(1);
  });

  it('detects a removed paragraph', () => {
    const orig = makeDoc(['Hello', 'Goodbye']);
    const changed = makeDoc(['Hello']);
    const result = documentDiff(orig, changed);
    const removed = result.changes.filter((c) => c.type === 'removed');
    expect(removed).toHaveLength(1);
    expect(removed[0].origText).toBe('Goodbye');
    expect(result.removedCount).toBe(1);
  });

  it('detects a modified paragraph and populates inlineDiff', () => {
    const orig = makeDoc(['The quick brown fox']);
    const changed = makeDoc(['The slow brown fox']);
    const result = documentDiff(orig, changed);
    const modified = result.changes.filter((c) => c.type === 'modified');
    expect(modified).toHaveLength(1);
    expect(modified[0].inlineDiff.length).toBeGreaterThan(0);
    expect(modified[0].origText).toBe('The quick brown fox');
    expect(modified[0].changedText).toBe('The slow brown fox');
    expect(result.modifiedCount).toBe(1);
  });

  it('detects a format-only change', () => {
    const orig = makeDoc(['Same text'], [{ style: 'Normal' }]);
    const changed = makeDoc(['Same text'], [{ style: 'Heading1' }]);
    const result = documentDiff(orig, changed);
    const format = result.changes.filter((c) => c.type === 'format');
    expect(format).toHaveLength(1);
    expect(format[0].formatDetails.length).toBeGreaterThan(0);
    expect(result.formattingChanges).toBe(1);
  });

  it('handles both documents empty', () => {
    const doc = makeDoc([]);
    const result = documentDiff(doc, doc);
    expect(result.totalChanges).toBe(0);
  });

  it('handles original empty (all paragraphs added)', () => {
    const orig = makeDoc([]);
    const changed = makeDoc(['A', 'B', 'C']);
    const result = documentDiff(orig, changed);
    expect(result.addedCount).toBe(3);
    expect(result.totalChanges).toBe(3);
  });

  it('handles changed empty (all paragraphs removed)', () => {
    const orig = makeDoc(['A', 'B', 'C']);
    const changed = makeDoc([]);
    const result = documentDiff(orig, changed);
    expect(result.removedCount).toBe(3);
  });

  it('change IDs are deterministic and unique', () => {
    const orig = makeDoc(['A', 'B', 'C']);
    const changed = makeDoc(['A', 'X', 'C']);
    const result = documentDiff(orig, changed);
    const ids = result.changes.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('counts are consistent with changes array', () => {
    const orig = makeDoc(['A', 'B', 'C']);
    const changed = makeDoc(['A', 'B modified', 'D', 'E']);
    const result = documentDiff(orig, changed);
    expect(result.totalChanges).toBe(result.changes.length);
    expect(result.contentChanges + result.formattingChanges).toBe(result.totalChanges);
    expect(result.addedCount + result.removedCount + result.modifiedCount + result.formattingChanges)
      .toBe(result.totalChanges);
  });

  it('modified record has location from origIndex', () => {
    const orig = makeDoc(['para one', 'para two']);
    const changed = makeDoc(['para one', 'para two CHANGED']);
    const result = documentDiff(orig, changed);
    const mod = result.changes.find((c) => c.type === 'modified');
    expect(mod?.location).toBe('Paragraph 2');
  });
});
