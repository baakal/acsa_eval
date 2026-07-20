'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const PERSISTENCE_EVENT = 'acsa-persistence-changed';

function subscribe(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(PERSISTENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(PERSISTENCE_EVENT, onStoreChange);
  };
}

export function writePersistentValue<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(PERSISTENCE_EVENT));
}

export function usePersistentValue<T>(key: string, fallback: T): [T, (value: T) => void] {
  const getSnapshot = useCallback(() => window.localStorage.getItem(key) ?? '', [key]);
  const getServerSnapshot = useCallback(() => '', []);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = useMemo(() => {
    if (!snapshot) return fallback;
    try {
      return JSON.parse(snapshot) as T;
    } catch {
      return fallback;
    }
  }, [fallback, snapshot]);
  const setValue = useCallback((nextValue: T) => writePersistentValue(key, nextValue), [key]);
  return [value, setValue];
}
