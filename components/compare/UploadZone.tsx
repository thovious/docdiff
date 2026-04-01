'use client';

import { useRef, useState, useCallback } from 'react';

interface UploadZoneProps {
  label: string;
  file: File | null;
  onFile: (f: File) => void;
  disabled?: boolean;
}

/**
 * Drag-and-drop file upload zone that accepts only .docx files.
 *
 * @param label - Descriptive label shown above the drop area.
 * @param file - Currently selected file, or null.
 * @param onFile - Callback invoked with a valid .docx File.
 * @param disabled - When true, interaction is blocked.
 */
export function UploadZone({ label, file, onFile, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validate = useCallback(
    (f: File): boolean => {
      if (!f.name.toLowerCase().endsWith('.docx')) {
        setValidationError('Only .docx files are supported.');
        return false;
      }
      setValidationError(null);
      return true;
    },
    []
  );

  const handleFile = useCallback(
    (f: File) => {
      if (validate(f)) onFile(f);
    },
    [validate, onFile]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragging(true);
      setValidationError(null);
    }
  };

  const onDragLeave = () => setDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const baseClasses =
    'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors cursor-pointer select-none min-h-[120px]';

  const stateClasses = disabled
    ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
    : dragging
    ? 'border-blue-400 bg-blue-50'
    : validationError
    ? 'border-red-400 bg-red-50'
    : file
    ? 'border-green-400 bg-green-50'
    : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/40';

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>

      {/* Drop zone */}
      <div
        className={`${baseClasses} ${stateClasses}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        aria-label={`Upload ${label}`}
        aria-disabled={disabled}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          className="sr-only"
          onChange={onInputChange}
          disabled={disabled}
        />

        {file ? (
          <>
            <svg className="mb-2 h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-800 break-all">{file.name}</span>
            <span className="mt-0.5 text-xs text-gray-500">
              {(file.size / 1024).toFixed(1)} KB · click to replace
            </span>
          </>
        ) : (
          <>
            <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-sm font-medium text-gray-600">
              {dragging ? 'Drop it here' : 'Drop a .docx file or click to browse'}
            </span>
          </>
        )}
      </div>

      {validationError && (
        <p className="text-xs text-red-600">{validationError}</p>
      )}
    </div>
  );
}
