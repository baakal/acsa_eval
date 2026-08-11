'use client';

import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { addResponseComment, listResponses, upsertResponse } from '../lib/api-client';
import type { DiscussionComment, RequirementAnswer } from '../lib/types';

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

/** Map a backend ResponseOut to a frontend RequirementAnswer. */
function responseToAnswer(resp: {
  compliance_code: string | null;
  operating_mode: string | null;
  depends_on_systems: boolean | null;
  dependent_systems: string | null;
  evidence_text: string | null;
  notes: string | null;
  review_outcome: string | null;
  review_feedback: string | null;
  comments: Array<{
    id: string;
    author: string;
    role: string;
    message: string;
    created_at: string;
  }>;
}): RequirementAnswer {
  const reviewStatusMap: Record<string, RequirementAnswer['reviewStatus']> = {
    APPROVED: 'Approved',
    CHANGES_REQUESTED: 'Changes Requested',
  };
  return normalizeAnswer({
    compliance: (resp.compliance_code ?? undefined) as RequirementAnswer['compliance'],
    mode: (resp.operating_mode ?? undefined) as RequirementAnswer['mode'],
    dependsOnOtherSystems: resp.depends_on_systems ?? undefined,
    dependentSystems: resp.dependent_systems ?? '',
    evidence: resp.evidence_text ?? '',
    notes: resp.notes ?? '',
    comments: resp.comments.map(
      (comment): DiscussionComment => ({
        id: comment.id,
        author: comment.author,
        role: comment.role,
        message: comment.message,
        createdAt: comment.created_at,
      }),
    ),
    reviewStatus: reviewStatusMap[resp.review_outcome ?? ''] ?? 'Not Reviewed',
    reviewFeedback: resp.review_feedback ?? '',
  });
}

/** Map a frontend RequirementAnswer to a backend ResponseUpsert payload. */
function answerToUpsert(answer: Partial<RequirementAnswer>) {
  const reviewOutcomeMap: Record<string, string | null> = {
    Approved: 'APPROVED',
    'Changes Requested': 'CHANGES_REQUESTED',
    'Not Reviewed': null,
  };
  const isComplete = Boolean(answer.compliance);
  return {
    compliance_code: answer.compliance ?? null,
    operating_mode: answer.mode ?? null,
    depends_on_systems: answer.dependsOnOtherSystems ?? null,
    dependent_systems: answer.dependentSystems ?? null,
    evidence_text: answer.evidence ?? null,
    notes: answer.notes ?? null,
    is_complete: isComplete,
    review_outcome: reviewOutcomeMap[answer.reviewStatus ?? 'Not Reviewed'] ?? null,
    review_feedback: answer.reviewFeedback ?? null,
  };
}

export function useAnswers(assessmentId: string | null) {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  const { data: responses, mutate } = useSWR(
    assessmentId && token ? ['responses', assessmentId, token] : null,
    ([, id, t]) => listResponses(t as string, id as string),
    { revalidateOnFocus: false },
  );

  const answers = useMemo<Record<string, RequirementAnswer>>(() => {
    if (!responses) return {};
    return Object.fromEntries(
      responses.map((r) => [r.requirement_stable_id, responseToAnswer(r)]),
    );
  }, [responses]);

  const upsertAnswer = useCallback(
    (requirementId: string, patch: Partial<RequirementAnswer>) => {
      if (!assessmentId || !token) return;
      const previous = answers[requirementId];
      const merged = normalizeAnswer({ ...previous, ...patch });

      const reviewOutcomeMap: Record<string, string | null> = {
        Approved: 'APPROVED',
        'Changes Requested': 'CHANGES_REQUESTED',
        'Not Reviewed': null,
      };

      // Optimistic update
      mutate(
        (current) => {
          const existing = current ?? [];
          const index = existing.findIndex((r) => r.requirement_stable_id === requirementId);
          const updated = {
            id: existing[index]?.id ?? '',
            assessment_id: assessmentId,
            requirement_stable_id: requirementId,
            compliance_code: merged.compliance ?? null,
            operating_mode: merged.mode ?? null,
            depends_on_systems: merged.dependsOnOtherSystems ?? null,
            dependent_systems: merged.dependentSystems ?? null,
            evidence_text: merged.evidence ?? null,
            notes: merged.notes ?? null,
            is_complete: Boolean(merged.compliance),
            review_outcome: reviewOutcomeMap[merged.reviewStatus] ?? null,
            review_feedback: merged.reviewFeedback ?? null,
            comments: existing[index]?.comments ?? [],
            updated_at: new Date().toISOString(),
          };
          if (index >= 0) {
            return [...existing.slice(0, index), updated, ...existing.slice(index + 1)];
          }
          return [...existing, updated];
        },
        { revalidate: false },
      );

      // Persist to backend
      upsertResponse(token, assessmentId, requirementId, answerToUpsert(merged)).then(
        (saved) => {
          mutate(
            (current) =>
              (current ?? []).map((r) =>
                r.requirement_stable_id === requirementId ? saved : r,
              ),
            { revalidate: false },
          );
        },
        () => {
          // On error, revalidate to restore server state
          mutate();
        },
      );
    },
    [assessmentId, token, answers, mutate],
  );

  const setAnswers = useCallback(
    (nextAnswers: Record<string, RequirementAnswer>) => {
      if (!assessmentId || !token) return;
      for (const [requirementId, answer] of Object.entries(nextAnswers)) {
        upsertAnswer(requirementId, answer);
      }
    },
    [assessmentId, token, upsertAnswer],
  );

  const addComment = useCallback(
    async (requirementId: string, message: string) => {
      if (!assessmentId || !token) return;
      const saved = await addResponseComment(token, assessmentId, requirementId, message);
      mutate(
        (current) => {
          const existing = current ?? [];
          const index = existing.findIndex((response) => response.requirement_stable_id === requirementId);
          if (index < 0) {
            return [
              ...existing,
              {
                id: '',
                assessment_id: assessmentId,
                requirement_stable_id: requirementId,
                compliance_code: null,
                operating_mode: null,
                depends_on_systems: null,
                dependent_systems: null,
                evidence_text: null,
                notes: null,
                is_complete: false,
                review_outcome: null,
                review_feedback: null,
                comments: [saved],
                updated_at: new Date().toISOString(),
              },
            ];
          }
          return existing.map((response, responseIndex) =>
            responseIndex === index
              ? {
                  ...response,
                  comments: [...response.comments, saved],
                  updated_at: new Date().toISOString(),
                }
              : response,
          );
        },
        { revalidate: false },
      );
    },
    [assessmentId, token, mutate],
  );

  const getAnswer = useCallback(
    (requirementId: string) => normalizeAnswer(answers[requirementId]),
    [answers],
  );

  return { answers, setAnswers, upsertAnswer, addComment, getAnswer };
}
