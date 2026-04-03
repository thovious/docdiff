'use client';

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { ThreeWayDiffResult, ComparisonView } from '@/lib/diff/types';
import type { AnalysisResult } from '@/lib/agent/types';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type AnalysisStatus =
  | 'idle'
  | 'parsing'
  | 'diffing'
  | 'analyzing'
  | 'done'
  | 'error';

interface AnalysisState {
  status: AnalysisStatus;
  threeWayDiff: ThreeWayDiffResult | null;
  analysisResult: AnalysisResult | null;
  activeView: ComparisonView;
  documentNames: { template: string; v1: string; v2: string } | null;
  error: string | null;
}

const INITIAL_STATE: AnalysisState = {
  status: 'idle',
  threeWayDiff: null,
  analysisResult: null,
  activeView: 'tmpl-v2',
  documentNames: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'SET_STATUS'; payload: AnalysisStatus }
  | {
      type: 'SET_DIFF';
      payload: {
        threeWayDiff: ThreeWayDiffResult;
        documentNames: { template: string; v1: string; v2: string };
      };
    }
  | { type: 'SET_ANALYSIS'; payload: AnalysisResult }
  | { type: 'SET_VIEW'; payload: ComparisonView }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' };

function reducer(state: AnalysisState, action: Action): AnalysisState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_DIFF':
      return {
        ...state,
        threeWayDiff: action.payload.threeWayDiff,
        documentNames: action.payload.documentNames,
      };
    case 'SET_ANALYSIS':
      return { ...state, analysisResult: action.payload, status: 'done' };
    case 'SET_VIEW':
      return { ...state, activeView: action.payload };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'RESET':
      return INITIAL_STATE;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AnalysisContextValue {
  state: AnalysisState;
  dispatch: React.Dispatch<Action>;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

/**
 * Provide analysis state to the component tree.
 *
 * @param children - React children.
 * @returns A context provider wrapping the children.
 */
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return (
    <AnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </AnalysisContext.Provider>
  );
}

/**
 * Access the analysis context. Must be used within an {@link AnalysisProvider}.
 *
 * @returns The current analysis state and dispatch function.
 */
export function useAnalysisContext(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error('useAnalysisContext must be used within an AnalysisProvider');
  }
  return ctx;
}
