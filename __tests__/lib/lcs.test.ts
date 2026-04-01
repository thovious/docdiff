import { describe, it, expect } from 'vitest';
import { buildLCSMatrix, backtrack } from '@/lib/diff/lcs';

function lcs(a: string[], b: string[]) {
  return backtrack(buildLCSMatrix(a, b), a, b);
}

describe('buildLCSMatrix', () => {
  it('returns a (m+1)×(n+1) matrix', () => {
    const m = buildLCSMatrix(['a', 'b'], ['a', 'c']);
    expect(m.length).toBe(3);
    expect(m[0].length).toBe(3);
  });

  it('identical arrays have LCS length equal to array length', () => {
    const a = ['x', 'y', 'z'];
    const m = buildLCSMatrix(a, a);
    expect(m[3][3]).toBe(3);
  });

  it('fully different arrays have LCS length 0', () => {
    const m = buildLCSMatrix(['a', 'b'], ['c', 'd']);
    expect(m[2][2]).toBe(0);
  });

  it('one empty array yields all zeros', () => {
    const m = buildLCSMatrix([], ['a', 'b', 'c']);
    expect(m[0].every((v) => v === 0)).toBe(true);
  });
});

describe('backtrack', () => {
  it('identical arrays produce only equal ops', () => {
    const a = ['hello', 'world'];
    const ops = lcs(a, a);
    expect(ops.every((o) => o.op === 'equal')).toBe(true);
    expect(ops.length).toBe(2);
  });

  it('fully different arrays produce removed then added ops', () => {
    const ops = lcs(['a', 'b'], ['c', 'd']);
    const removed = ops.filter((o) => o.op === 'removed');
    const added = ops.filter((o) => o.op === 'added');
    expect(removed.length).toBe(2);
    expect(added.length).toBe(2);
  });

  it('one empty original produces all added ops', () => {
    const ops = lcs([], ['a', 'b', 'c']);
    expect(ops.every((o) => o.op === 'added')).toBe(true);
    expect(ops.length).toBe(3);
  });

  it('one empty changed produces all removed ops', () => {
    const ops = lcs(['a', 'b', 'c'], []);
    expect(ops.every((o) => o.op === 'removed')).toBe(true);
    expect(ops.length).toBe(3);
  });

  it('single identical element', () => {
    const ops = lcs(['only'], ['only']);
    expect(ops).toEqual([{ op: 'equal', aIdx: 0, bIdx: 0 }]);
  });

  it('single different element', () => {
    const ops = lcs(['old'], ['new']);
    expect(ops.some((o) => o.op === 'removed')).toBe(true);
    expect(ops.some((o) => o.op === 'added')).toBe(true);
  });

  it('partial overlap preserves common subsequence', () => {
    // a=[A,B,C,D], b=[A,C,D,E] → common: A,C,D
    const ops = lcs(['A', 'B', 'C', 'D'], ['A', 'C', 'D', 'E']);
    const equal = ops.filter((o) => o.op === 'equal');
    expect(equal.length).toBe(3);
    const removed = ops.filter((o) => o.op === 'removed');
    expect(removed.length).toBe(1); // B
    const added = ops.filter((o) => o.op === 'added');
    expect(added.length).toBe(1); // E
  });

  it('ops are in document order', () => {
    const ops = lcs(['A', 'B', 'C'], ['A', 'X', 'C']);
    // Should be: equal(A), removed(B)/added(X), equal(C)
    expect(ops[0].op).toBe('equal');
    expect(ops[ops.length - 1].op).toBe('equal');
  });
});
