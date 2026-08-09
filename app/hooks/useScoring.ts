'use client';

import { useMemo } from 'react';
import { buildScoringSummary } from '../lib/scoring';
import type { CatalogueItem, CategorySubmission, RequirementAnswer } from '../lib/types';

export function useScoring(
  categories: string[],
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
  categorySubmissions: Record<string, CategorySubmission>,
) {
  return useMemo(
    () => buildScoringSummary(categories, catalogue, answers, categorySubmissions),
    [answers, categories, catalogue, categorySubmissions],
  );
}
