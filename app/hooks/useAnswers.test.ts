import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAnswers } from './useAnswers';

describe('useAnswers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists and normalizes patched answers', () => {
    const { result } = renderHook(() => useAnswers('answers:test'));

    act(() => {
      result.current.upsertAnswer('REQ-1', {
        compliance: 'Fully Meets',
        mode: 'Online',
        dependsOnOtherSystems: false,
      });
    });

    expect(result.current.answers['REQ-1']).toEqual({
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
});
