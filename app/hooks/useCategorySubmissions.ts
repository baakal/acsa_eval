'use client';

import { useCallback } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { listSectionStatuses, upsertSectionStatus } from '../lib/api-client';
import type { CategorySubmission } from '../lib/types';

/** Convert a frontend category name to the backend section_stable_id format. */
function categoryToStableId(category: string): string {
  return category.toUpperCase().replace(/ /g, '_').slice(0, 100);
}

/** Map a backend SectionStatusOut status to the frontend CategorySubmission status. */
function backendToFrontendStatus(status: string): CategorySubmission['status'] {
  const map: Record<string, CategorySubmission['status']> = {
    Draft: 'Draft',
    Submitted: 'Submitted',
    'Changes Requested': 'Changes Requested',
    Approved: 'Approved',
  };
  return map[status] ?? 'Draft';
}

export function useCategorySubmissions(assessmentId: string | null) {
  const { data: session } = useSession();
  const token = session?.accessToken ?? '';

  const { data: sectionStatuses, mutate } = useSWR(
    assessmentId && token ? ['section-statuses', assessmentId, token] : null,
    ([, id, t]) => listSectionStatuses(t as string, id as string),
    { revalidateOnFocus: false },
  );

  const categorySubmissions: Record<string, CategorySubmission> = {};
  for (const s of sectionStatuses ?? []) {
    // Reverse-map section_stable_id back to category name is not possible without
    // the full catalogue — instead, keep the raw stable_id as the key here.
    // The frontend also uses category names as keys, so we store under both.
    categorySubmissions[s.section_stable_id] = {
      status: backendToFrontendStatus(s.status),
      submittedAt: s.submitted_at ?? undefined,
    };
  }

  const setCategorySubmissions = useCallback(
    (nextSubmissions: Record<string, CategorySubmission>) => {
      if (!assessmentId || !token) return;
      for (const [category, submission] of Object.entries(nextSubmissions)) {
        const stableId = categoryToStableId(category);
        const existing = (sectionStatuses ?? []).find(
          (s) => s.section_stable_id === stableId || s.section_stable_id === category,
        );
        const resolvedStableId = existing?.section_stable_id ?? stableId;

        // Optimistic update
        mutate(
          (current) => {
            const existing2 = current ?? [];
            const index = existing2.findIndex((s) => s.section_stable_id === resolvedStableId);
            const updated = {
              id: existing2[index]?.id ?? '',
              assessment_id: assessmentId,
              section_stable_id: resolvedStableId,
              status: submission.status,
              submitted_at: submission.submittedAt ?? null,
              updated_at: new Date().toISOString(),
            };
            if (index >= 0) {
              return [...existing2.slice(0, index), updated, ...existing2.slice(index + 1)];
            }
            return [...existing2, updated];
          },
          { revalidate: false },
        );

        upsertSectionStatus(token, assessmentId, resolvedStableId, {
          status: submission.status,
          submitted_at: submission.submittedAt ?? null,
        }).then(
          (saved) => {
            mutate(
              (current) =>
                (current ?? []).map((s) =>
                  s.section_stable_id === resolvedStableId ? saved : s,
                ),
              { revalidate: false },
            );
          },
          () => { mutate(); },
        );
      }
    },
    [assessmentId, token, sectionStatuses, mutate],
  );

  return { categorySubmissions, setCategorySubmissions };
}

