import { describe, it, expect } from 'vitest';
import { metadataDiff } from '@/lib/diff/metadataDiff';
import type { DocMetadata } from '@/lib/parser/types';

function makeMetadata(overrides: Partial<DocMetadata> = {}): DocMetadata {
  return {
    filename: 'template.docx',
    title: 'Master Agreement',
    author: 'Legal Team',
    lastModifiedBy: 'Jane Smith',
    createdAt: '2024-01-01T00:00:00Z',
    modifiedAt: '2024-06-01T00:00:00Z',
    revision: '3',
    ...overrides,
  };
}

describe('metadataDiff', () => {
  it('returns empty array when metadata is identical', () => {
    const meta = makeMetadata();
    expect(metadataDiff(meta, meta, 'tmpl-v1')).toHaveLength(0);
  });

  it('detects a filename change', () => {
    const orig = makeMetadata({ filename: 'template.docx' });
    const changed = makeMetadata({ filename: 'msa_v1.docx' });
    const records = metadataDiff(orig, changed, 'tmpl-v1');
    expect(records).toHaveLength(1);
    expect(records[0].metadataField).toBe('filename');
    expect(records[0].summary).toBe('Filename changed: "template.docx" → "msa_v1.docx"');
    expect(records[0].type).toBe('metadata');
    expect(records[0].category).toBe('metadata');
    expect(records[0].view).toBe('tmpl-v1');
    expect(records[0].location).toBe('Document Properties');
  });

  it('detects a title change', () => {
    const orig = makeMetadata({ title: 'Master Agreement' });
    const changed = makeMetadata({ title: 'Amended MSA' });
    const records = metadataDiff(orig, changed, 'v1-v2');
    expect(records).toHaveLength(1);
    expect(records[0].metadataField).toBe('title');
    expect(records[0].summary).toContain('Amended MSA');
    expect(records[0].view).toBe('v1-v2');
  });

  it('detects an author change', () => {
    const orig = makeMetadata({ author: 'Legal Team' });
    const changed = makeMetadata({ author: 'External Counsel' });
    const records = metadataDiff(orig, changed, 'tmpl-v2');
    expect(records[0].metadataField).toBe('author');
  });

  it('detects a revision change', () => {
    const orig = makeMetadata({ revision: '3' });
    const changed = makeMetadata({ revision: '7' });
    const records = metadataDiff(orig, changed, 'tmpl-v1');
    expect(records[0].metadataField).toBe('revision');
    expect(records[0].origText).toBe('3');
    expect(records[0].changedText).toBe('7');
  });

  it('does not compare createdAt or modifiedAt', () => {
    const orig = makeMetadata({ createdAt: '2020-01-01', modifiedAt: '2020-06-01' });
    const changed = makeMetadata({ createdAt: '2024-01-01', modifiedAt: '2024-06-01' });
    expect(metadataDiff(orig, changed, 'tmpl-v1')).toHaveLength(0);
  });

  it('handles null vs null as equal', () => {
    const orig = makeMetadata({ title: null });
    const changed = makeMetadata({ title: null });
    expect(metadataDiff(orig, changed, 'tmpl-v1')).toHaveLength(0);
  });

  it('handles null vs value as a change', () => {
    const orig = makeMetadata({ title: null });
    const changed = makeMetadata({ title: 'New Title' });
    const records = metadataDiff(orig, changed, 'tmpl-v1');
    expect(records).toHaveLength(1);
    expect(records[0].origText).toBe('(none)');
    expect(records[0].changedText).toBe('New Title');
  });

  it('returns one record per differing field when all fields differ', () => {
    const orig = makeMetadata();
    const changed = makeMetadata({
      filename: 'other.docx',
      title: 'Other Title',
      author: 'Other Author',
      lastModifiedBy: 'Other Person',
      revision: '99',
    });
    const records = metadataDiff(orig, changed, 'tmpl-v2');
    expect(records).toHaveLength(5);
    const fields = records.map((r) => r.metadataField);
    expect(fields).toContain('filename');
    expect(fields).toContain('title');
    expect(fields).toContain('author');
    expect(fields).toContain('lastModifiedBy');
    expect(fields).toContain('revision');
  });
});
