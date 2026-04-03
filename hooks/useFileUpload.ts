import { useState, useCallback } from 'react';

interface FileUploadState {
  template: File | null;
  v1: File | null;
  v2: File | null;
  errors: { template: string | null; v1: string | null; v2: string | null };
  isReady: boolean;
}

interface FileUploadActions {
  setTemplate: (file: File | null) => void;
  setV1: (file: File | null) => void;
  setV2: (file: File | null) => void;
  reset: () => void;
}

/**
 * Validate that a file is a non-empty .docx file.
 *
 * @param file - The file to validate, or null.
 * @returns An error message string, or null if valid.
 */
function validateDocx(file: File | null): string | null {
  if (!file) return null;
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return `"${file.name}" is not a .docx file`;
  }
  if (file.size === 0) {
    return `"${file.name}" is empty`;
  }
  return null;
}

const INITIAL_STATE: FileUploadState = {
  template: null,
  v1: null,
  v2: null,
  errors: { template: null, v1: null, v2: null },
  isReady: false,
};

/**
 * Manage three file upload slots (template, v1, v2) with .docx validation.
 *
 * The `isReady` flag is true only when all three slots contain valid .docx files.
 *
 * @returns File state and setter functions.
 */
export function useFileUpload(): FileUploadState & FileUploadActions {
  const [state, setState] = useState<FileUploadState>(INITIAL_STATE);

  const updateSlot = useCallback(
    (slot: 'template' | 'v1' | 'v2', file: File | null) => {
      setState((prev) => {
        const error = validateDocx(file);
        const newErrors = { ...prev.errors, [slot]: error };
        const newFiles = { ...prev, [slot]: file, errors: newErrors };
        const isReady =
          newFiles.template !== null &&
          newFiles.v1 !== null &&
          newFiles.v2 !== null &&
          !newErrors.template &&
          !newErrors.v1 &&
          !newErrors.v2;
        return { ...newFiles, isReady };
      });
    },
    []
  );

  const setTemplate = useCallback((f: File | null) => updateSlot('template', f), [updateSlot]);
  const setV1 = useCallback((f: File | null) => updateSlot('v1', f), [updateSlot]);
  const setV2 = useCallback((f: File | null) => updateSlot('v2', f), [updateSlot]);
  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { ...state, setTemplate, setV1, setV2, reset };
}
