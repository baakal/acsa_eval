'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { getAdminAssessment } from '../../../lib/api-client';

export default function AdminAssessmentDetailPage() {
  const params = useParams<{ assessmentId: string }>();
  const { data: session, status } = useSession();
  const token = session?.accessToken ?? '';
  const isAdmin = session?.roles?.includes('admin');
  const assessmentId = params.assessmentId;
  const { data, error, isLoading } = useSWR(
    token && isAdmin ? ['admin-assessment', assessmentId, token] : null,
    ([, currentAssessmentId, currentToken]) =>
      getAdminAssessment(currentToken as string, currentAssessmentId as string),
  );

  if (status === 'loading' || isLoading) {
    return <main className="adminPage"><div className="adminEmpty">Loading assessment summary…</div></main>;
  }

  if (!session || !isAdmin) {
    return <main className="adminPage"><div className="adminEmpty">Admin access is required to view this page.</div></main>;
  }

  if (error || !data) {
    return <main className="adminPage"><div className="adminEmpty">Unable to load this assessment.</div></main>;
  }

  return (
    <main className="adminPage">
      <section className="adminHero">
        <div>
          <Link href="/admin" className="adminBackLink">← Back to admin dashboard</Link>
          <span className="eyebrow">READ-ONLY ASSESSMENT VIEW</span>
          <h1>{data.name}</h1>
          <p>
            {data.organization_name} · {data.country_code ?? 'No country set'} · {data.status}
          </p>
        </div>
        <div className="adminHeroStats">
          <article>
            <span>Completion</span>
            <strong>{data.completion_percent}%</strong>
          </article>
          <article>
            <span>Compliance</span>
            <strong>{data.compliance_score}%</strong>
          </article>
          <article>
            <span>Audit events</span>
            <strong>{data.audit_events.length}</strong>
          </article>
        </div>
      </section>

      <div className="adminSplit">
        <section className="excelAnalytics">
          <div className="analyticsTitle">
            <div>
              <span className="eyebrow">SECTION STATUS</span>
              <h2>Category workflow</h2>
            </div>
          </div>
          <div className="tableScroll">
            <table className="adminTable">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.section_statuses.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No section workflow updates recorded yet.</td>
                  </tr>
                ) : (
                  data.section_statuses.map((section) => (
                    <tr key={section.section_stable_id}>
                      <td>{section.section_stable_id}</td>
                      <td>{section.status}</td>
                      <td>{section.submitted_at ? new Date(section.submitted_at).toLocaleString() : '—'}</td>
                      <td>{new Date(section.updated_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="excelAnalytics">
          <div className="analyticsTitle">
            <div>
              <span className="eyebrow">AUDIT TIMELINE</span>
              <h2>Recent changes</h2>
            </div>
          </div>
          <div className="adminAuditList">
            {data.audit_events.length === 0 ? (
              <p>No audit events recorded yet.</p>
            ) : (
              data.audit_events.map((event) => (
                <article key={event.id}>
                  <div>
                    <b>{event.event_type}</b>
                    <small>{new Date(event.occurred_at).toLocaleString()}</small>
                  </div>
                  {event.details && <pre>{JSON.stringify(event.details, null, 2)}</pre>}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
