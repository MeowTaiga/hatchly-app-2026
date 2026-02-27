import { useState, useCallback, useRef } from 'react';
import { api, type RecipeJournalEntry } from '@/lib/api';

type JournalType = 'cooking' | 'crafting';

/**
 * Caches recipe journal data locally and fetches in background.
 * - First load: shows loading until data arrives.
 * - Subsequent loads: shows cached data immediately, fetches in background and updates if changed.
 */
export function useRecipeJournal(journalType: JournalType): {
  journal: RecipeJournalEntry[];
  fetchJournal: () => Promise<void>;
  journalLoading: boolean;
} {
  const [journal, setJournal] = useState<RecipeJournalEntry[]>([]);
  const [journalLoading, setJournalLoading] = useState(false);
  const journalRef = useRef(journal);
  journalRef.current = journal;

  const fetchJournal = useCallback(async () => {
    const hasCache = journalRef.current.length > 0;

    if (!hasCache) {
      setJournalLoading(true);
    }

    try {
      const data =
        journalType === 'cooking'
          ? await api.getRecipeJournal()
          : await api.getCraftJournal();
      setJournal(data.recipes);
    } catch {
      if (!hasCache) {
        setJournal([]);
      }
      // On error with cache, keep existing data
    } finally {
      setJournalLoading(false);
    }
  }, [journalType]);

  return { journal, fetchJournal, journalLoading };
}
