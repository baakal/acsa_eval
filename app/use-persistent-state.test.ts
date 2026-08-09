import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePersistentValue } from './use-persistent-state';

describe('usePersistentValue', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the fallback when storage is empty and updates persisted state', () => {
    const { result } = renderHook(() => usePersistentValue('persistent:test', { count: 0 }));

    expect(result.current[0]).toEqual({ count: 0 });

    act(() => {
      result.current[1]({ count: 2 });
    });

    expect(result.current[0]).toEqual({ count: 2 });
    expect(window.localStorage.getItem('persistent:test')).toBe(JSON.stringify({ count: 2 }));
  });
});
