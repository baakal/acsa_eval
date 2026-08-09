'use client';

import { usePersistentValue } from '../use-persistent-state';
import type { CategorySubmission } from '../lib/types';

export function useCategorySubmissions(key: string) {
  const [categorySubmissions, setCategorySubmissions] = usePersistentValue<
    Record<string, CategorySubmission>
  >(key, {});

  return { categorySubmissions, setCategorySubmissions };
}
