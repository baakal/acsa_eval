'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { exportAdminAssessmentsWorkbook, listAdminAssessments } from '../lib/api-client';

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const [exportingWorkbook, setExportingWorkbook] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const token = session?.accessToken ?? '';
  const isAdmin = session?.roles?.includes('admin');
  const { data, error, isLoading } = useSWR(
    token && isAdmin ? ['admin-assessments', token] : null,
    ([, currentToken]) => listAdminAssessments(currentToken as string),
  );

  async function handleWorkbookExport() {
    if (!token) return;
    setExportingWorkbook(true);
    setExportError(null);
    try {
      const workbookBlob = await exportAdminAssessmentsWorkbook(token);
      const exportUrl = URL.createObjectURL(workbookBlob);
      const link = document.createElement('a');
      link.href = exportUrl;
      link.download = `admin-assessments-${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(exportUrl);
    } catch {
      setExportError('Unable to export assessments right now.');
    } finally {
      setExportingWorkbook(false);
    }
  }

  if (status === 'loading' || isLoading) {
    return <main className="adminPage"><div className="adminEmpty">Loading admin dashboard…</div></main>;
  }

  if (!session || !isAdmin) {
    return <main className="adminPage"><div className="adminEmpty">Admin access is required to view this page.</div></main>;
  }

  if (error) {
    return <main className="adminPage"><div className="adminEmpty">Unable to load the admin dashboard.</div></main>;
  }

  return (
    <main className="adminPage">
      <section className="adminHero">
        <div>
          <span className="eyebrow">SPRINT 4 · ADMIN &amp; REPORTING</span>
          <h1>Assessment oversight</h1>
          <p>Track completion, compliance, and workflow status across every assessment.</p>
        </div>
        <div className="adminHeroStats">
          <article>
            <span>Assessments</span>
            <strong>{data?.length ?? 0}</strong>
          </article>
          <article>
            <span>Submitted</span>
            <strong>{data?.filter((assessment) => assessment.status === 'SUBMITTED').length ?? 0}</strong>
          </article>
          <article>
            <span>Average compliance</span>
            <strong>
              {data?.length
                ? Math.round(
                    data.reduce((total, assessment) => total + assessment.compliance_score, 0) / data.length,
                  )
                : 0}
              %
            </strong>
          </article>
        </div>
      </section>

      <section className="excelAnalytics">
        <div className="analyticsTitle">
          <div>
            <span className="eyebrow">ASSESSMENT TABLE</span>
            <h2>All assessments</h2>
            <p>Open any row for a read-only assessment summary and audit timeline.</p>
            {exportError ? <p>{exportError}</p> : null}
          </div>
          <button onClick={handleWorkbookExport} disabled={exportingWorkbook}>
            {exportingWorkbook ? 'Preparing XLSX…' : 'Export all as XLSX'}
          </button>
        </div>
        <div className="tableScroll">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Organisation</th>
                <th>Country</th>
                <th>Status</th>
                <th>Completion</th>
                <th>Compliance</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((assessment) => (
                <tr key={assessment.id}>
                  <td>
                    <Link href={`/admin/assessments/${assessment.id}`}>{assessment.name}</Link>
                  </td>
                  <td>{assessment.organization_name}</td>
                  <td>{assessment.country_code ?? '—'}</td>
                  <td>{assessment.status}</td>
                  <td>
                    {assessment.completion_percent}% ({assessment.completed_requirements}/{assessment.total_requirements})
                  </td>
                  <td>{assessment.compliance_score}%</td>
                  <td>{new Date(assessment.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
