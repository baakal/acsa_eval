'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadAccounts, saveAccounts } from '../lib/account-store';
import type { Account } from '../lib/types';

export function useAccountStore() {
  const [accounts, setAccountsState] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAccounts()
      .then((storedAccounts) => {
        if (cancelled) return;
        setAccountsState(storedAccounts);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setAccounts = useCallback(async (nextAccounts: Account[]) => {
    setAccountsState(nextAccounts);
    await saveAccounts(nextAccounts);
  }, []);

  return { accounts, setAccounts, loaded };
}
