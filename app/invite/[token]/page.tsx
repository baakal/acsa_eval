'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { acceptInvitation, getInvitation, type InvitationOut } from '../../../lib/api-client';

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invitation, setInvitation] = useState<InvitationOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params?.token;
    if (!token || Array.isArray(token)) return;
    getInvitation(token)
      .then((result) => {
        setInvitation(result);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Invitation could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [params]);

  async function handleAccept() {
    const token = params?.token;
    if (!session?.accessToken || !token || Array.isArray(token)) return;
    try {
      setSubmitting(true);
      await acceptInvitation(session.accessToken, token);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation could not be accepted.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="invitePage">
      <section className="inviteCard">
        <span className="eyebrow">SHARED ASSESSMENT INVITE</span>
        <h1>Join a shared workspace</h1>
        {loading ? (
          <p>Loading invitation…</p>
        ) : error ? (
          <p>{error}</p>
        ) : invitation ? (
          <>
            <p>
              <b>{invitation.organization_name}</b>
              {invitation.assessment_name ? ` invited you to collaborate on ${invitation.assessment_name}.` : ' invited you to collaborate.'}
            </p>
            <p>
              This link is reserved for <b>{invitation.email}</b> and expires on{' '}
              {new Date(invitation.expires_at).toLocaleString()}.
            </p>
            {status !== 'authenticated' ? (
              <button onClick={() => signIn()}>Sign in to accept</button>
            ) : (
              <button onClick={handleAccept} disabled={submitting}>
                {submitting ? 'Joining…' : 'Accept invitation'}
              </button>
            )}
          </>
        ) : (
          <p>Invitation not found.</p>
        )}
        <Link href="/">Return to the workspace</Link>
      </section>
    </main>
  );
}
