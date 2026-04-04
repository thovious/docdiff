'use client';

import { useState, useCallback, useRef } from 'react';
import type { ThreeWayDiffResult, ComparisonView } from '@/lib/diff/types';
import type { AnalysisResult, SignificanceTier } from '@/lib/agent/types';
import { ComparisonTabs } from './ComparisonTabs';
import { MetricsDashboard } from './MetricsDashboard';
import { ChangeList } from './ChangeList/ChangeList';
import { ExportButton } from './ExportButton';

interface AnalysisViewProps {
  diffResult: ThreeWayDiffResult;
  analysisResult: AnalysisResult;
  documentNames: { template: string; v1: string; v2: string };
  onReset: () => void;
}

type ActiveFilter = 'all' | 'content' | 'formatting' | 'metadata';

const MATERIAL_TIERS: SignificanceTier[] = ['critical', 'moderate'];

interface AccordionSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ title, open, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Main results container: metrics, tabs, executive summary accordion,
 * critical changes accordion, and all changes accordion.
 *
 * @param diffResult - The three-way diff result.
 * @param analysisResult - The agent analysis result.
 * @param onReset - Callback to return to the upload panel.
 */
export function AnalysisView({ diffResult, analysisResult, documentNames, onReset }: AnalysisViewProps) {
  const [activeView, setActiveView] = useState<ComparisonView>('v1-v2');
  const [execOpen, setExecOpen] = useState(true);
  const [criticalOpen, setCriticalOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const allChangesSectionRef = useRef<HTMLDivElement>(null);

  const activeResult =
    activeView === 'tmpl-v1'
      ? diffResult.tmplV1
      : activeView === 'v1-v2'
      ? diffResult.v1V2
      : diffResult.tmplV2;

  const annotationMap = new Map(analysisResult.annotations.map((a) => [a.changeId, a]));

  const criticalChanges = activeResult.changes.filter((c) => {
    const tier = annotationMap.get(c.id)?.significance ?? 'informational';
    return MATERIAL_TIERS.includes(tier as SignificanceTier);
  });

  const filteredAll =
    activeFilter === 'all'
      ? activeResult.changes
      : activeResult.changes.filter((c) => c.category === activeFilter);

  const handleCardClick = useCallback((filter: ActiveFilter) => {
    setActiveFilter(filter);
    setAllOpen(true);
    setTimeout(() => {
      allChangesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, []);

  const filterLabel =
    activeFilter === 'all' ? '' :
    activeFilter === 'content' ? ' · Content' :
    activeFilter === 'formatting' ? ' · Formatting' : ' · Metadata';

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
        <div className="flex items-center gap-2">
          <ExportButton
            diffResult={diffResult}
            analysisResult={analysisResult}
            documentNames={documentNames}
          />
          <button
            onClick={onReset}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* Metric cards — clickable */}
      <MetricsDashboard result={activeResult} onCardClick={handleCardClick} />

      {/* Comparison tabs */}
      <ComparisonTabs
        diffResult={diffResult}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Executive Summary */}
      <AccordionSection
        title="Executive Summary"
        open={execOpen}
        onToggle={() => setExecOpen((v) => !v)}
      >
        <p className="text-sm text-gray-700 leading-relaxed">{analysisResult.executiveSummary}</p>
      </AccordionSection>

      {/* Critical Changes */}
      <AccordionSection
        title={`Critical Changes (${criticalChanges.length})`}
        open={criticalOpen}
        onToggle={() => setCriticalOpen((v) => !v)}
      >
        <ChangeList
          changes={criticalChanges}
          annotations={analysisResult.annotations}
        />
      </AccordionSection>

      {/* All Changes */}
      <div ref={allChangesSectionRef}>
        <AccordionSection
          title={`All Changes (${filteredAll.length}${filterLabel})`}
          open={allOpen}
          onToggle={() => setAllOpen((v) => !v)}
        >
          {activeFilter !== 'all' && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Filtered by: <strong>{activeFilter}</strong></span>
              <button
                onClick={() => setActiveFilter('all')}
                className="text-xs text-blue-500 hover:text-blue-700 underline"
              >
                Clear filter
              </button>
            </div>
          )}
          <ChangeList
            changes={filteredAll}
            annotations={analysisResult.annotations}
          />
        </AccordionSection>
      </div>
    </div>
  );
}
