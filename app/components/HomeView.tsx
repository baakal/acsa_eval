import type { CategoryAnalytics } from '../lib/types';

type HomeViewProps = {
  accountRole: 'Country' | 'Solution Provider';
  accountName: string;
  answered: number;
  totalRequirements: number;
  functionalCount: number;
  nonFunctionalCount: number;
  categoryCount: number;
  mustCount: number;
  shouldCount: number;
  couldCount: number;
  maxWeightedScore: number;
  categoryAnalytics: CategoryAnalytics[];
  inviteEmail: string;
  inviteRole: string;
  inviteUrl: string | null;
  invitePending: boolean;
  onStartAssessment: () => void;
  onViewAnalytics: () => void;
  onOpenCategory: (category: string) => void;
  onInviteEmailChange: (value: string) => void;
  onInviteRoleChange: (value: string) => void;
  onCreateInvite: () => void;
};

export function HomeView({
  accountRole,
  accountName,
  answered,
  totalRequirements,
  functionalCount,
  nonFunctionalCount,
  categoryCount,
  mustCount,
  shouldCount,
  couldCount,
  maxWeightedScore,
  categoryAnalytics,
  inviteEmail,
  inviteRole,
  inviteUrl,
  invitePending,
  onStartAssessment,
  onViewAnalytics,
  onOpenCategory,
  onInviteEmailChange,
  onInviteRoleChange,
  onCreateInvite,
}: HomeViewProps) {
  const progress = Math.round((answered / totalRequirements) * 100);

  return (
    <div className="homePage">
      <section className="homeHero">
        <div>
          <span className="eyebrow">ACSA CORE REQUIREMENTS SCREENING</span>
          <h1>Welcome, {accountName.split(' ')[0]}</h1>
          <p>
            This evidence-based assessment helps countries and solution providers
            evaluate how a CRVS, Legal Identity, or related digital solution meets
            the ACSA requirements catalogue.
          </p>
          <div className="homeActions">
            <button onClick={onStartAssessment}>
              {answered ? 'Continue data entry' : 'Start data entry'} <span>→</span>
            </button>
            <button onClick={onViewAnalytics}>View analytics</button>
          </div>
        </div>
        <div className="homeProgress">
          <span>ASSESSMENT PROGRESS</span>
          <strong>{progress}%</strong>
          <p>
            {answered} of {totalRequirements} requirements complete
          </p>
          <div>
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <section className="homeSectionTitle">
        <div>
          <span className="eyebrow">REQUIREMENTS CATALOGUE</span>
          <h2>Questionnaire at a glance</h2>
          <p>
            Fixed statistics describing the ACSA requirements catalogue itself,
            independent of your progress.
          </p>
        </div>
      </section>
      <section className="homeStats">
        <article>
          <span>Total requirements</span>
          <strong>{totalRequirements}</strong>
          <small>
            {functionalCount} functional · {nonFunctionalCount} non-functional
          </small>
        </article>
        <article>
          <span>Requirement categories</span>
          <strong>{categoryCount}</strong>
          <small>Assessment areas in the catalogue</small>
        </article>
        <article>
          <span>Must-have requirements</span>
          <strong>{mustCount}</strong>
          <small>
            {shouldCount} should · {couldCount} could
          </small>
        </article>
        <article>
          <span>Maximum achievable score</span>
          <strong>{maxWeightedScore.toFixed(1)}</strong>
          <small>Weighted by priority — Must ×2, Should ×1.5, Could ×1</small>
        </article>
      </section>

      <section className="startGuide">
        <div className="homeSectionTitle">
          <div>
            <span className="eyebrow">HOW TO COMPLETE THE ASSESSMENT</span>
            <h2>Start with the requirements catalogue</h2>
            <p>
              Responses should reflect current solution capabilities, not planned
              future functionality unless clearly stated.
            </p>
          </div>
        </div>
        <div className="guideSteps">
          <article>
            <span>1</span>
            <div>
              <b>Select a category</b>
              <p>
                Work through one assessment area at a time and review every
                requirement carefully.
              </p>
            </div>
          </article>
          <article>
            <span>2</span>
            <div>
              <b>Record the response</b>
              <p>
                Select compliance, operating mode, and dependencies using the
                workbook taxonomy.
              </p>
            </div>
          </article>
          <article>
            <span>3</span>
            <div>
              <b>Provide evidence</b>
              <p>
                Attach documentation, screenshots, demonstrations, configuration
                guides, or API specifications.
              </p>
            </div>
          </article>
          <article>
            <span>4</span>
            <div>
              <b>Submit the category</b>
              <p>
                Complete all required fields, review the score, and submit the
                category for requirement-level review.
              </p>
            </div>
          </article>
        </div>
      </section>

      {accountRole === 'Country' && (
        <section className="homeCollaboration">
          <div className="homeSectionTitle">
            <div>
              <span className="eyebrow">SHARED WORKSPACE</span>
              <h2>Invite a collaborator</h2>
              <p>Create a secure link so a solution provider can join this shared assessment.</p>
            </div>
          </div>
          <div className="inviteGrid">
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => onInviteEmailChange(event.target.value)}
                placeholder="provider@example.org"
              />
            </label>
            <label>
              <span>Role label</span>
              <select value={inviteRole} onChange={(event) => onInviteRoleChange(event.target.value)}>
                <option value="collaborator">Collaborator</option>
                <option value="reviewer">Reviewer</option>
                <option value="contributor">Contributor</option>
              </select>
            </label>
            <button onClick={onCreateInvite} disabled={invitePending || !inviteEmail.trim()}>
              {invitePending ? 'Creating…' : 'Create invite link'}
            </button>
          </div>
          {inviteUrl && (
            <div className="inviteResult">
              <b>Invite link ready</b>
              <a href={inviteUrl}>{inviteUrl}</a>
            </div>
          )}
        </section>
      )}

      <section className="homeCategories">
        <div className="homeSectionTitle">
          <div>
            <span className="eyebrow">DATA ENTRY</span>
            <h2>Requirement categories</h2>
            <p>Choose a category to begin or continue entering responses.</p>
          </div>
          <button onClick={onStartAssessment}>View all {categoryCount} categories →</button>
        </div>
        <div>
          {categoryAnalytics.slice(0, 8).map((item) => (
            <button key={item.category} onClick={() => onOpenCategory(item.category)}>
              <span>
                <b>{item.category}</b>
                <small>{item.status}</small>
              </span>
              <span>
                <strong>
                  {item.completed}/{item.total}
                </strong>
                <i>→</i>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
