import { useState } from 'react';

/**
 * Runs one async step per item in order (there are no bulk endpoints) and tracks progress. Failures
 * are counted, not thrown, so one bad item never stops the rest.
 */
export function useSequentialRun<TItem>() {
  const [done, setDone] = useState<number | null>(null);

  const run = async (items: readonly TItem[], step: (item: TItem) => Promise<unknown>) => {
    setDone(0);
    const succeeded: TItem[] = [];
    let failed = 0;
    for (const item of items) {
      try {
        await step(item);
        succeeded.push(item);
      } catch {
        failed += 1;
      }
      setDone((value) => (value ?? 0) + 1);
    }
    return { succeeded, failed };
  };

  return { run, done, isRunning: done !== null };
}
