'use client';

import { useCallback } from 'react';
import { usePersistentValue } from '../use-persistent-state';
import type { RequirementAnswer } from '../lib/types';

export function normalizeAnswer(answer?: Partial<RequirementAnswer>): RequirementAnswer {
  return {
    compliance: answer?.compliance,
    mode: answer?.mode,
    dependsOnOtherSystems: answer?.dependsOnOtherSystems,
    dependentSystems: answer?.dependentSystems ?? '',
    evidence: answer?.evidence ?? '',
    notes: answer?.notes ?? '',
    attachments: answer?.attachments ?? [],
    comments: answer?.comments ?? [],
    reviewStatus: answer?.reviewStatus ?? 'Not Reviewed',
    reviewFeedback: answer?.reviewFeedback ?? '',
  };
}

export function useAnswers(key: string) {
  const [answers, setAnswers] = usePersistentValue<Record<string, RequirementAnswer>>(key, {});

  const upsertAnswer = useCallback(
    (requirementId: string, patch: Partial<RequirementAnswer>) => {
      const previous = answers[requirementId];
      setAnswers({
        ...answers,
        [requirementId]: normalizeAnswer({
          ...previous,
          ...patch,
        }),
      });
    },
    [answers, setAnswers],
  );

  const getAnswer = useCallback(
    (requirementId: string) => normalizeAnswer(answers[requirementId]),
    [answers],
  );

  return { answers, setAnswers, upsertAnswer, getAnswer };
}
