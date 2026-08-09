import { Fragment } from 'react';
import { complianceValues } from '../lib/config';
import type {
  Account,
  DistributionAnalyticsRow,
  ScopeAnalytics,
} from '../lib/types';

type AnalyticsViewProps = {
  account: Account;
  answered: number;
  totalRequirements: number;
  complianceScore: number;
  scoredAnswersCount: number;
  approvedCount: number;
  changesRequestedCount: number;
  evidenceCount: number;
  evidenceRequirementCount: number;
  analyticsScopes: ScopeAnalytics[];
  modeAnalytics: DistributionAnalyticsRow[];
  dependencyAnalytics: DistributionAnalyticsRow[];
  onExportWorkbook: () => void;
  onPrint: () => void;
  exportingWorkbook: boolean;
};

export function AnalyticsView({
  account,
  answered,
  totalRequirements,
  complianceScore,
  scoredAnswersCount,
  approvedCount,
  changesRequestedCount,
  evidenceCount,
  evidenceRequirementCount,
  analyticsScopes,
  modeAnalytics,
  dependencyAnalytics,
  onExportWorkbook,
  onPrint,
  exportingWorkbook,
}: AnalyticsViewProps) {
  const completion = Math.round((answered / totalRequirements) * 100);

  return (
    <div className="analyticsPage">
      <div className="analyticsHero">
        <div>
          <span className="eyebrow">ASSESSMENT ANALYTICS</span>
          <h1>Evaluation overview</h1>
          <p>Live results calculated from completed and reviewed requirement responses.</p>
        </div>
        <div className="analyticsHeroActions">
          <button onClick={onExportWorkbook} disabled={exportingWorkbook}>
            {exportingWorkbook ? 'Preparing XLSX…' : 'Export XLSX'}
          </button>
          <button onClick={onPrint}>Print / Save PDF</button>
          <div className="analyticsStamp">
            <b>{account.organization}</b>
            <span>{account.role} assessment</span>
          </div>
        </div>
      </div>

      <div className="metricGrid">
        <article>
          <span>COMPLETION</span>
          <strong>{completion}%</strong>
          <p>
            {answered} of {totalRequirements} requirements
          </p>
          <div className="metricTrack">
            <i style={{ width: `${completion}%` }} />
          </div>
        </article>
        <article>
          <span>COMPLIANCE SCORE</span>
          <strong>{complianceScore}%</strong>
          <p>Based on {scoredAnswersCount} scored responses</p>
          <div className="metricTrack score">
            <i style={{ width: `${complianceScore}%` }} />
          </div>
        </article>
        <article>
          <span>REVIEW PROGRESS</span>
          <strong>{approvedCount}</strong>
          <p>Approved · {changesRequestedCount} changes requested</p>
        </article>
        <article>
          <span>SUPPORTING EVIDENCE</span>
          <strong>{evidenceCount}</strong>
          <p>Documents across {evidenceRequirementCount} requirements</p>
        </article>
      </div>

      <section className="excelAnalytics">
        <div className="analyticsTitle">
          <div>
            <span className="eyebrow">EXCEL ANALYTICS · TABLE 1</span>
            <h2>Weighted Scores</h2>
            <p>Compliance score × requirement priority weight, using the workbook&apos;s maximum possible score.</p>
          </div>
        </div>
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Metric</th>
                <th>Must</th>
                <th>Should</th>
                <th>Could</th>
                <th>Total</th>
                <th>Achievement %</th>
              </tr>
            </thead>
            <tbody>
              {analyticsScopes.map((scope) => (
                <Fragment key={scope.label}>
                  <tr>
                    <td>{scope.label}</td>
                    <td>Max Possible Score</td>
                    {scope.byPriority.map((item) => (
                      <td key={item.priority}>{item.max.toFixed(1)}</td>
                    ))}
                    <td>{scope.max.toFixed(1)}</td>
                    <td>—</td>
                  </tr>
                  <tr className="achievedRow">
                    <td>{scope.label}</td>
                    <td>Achieved Weighted Score</td>
                    {scope.byPriority.map((item) => (
                      <td key={item.priority}>{item.achieved.toFixed(1)}</td>
                    ))}
                    <td>{scope.achieved.toFixed(1)}</td>
                    <td>
                      <b>{scope.achievement.toFixed(1)}%</b>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="excelAnalytics">
        <div className="analyticsTitle">
          <div>
            <span className="eyebrow">EXCEL ANALYTICS · TABLE 2</span>
            <h2>Level of Compliance by Scope</h2>
            <p>Total, functional, and non-functional response distribution.</p>
          </div>
        </div>
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Scope</th>
                <th>Metric</th>
                {complianceValues.map((value) => (
                  <th key={value}>{value}</th>
                ))}
                <th>No Response</th>
                <th>Total</th>
                <th>Response Rate %</th>
              </tr>
            </thead>
            <tbody>
              {analyticsScopes.map((scope) => (
                <Fragment key={scope.label}>
                  <tr>
                    <td>{scope.label}</td>
                    <td>Count</td>
                    {scope.counts.map((count, index) => (
                      <td key={complianceValues[index]}>{count}</td>
                    ))}
                    <td>{scope.noResponse}</td>
                    <td>{scope.requirements.length}</td>
                    <td>
                      <b>{scope.responseRate.toFixed(1)}%</b>
                    </td>
                  </tr>
                  <tr className="percentRow">
                    <td>{scope.label}</td>
                    <td>%</td>
                    {scope.counts.map((count, index) => (
                      <td key={complianceValues[index]}>
                        {((count / scope.requirements.length) * 100).toFixed(1)}%
                      </td>
                    ))}
                    <td>{((scope.noResponse / scope.requirements.length) * 100).toFixed(1)}%</td>
                    <td>100%</td>
                    <td>{scope.responseRate.toFixed(1)}%</td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="excelAnalytics">
        <div className="analyticsTitle">
          <div>
            <span className="eyebrow">EXCEL ANALYTICS · TABLE 3</span>
            <h2>Online/Offline vs Level of Compliance</h2>
            <p>Operating mode cross-tabulated against compliance responses.</p>
          </div>
        </div>
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Online/Offline</th>
                <th>Metric</th>
                {complianceValues.map((value) => (
                  <th key={value}>{value}</th>
                ))}
                <th>No Response</th>
                <th>Total</th>
                <th>Response Rate %</th>
              </tr>
            </thead>
            <tbody>
              {modeAnalytics.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>Count</td>
                  {row.counts.map((count, index) => (
                    <td key={complianceValues[index]}>{count}</td>
                  ))}
                  <td>{row.noResponse}</td>
                  <td>{row.total}</td>
                  <td>{row.responseRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="excelAnalytics">
        <div className="analyticsTitle">
          <div>
            <span className="eyebrow">EXCEL ANALYTICS · TABLE 4</span>
            <h2>Dependent on Other Systems vs Level of Compliance</h2>
            <p>System dependency cross-tabulated against compliance responses.</p>
          </div>
        </div>
        <div className="tableScroll">
          <table>
            <thead>
              <tr>
                <th>Dependent on other systems</th>
                <th>Metric</th>
                {complianceValues.map((value) => (
                  <th key={value}>{value}</th>
                ))}
                <th>No Response</th>
                <th>Total</th>
                <th>Response Rate %</th>
              </tr>
            </thead>
            <tbody>
              {dependencyAnalytics.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>Count</td>
                  {row.counts.map((count, index) => (
                    <td key={complianceValues[index]}>{count}</td>
                  ))}
                  <td>{row.noResponse}</td>
                  <td>{row.total}</td>
                  <td>{row.responseRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
