'use client';

import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { bootstrapWorkspace } from '../lib/api-client';
import type { WorkspaceOut } from '../lib/api-client';

export function useWorkspace() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const { data, error, isLoading } = useSWR<WorkspaceOut>(
    token ? ['workspace', token] : null,
    ([, t]) => bootstrapWorkspace(t as string),
    { revalidateOnFocus: false },
  );

  return {
    workspace: data ?? null,
    loading: status === 'loading' || isLoading,
    error: error as Error | undefined,
  };
}
