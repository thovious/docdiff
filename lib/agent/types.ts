import type { ThreeWayDiffResult } from '../diff/types';

/**
 * AI-assigned significance tier for a change.
 */
export type SignificanceTier = 'critical' | 'moderate' | 'minor' | 'informational';

/**
 * Agent-generated interpretation of a single change record.
 */
export interface ChangeAnnotation {
  changeId: string;
  significance: SignificanceTier;
  /** Plain-English explanation of why this change matters. */
  annotation: string;
  /** Most specific location reference derivable from context, e.g. "Section 4 — Limitation of Liability". */
  citation: string;
  /** IDs of other changes that are logically connected to this one. */
  relatedChangeIds: string[];
}

/**
 * The full result of the agentic analysis pass over the three-way diff.
 */
export interface AnalysisResult {
  /** 3-5 sentence plain-English brief for decision-makers. */
  executiveSummary: string;
  /** Ordered list of change IDs the reviewer should look at first. */
  priorityChanges: string[];
  annotations: ChangeAnnotation[];
  /** High-level risk descriptions, e.g. "Liability cap removed in V2". */
  riskFlags: string[];
  /** ISO timestamp of when the analysis was generated. */
  generatedAt: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

/**
 * The full context object passed to /api/chat for each request.
 */
export interface ChatContext {
  threeWayDiff: ThreeWayDiffResult;
  analysisResult: AnalysisResult;
  documentNames: {
    template: string;
    v1: string;
    v2: string;
  };
}
