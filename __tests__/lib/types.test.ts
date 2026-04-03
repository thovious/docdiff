import { describe, it, expect } from 'vitest';
import type { ParagraphNode, ParsedDoc } from '@/lib/parser/types';
import type { ChangeRecord, DiffResult, InsightSummary } from '@/lib/diff/types';

describe('Type definitions', () => {
  it('ParagraphNode shape is correct', () => {
    const node: ParagraphNode = {
      index: 0,
      text: 'Hello world',
      style: 'Normal',
      alignment: 'left',
      indentLeft: 0,
      indentRight: 0,
      numId: '',
      runs: [{ bold: false, italic: false, underline: false, strikethrough: false, fontSize: null, color: null, fontFamily: null }],
    };
    expect(node.text).toBe('Hello world');
  });

  it('ParsedDoc shape is correct', () => {
    const doc: ParsedDoc = {
      paragraphs: [],
      rawText: '',
      filename: 'test.docx',
      metadata: { filename: 'test.docx', title: null, author: null, lastModifiedBy: null, createdAt: null, modifiedAt: null, revision: null },
    };
    expect(doc.filename).toBe('test.docx');
  });

  it('DiffResult defaults to zero counts', () => {
    const result: DiffResult = {
      view: 'tmpl-v1',
      changes: [],
      totalChanges: 0,
      contentChanges: 0,
      formattingChanges: 0,
      metadataChanges: 0,
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
    };
    expect(result.totalChanges).toBe(0);
  });

  it('InsightSummary shape is correct', () => {
    const insight: InsightSummary = { summary: 'Two sections were updated.', confidence: 'high' };
    expect(insight.confidence).toBe('high');
  });
});
