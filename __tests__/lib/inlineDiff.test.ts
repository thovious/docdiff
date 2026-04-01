import { describe, it, expect } from 'vitest';
import { inlineDiff } from '@/lib/diff/inlineDiff';
import type { InlineDiffSegment } from '@/lib/diff/types';

function segTypes(segs: InlineDiffSegment[]) {
  return segs.map((s) => s.type);
}

function reconstruct(segs: InlineDiffSegment[], side: 'orig' | 'changed') {
  return segs
    .filter((s) => s.type === 'equal' || s.type === (side === 'orig' ? 'removed' : 'added'))
    .map((s) => s.value)
    .join('');
}

describe('inlineDiff', () => {
  it('no change returns single equal segment', () => {
    const segs = inlineDiff('hello world', 'hello world');
    expect(segs).toEqual([{ type: 'equal', value: 'hello world' }]);
  });

  it('both empty returns empty array', () => {
    expect(inlineDiff('', '')).toEqual([]);
  });

  it('empty orig returns single added segment', () => {
    const segs = inlineDiff('', 'new text');
    expect(segs).toEqual([{ type: 'added', value: 'new text' }]);
  });

  it('empty changed returns single removed segment', () => {
    const segs = inlineDiff('old text', '');
    expect(segs).toEqual([{ type: 'removed', value: 'old text' }]);
  });

  it('single word change', () => {
    const segs = inlineDiff('the quick fox', 'the slow fox');
    const types = segTypes(segs);
    expect(types).toContain('removed');
    expect(types).toContain('added');
    expect(types).toContain('equal');
    // Reconstructed sides should match inputs
    expect(reconstruct(segs, 'orig')).toBe('the quick fox');
    expect(reconstruct(segs, 'changed')).toBe('the slow fox');
  });

  it('multi-word change', () => {
    const segs = inlineDiff('one two three four', 'one TWO THREE four');
    expect(reconstruct(segs, 'orig')).toBe('one two three four');
    expect(reconstruct(segs, 'changed')).toBe('one TWO THREE four');
  });

  it('full replacement produces removed + added with correct reconstruction', () => {
    // Whitespace tokens may match as 'equal' — that is correct behaviour.
    // Verify that the original and changed text are faithfully reconstructable.
    const segs = inlineDiff('completely different', 'nothing alike');
    expect(segs.some((s) => s.type === 'removed')).toBe(true);
    expect(segs.some((s) => s.type === 'added')).toBe(true);
    expect(reconstruct(segs, 'orig')).toBe('completely different');
    expect(reconstruct(segs, 'changed')).toBe('nothing alike');
  });

  it('word appended at end', () => {
    const segs = inlineDiff('hello', 'hello world');
    expect(reconstruct(segs, 'orig')).toBe('hello');
    expect(reconstruct(segs, 'changed')).toBe('hello world');
    expect(segs.some((s) => s.type === 'added')).toBe(true);
  });

  it('word prepended at start', () => {
    const segs = inlineDiff('world', 'hello world');
    expect(reconstruct(segs, 'orig')).toBe('world');
    expect(reconstruct(segs, 'changed')).toBe('hello world');
  });

  it('consecutive equal segments are merged', () => {
    // If all words are equal, there should be exactly one equal segment
    const segs = inlineDiff('a b c', 'a b c');
    expect(segs.length).toBe(1);
    expect(segs[0].type).toBe('equal');
  });
});
