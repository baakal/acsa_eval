'use client';

import { useSession } from 'next-auth/react';
import type { SessionAccount } from '../lib/types';

/**
 * Adapts the next-auth session to the SessionAccount shape used throughout
 * the application. The Keycloak realm roles determine the account role.
 */
export function useSessionAccount() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return { account: null, loaded: false };
  }

  if (!session) {
    return { account: null, loaded: true };
  }

  const roles = session.roles ?? [];
  const isCountry = roles.includes('country') || roles.includes('reviewer');
  const role: SessionAccount['role'] = isCountry ? 'Country' : 'Solution Provider';

  const account: SessionAccount = {
    id: session.user?.email ?? 'unknown',
    role,
    name: session.user?.name ?? session.user?.email ?? 'User',
    email: session.user?.email ?? '',
    organization: session.organizationName ?? '',
    country: '',
  };

  return { account, loaded: true };
}

