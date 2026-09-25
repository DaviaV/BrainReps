import { useCallback, useState } from 'react';
import {
  clearProgress,
  emptyProgress,
  loadProgress,
  saveProgress,
} from '../storage/progress.ts';
import type { Progress } from '../storage/progress.ts';

/**
 * Progress state, persisted on every change. Read once on mount — this is a
 * single-user app on one device, so there is nothing else to sync with.
 */
export function useProgress(): {
  progress: Progress;
  update: (next: Progress) => void;
  reset: () => void;
} {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  const update = useCallback((next: Progress) => {
    setProgress(next);
    saveProgress(next);
  }, []);

  const reset = useCallback(() => {
    clearProgress();
    setProgress(emptyProgress());
  }, []);

  return { progress, update, reset };
}
