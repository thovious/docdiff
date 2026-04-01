import { describe, it, expect } from 'vitest';
import { formatDiff } from '@/lib/diff/formatDiff';
import type { ParagraphNode, RunFormat } from '@/lib/parser/types';

const baseRun: RunFormat = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  fontSize: null,
  color: null,
  fontFamily: null,
};

function makePara(overrides: Partial<ParagraphNode> = {}): ParagraphNode {
  return {
    index: 0,
    text: 'Same text',
    style: 'Normal',
    alignment: 'left',
    indentLeft: 0,
    indentRight: 0,
    numId: '',
    runs: [{ ...baseRun }],
    ...overrides,
  };
}

describe('formatDiff', () => {
  it('returns empty array when nothing changed', () => {
    expect(formatDiff(makePara(), makePara())).toEqual([]);
  });

  it('detects style change', () => {
    const result = formatDiff(makePara(), makePara({ style: 'Heading1' }));
    expect(result).toContain("Style: 'Normal' → 'Heading1'");
  });

  it('detects alignment change', () => {
    const result = formatDiff(makePara(), makePara({ alignment: 'center' }));
    expect(result).toContain("Alignment: 'left' → 'center'");
  });

  it('detects left indent change', () => {
    const result = formatDiff(makePara(), makePara({ indentLeft: 720 }));
    expect(result).toContain('Left indent: 0 → 720');
  });

  it('detects right indent change', () => {
    const result = formatDiff(makePara(), makePara({ indentRight: 360 }));
    expect(result).toContain('Right indent: 0 → 360');
  });

  it('detects list ID change', () => {
    const result = formatDiff(makePara(), makePara({ numId: '1' }));
    expect(result).toContain("List ID: '' → '1'");
  });

  it('detects bold added to a run', () => {
    const result = formatDiff(
      makePara({ runs: [{ ...baseRun }] }),
      makePara({ runs: [{ ...baseRun, bold: true }] })
    );
    expect(result).toContain('Bold added in run 1');
  });

  it('detects bold removed from a run', () => {
    const result = formatDiff(
      makePara({ runs: [{ ...baseRun, bold: true }] }),
      makePara({ runs: [{ ...baseRun }] })
    );
    expect(result).toContain('Bold removed in run 1');
  });

  it('detects italic added to a run', () => {
    const result = formatDiff(
      makePara({ runs: [{ ...baseRun }] }),
      makePara({ runs: [{ ...baseRun, italic: true }] })
    );
    expect(result).toContain('Italic added in run 1');
  });

  it('detects font size change', () => {
    const result = formatDiff(
      makePara({ runs: [{ ...baseRun, fontSize: '24' }] }),
      makePara({ runs: [{ ...baseRun, fontSize: '28' }] })
    );
    expect(result).toContain('Font size changed in run 1: 24 → 28');
  });

  it('detects color change', () => {
    const result = formatDiff(
      makePara({ runs: [{ ...baseRun, color: 'FF0000' }] }),
      makePara({ runs: [{ ...baseRun, color: '0000FF' }] })
    );
    expect(result).toContain('Color changed in run 1: FF0000 → 0000FF');
  });

  it('detects font family change', () => {
    const result = formatDiff(
      makePara({ runs: [{ ...baseRun, fontFamily: 'Arial' }] }),
      makePara({ runs: [{ ...baseRun, fontFamily: 'Times New Roman' }] })
    );
    expect(result).toContain('Font family changed in run 1: Arial → Times New Roman');
  });

  it('detects multiple simultaneous changes', () => {
    const result = formatDiff(
      makePara({ style: 'Normal', alignment: 'left' }),
      makePara({ style: 'Heading2', alignment: 'center' })
    );
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.some((d) => d.includes('Style'))).toBe(true);
    expect(result.some((d) => d.includes('Alignment'))).toBe(true);
  });

  it('no change when all run properties are identical', () => {
    const run: RunFormat = { ...baseRun, bold: true, fontSize: '24', color: 'FF0000' };
    expect(formatDiff(makePara({ runs: [run] }), makePara({ runs: [{ ...run }] }))).toEqual([]);
  });
});
