import type { ParsedDoc } from '../parser/types';
import type { ChangeRecord, DiffResult, ThreeWayDiffResult } from './types';
import { documentDiff } from './documentDiff';
import { metadataDiff } from './metadataDiff';

/**
 * Prefix all change IDs in a {@link DiffResult} with the view slug to guarantee
 * global uniqueness across the three-way result.
 *
 * @param result - The diff result whose change IDs will be prefixed.
 * @returns A new {@link DiffResult} with prefixed IDs.
 */
function prefixIds(result: DiffResult): DiffResult {
  const prefix = result.view;
  const changes = result.changes.map((c) => ({
    ...c,
    id: `${prefix}-${c.id}`,
  }));
  return { ...result, changes };
}

/**
 * Merge a list of metadata {@link ChangeRecord} objects into an existing
 * {@link DiffResult}, updating aggregate counts accordingly.
 *
 * @param result - The base diff result.
 * @param metaChanges - Metadata change records to merge in.
 * @returns A new {@link DiffResult} with metadata changes included.
 */
function mergeMetadata(result: DiffResult, metaChanges: ChangeRecord[]): DiffResult {
  if (metaChanges.length === 0) return result;
  return {
    ...result,
    changes: [...result.changes, ...metaChanges],
    totalChanges: result.totalChanges + metaChanges.length,
    metadataChanges: result.metadataChanges + metaChanges.length,
  };
}

/**
 * Accept three parsed documents and produce a complete {@link ThreeWayDiffResult}.
 *
 * Runs three independent comparisons:
 * - Template → V1 (`tmplV1`)
 * - V1 → V2 (`v1V2`)
 * - Template → V2 (`tmplV2`)
 *
 * Metadata differences are detected for each pair and merged into the
 * corresponding result. All change IDs are prefixed with the view slug so
 * that IDs are globally unique across the full result set.
 *
 * @param template - The parsed template document.
 * @param v1 - The parsed Version 1 document.
 * @param v2 - The parsed Version 2 document.
 * @returns A fully-populated {@link ThreeWayDiffResult}.
 */
export function threeWayDiff(
  template: ParsedDoc,
  v1: ParsedDoc,
  v2: ParsedDoc
): ThreeWayDiffResult {
  // Run paragraph-level diffs.
  const rawTmplV1 = documentDiff(template, v1, 'tmpl-v1');
  const rawV1V2 = documentDiff(v1, v2, 'v1-v2');
  const rawTmplV2 = documentDiff(template, v2, 'tmpl-v2');

  // Detect metadata differences for each comparison pair.
  const metaTmplV1 = metadataDiff(template.metadata, v1.metadata, 'tmpl-v1').map(
    (c) => ({ ...c, id: `tmpl-v1-${c.id}` })
  );
  const metaV1V2 = metadataDiff(v1.metadata, v2.metadata, 'v1-v2').map(
    (c) => ({ ...c, id: `v1-v2-${c.id}` })
  );
  const metaTmplV2 = metadataDiff(template.metadata, v2.metadata, 'tmpl-v2').map(
    (c) => ({ ...c, id: `tmpl-v2-${c.id}` })
  );

  // Prefix paragraph-level IDs, then merge metadata.
  const tmplV1 = mergeMetadata(prefixIds(rawTmplV1), metaTmplV1);
  const v1V2 = mergeMetadata(prefixIds(rawV1V2), metaV1V2);
  const tmplV2 = mergeMetadata(prefixIds(rawTmplV2), metaTmplV2);

  const allChanges: ChangeRecord[] = [
    ...tmplV1.changes,
    ...v1V2.changes,
    ...tmplV2.changes,
  ];

  return { tmplV1, v1V2, tmplV2, allChanges };
}
