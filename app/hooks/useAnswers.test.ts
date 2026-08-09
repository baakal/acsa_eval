import { act, renderHook } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeAnswer } from './useAnswers';

describe('normalizeAnswer', () => {
  it('normalizes a partial answer to a full RequirementAnswer', () => {
    const result = normalizeAnswer({
      compliance: 'Fully Meets',
      mode: 'Online',
      dependsOnOtherSystems: false,
    });

    expect(result).toEqual({
      compliance: 'Fully Meets',
      mode: 'Online',
      dependsOnOtherSystems: false,
      dependentSystems: '',
      evidence: '',
      notes: '',
      attachments: [],
      comments: [],
      reviewStatus: 'Not Reviewed',
      reviewFeedback: '',
    });
  });

  it('returns default values for an empty input', () => {
    const result = normalizeAnswer();
    expect(result.dependentSystems).toBe('');
    expect(result.reviewStatus).toBe('Not Reviewed');
    expect(result.attachments).toEqual([]);
  });
});

