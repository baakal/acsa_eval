'use client';

import { useEffect, useState } from 'react';
import { loadSessionAccountForToken } from '../lib/account-store';
import type { SessionAccount } from '../lib/types';

type SessionState = {
  account: SessionAccount | null;
  loadedAccountId: string | null;
};

export function useSessionAccount(sessionToken: string | null) {
  const [state, setState] = useState<SessionState>({
    account: null,
    loadedAccountId: null,
  });

  useEffect(() => {
    let cancelled = false;
    if (!sessionToken) {
      return () => {
        cancelled = true;
      };
    }

    loadSessionAccountForToken(sessionToken)
      .then((account) => {
        if (cancelled) return;
        setState({ account, loadedAccountId: sessionToken });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ account: null, loadedAccountId: sessionToken });
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  if (!sessionToken) {
    return { account: null, loaded: true };
  }

  return {
    account: state.loadedAccountId === sessionToken ? state.account : null,
    loaded: state.loadedAccountId === sessionToken,
  };
}
