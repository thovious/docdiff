/**
 * Myers LCS (Longest Common Subsequence) implementation.
 * Pure functions — no side effects, no I/O, no global state.
 */

export type EditOp =
  | { op: 'equal'; aIdx: number; bIdx: number }
  | { op: 'added'; bIdx: number }
  | { op: 'removed'; aIdx: number };

/**
 * Build an (m+1) × (n+1) DP matrix where matrix[i][j] is the length of the
 * LCS of a[0..i-1] and b[0..j-1].
 *
 * @param a - The original sequence.
 * @param b - The changed sequence.
 * @returns A 2D number array (DP table).
 */
export function buildLCSMatrix(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const matrix: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  return matrix;
}

/**
 * Backtrack through the LCS DP matrix to produce a sequence of edit operations
 * mapping `a` onto `b`.
 *
 * @param matrix - DP table produced by {@link buildLCSMatrix}.
 * @param a - The original sequence.
 * @param b - The changed sequence.
 * @returns An ordered array of {@link EditOp} describing the edits.
 */
export function backtrack(
  matrix: number[][],
  a: string[],
  b: string[]
): EditOp[] {
  const ops: EditOp[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ op: 'equal', aIdx: i - 1, bIdx: j - 1 });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || matrix[i][j - 1] >= matrix[i - 1][j])) {
      ops.push({ op: 'added', bIdx: j - 1 });
      j--;
    } else {
      ops.push({ op: 'removed', aIdx: i - 1 });
      i--;
    }
  }

  return ops.reverse();
}
