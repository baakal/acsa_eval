import { describe, expect, it } from 'vitest';
import catalogue from '../catalogue.json';
import { buildScoringSummary, calculateComplianceScore, isAnswerComplete } from './scoring';
import type { CategorySubmission, RequirementAnswer } from './types';

describe('scoring', () => {
  it('treats only fully populated answers as complete', () => {
    expect(
      isAnswerComplete({
        compliance: 'Fully Meets',
        mode: 'Online',
        dependsOnOtherSystems: true,
        dependentSystems: 'SMS gateway',
        evidence: '',
        notes: '',
        attachments: [],
        comments: [],
        reviewStatus: 'Not Reviewed',
        reviewFeedback: '',
      }),
    ).toBe(true);

    expect(
      isAnswerComplete({
        compliance: 'Fully Meets',
        mode: 'Online',
        dependsOnOtherSystems: true,
        dependentSystems: '',
        evidence: '',
        notes: '',
        attachments: [],
        comments: [],
        reviewStatus: 'Not Reviewed',
        reviewFeedback: '',
      }),
    ).toBe(false);
  });

  it('calculates weighted compliance and analytics outputs', () => {
    const answers: Record<string, RequirementAnswer> = {
      [catalogue[0].id]: {
        compliance: 'Fully Meets',
        mode: 'Online',
        dependsOnOtherSystems: false,
        dependentSystems: '',
        evidence: 'Evidence',
        notes: '',
        attachments: [],
        comments: [],
        reviewStatus: 'Approved',
        reviewFeedback: '',
      },
      [catalogue[1].id]: {
        compliance: 'Customization Required',
        mode: 'Offline',
        dependsOnOtherSystems: true,
        dependentSystems: 'Registry',
        evidence: '',
        notes: '',
        attachments: [],
        comments: [],
        reviewStatus: 'Changes Requested',
        reviewFeedback: '',
      },
    };
    const submissions: Record<string, CategorySubmission> = {
      [catalogue[0].category]: { status: 'Submitted' },
    };

    const categories = Array.from(new Set(catalogue.map((item) => item.category)));
    const summary = buildScoringSummary(categories, catalogue, answers, submissions);

    expect(calculateComplianceScore(catalogue, answers)).toBeGreaterThan(0);
    expect(summary.answered).toBe(2);
    expect(summary.approvedCount).toBe(1);
    expect(summary.changesRequestedCount).toBe(1);
    expect(summary.analyticsScopes[0].counts[0]).toBe(1);
    expect(summary.analyticsScopes[0].counts[2]).toBe(1);
  });
});
