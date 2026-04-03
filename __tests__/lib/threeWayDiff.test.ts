import { describe, it, expect } from 'vitest';
import { threeWayDiff } from '@/lib/diff/threeWayDiff';
import type { ParsedDoc, DocMetadata } from '@/lib/parser/types';
import type { ParagraphNode } from '@/lib/parser/types';

function makeParagraph(text: string, index: number): ParagraphNode {
  return {
    index,
    text,
    style: 'Normal',
    alignment: 'left',
    indentLeft: 0,
    indentRight: 0,
    numId: '',
    runs: [],
  };
}

function makeMetadata(filename: string): DocMetadata {
  return {
    filename,
    title: null,
    author: null,
    lastModifiedBy: null,
    createdAt: null,
    modifiedAt: null,
    revision: null,
  };
}

function makeDoc(texts: string[], filename: string): ParsedDoc {
  return {
    paragraphs: texts.map(makeParagraph),
    rawText: texts.join('\n'),
    filename,
    metadata: makeMetadata(filename),
  };
}

describe('threeWayDiff', () => {
  it('returns three DiffResults with correct view stamps', () => {
    const template = makeDoc(['Clause 1', 'Clause 2'], 'template.docx');
    const v1 = makeDoc(['Clause 1 modified', 'Clause 2'], 'v1.docx');
    const v2 = makeDoc(['Clause 1', 'Clause 2', 'Clause 3'], 'v2.docx');

    const result = threeWayDiff(template, v1, v2);

    expect(result.tmplV1.view).toBe('tmpl-v1');
    expect(result.v1V2.view).toBe('v1-v2');
    expect(result.tmplV2.view).toBe('tmpl-v2');
  });

  it('all changes in each view carry the correct view stamp', () => {
    const template = makeDoc(['A', 'B'], 'template.docx');
    const v1 = makeDoc(['A', 'C'], 'v1.docx');
    const v2 = makeDoc(['A', 'D'], 'v2.docx');

    const result = threeWayDiff(template, v1, v2);

    for (const c of result.tmplV1.changes) expect(c.view).toBe('tmpl-v1');
    for (const c of result.v1V2.changes) expect(c.view).toBe('v1-v2');
    for (const c of result.tmplV2.changes) expect(c.view).toBe('tmpl-v2');
  });

  it('allChanges is the union of all three views', () => {
    const template = makeDoc(['A', 'B'], 'template.docx');
    const v1 = makeDoc(['A', 'C'], 'v1.docx');
    const v2 = makeDoc(['D', 'B'], 'v2.docx');

    const result = threeWayDiff(template, v1, v2);

    const expected =
      result.tmplV1.changes.length +
      result.v1V2.changes.length +
      result.tmplV2.changes.length;
    expect(result.allChanges).toHaveLength(expected);
  });

  it('all change IDs in allChanges are globally unique', () => {
    const template = makeDoc(['A', 'B', 'C'], 'template.docx');
    const v1 = makeDoc(['A', 'X', 'C'], 'v1.docx');
    const v2 = makeDoc(['A', 'B', 'Y'], 'v2.docx');

    const result = threeWayDiff(template, v1, v2);

    const ids = result.allChanges.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('change IDs are prefixed with the view slug', () => {
    const template = makeDoc(['A'], 'template.docx');
    const v1 = makeDoc(['B'], 'v1.docx');
    const v2 = makeDoc(['C'], 'v2.docx');

    const result = threeWayDiff(template, v1, v2);

    for (const c of result.tmplV1.changes) {
      expect(c.id.startsWith('tmpl-v1-')).toBe(true);
    }
    for (const c of result.v1V2.changes) {
      expect(c.id.startsWith('v1-v2-')).toBe(true);
    }
    for (const c of result.tmplV2.changes) {
      expect(c.id.startsWith('tmpl-v2-')).toBe(true);
    }
  });

  it('returns zero changes when all three documents are identical', () => {
    const doc = makeDoc(['Same paragraph', 'Another one'], 'doc.docx');
    const result = threeWayDiff(doc, doc, doc);

    expect(result.tmplV1.totalChanges).toBe(0);
    expect(result.v1V2.totalChanges).toBe(0);
    expect(result.tmplV2.totalChanges).toBe(0);
    expect(result.allChanges).toHaveLength(0);
  });

  it('surfaces metadata changes when filenames differ', () => {
    const template = makeDoc(['A'], 'template.docx');
    const v1 = makeDoc(['A'], 'version1.docx');
    const v2 = makeDoc(['A'], 'version2.docx');

    const result = threeWayDiff(template, v1, v2);

    const tmplV1Meta = result.tmplV1.changes.filter((c) => c.type === 'metadata');
    expect(tmplV1Meta.length).toBeGreaterThan(0);
    expect(result.tmplV1.metadataChanges).toBeGreaterThan(0);
  });
});
