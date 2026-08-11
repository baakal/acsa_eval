'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { signOut, useSession } from 'next-auth/react';
import catalogue from './catalogue.json';
import { AnalyticsView } from './components/AnalyticsView';
import { AssessmentView } from './components/AssessmentView';
import { HomeView } from './components/HomeView';
import { AuthScreen } from './components/AuthScreen';
import { useAnswers } from './hooks/useAnswers';
import { useCategorySubmissions } from './hooks/useCategorySubmissions';
import { useScoring } from './hooks/useScoring';
import { useSessionAccount } from './hooks/useSessionAccount';
import { useWorkspace } from './hooks/useWorkspace';
import { MAX_UPLOAD_BYTES } from './lib/config';
import { exportPortableData, exportWorkbook, readPortableDataFile, summarizePortableImport, validatePortableDataFile } from './lib/portability';
import { isAnswerComplete } from './lib/scoring';
import type { FilterKey, PortableDataFile, RequirementAnswer, ResponseTab } from './lib/types';

function subscribeToHydration() {
  return () => undefined;
}

function getHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

export default function Home() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydratedSnapshot,
  );
  const { status: sessionStatus } = useSession();
  const { account, loaded: sessionLoaded } = useSessionAccount();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const assessmentId = workspace?.assessment_id ?? null;
  const { answers, setAnswers, upsertAnswer, getAnswer } = useAnswers(assessmentId);
  const { categorySubmissions, setCategorySubmissions } = useCategorySubmissions(assessmentId);
  const [search, setSearch] = useState('');
  const [workspaceView, setWorkspaceView] = useState<'home' | 'assessment' | 'analytics'>('home');
  const [commentDraft, setCommentDraft] = useState('');
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const categories = useMemo(() => Array.from(new Set(catalogue.map((item) => item.category))), []);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set([categories[0]]));
  const [filter, setFilter] = useState<FilterKey>('all');
  const [activeTab, setActiveTab] = useState<ResponseTab>('response');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dataAction, setDataAction] = useState<'xlsx' | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    data: PortableDataFile;
    summary: ReturnType<typeof summarizePortableImport>;
  } | null>(null);
  const savingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const accountMenuRef = useRef<HTMLDetailsElement>(null);

  const categoryRequirements = useMemo(
    () => catalogue.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );

  const selectedRequirement = selectedRequirementId
    ? catalogue.find((item) => item.id === selectedRequirementId) ?? null
    : null;
  const currentAnswer = selectedRequirement ? getAnswer(selectedRequirement.id) : getAnswer('');

  const scoring = useScoring(categories, catalogue, answers, categorySubmissions);
  const canReview = account?.role === 'Country';
  const resolvedActiveTab = !canReview && activeTab === 'review' ? 'response' : activeTab;
  const canEditResponse =
    !!account &&
    account.role === 'Solution Provider' &&
    (!categorySubmissions[selectedCategory] ||
      categorySubmissions[selectedCategory].status === 'Draft' ||
      categorySubmissions[selectedCategory].status === 'Changes Requested');
  const functionalCount = catalogue.filter((item) => item.type === 'Functional').length;
  const nonFunctionalCount = catalogue.length - functionalCount;
  const mustCount = catalogue.filter((item) => item.priority === 'Must').length;
  const shouldCount = catalogue.filter((item) => item.priority === 'Should').length;
  const couldCount = catalogue.filter((item) => item.priority === 'Could').length;
  const evidenceRequirementCount = Object.values(answers).filter((answer) => answer.attachments?.length).length;

  function matchesSearch(item: (typeof catalogue)[number]) {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${item.id} ${item.name} ${item.description}`.toLowerCase().includes(query);
  }

  function matchesFilter(item: (typeof catalogue)[number]) {
    const answer = answers[item.id];
    if (filter === 'incomplete') return !isAnswerComplete(answer);
    if (filter === 'complete') return isAnswerComplete(answer);
    if (filter === 'flagged') return answer?.reviewStatus === 'Changes Requested';
    return true;
  }

  const navigatorGroups = categories.map((category) => {
    const requirements = catalogue.filter((item) => item.category === category);
    const visible = requirements.filter((item) => matchesSearch(item) && matchesFilter(item));
    const complete = requirements.filter((item) => isAnswerComplete(answers[item.id])).length;
    return { category, requirements, visible, complete, total: requirements.length };
  });

  const filterCounts: Record<FilterKey, number> = {
    all: catalogue.length,
    incomplete: catalogue.filter((item) => !isAnswerComplete(answers[item.id])).length,
    flagged: catalogue.filter((item) => answers[item.id]?.reviewStatus === 'Changes Requested').length,
    complete: catalogue.filter((item) => isAnswerComplete(answers[item.id])).length,
  };

  function chooseCategory(category: string) {
    const firstRequirement = catalogue.find((item) => item.category === category);
    setSelectedCategory(category);
    setSelectedRequirementId(firstRequirement?.id ?? '');
    setSearch('');
    setActiveTab('response');
    setOpenCategories((previous) => new Set(previous).add(category));
  }

  function selectRequirement(id: string) {
    const requirement = catalogue.find((item) => item.id === id);
    if (!requirement) return;
    setSelectedCategory(requirement.category);
    setSelectedRequirementId(id);
    setActiveTab('response');
    setCommentDraft('');
    setOpenCategories((previous) => new Set(previous).add(requirement.category));
  }

  function toggleCategory(category: string) {
    setOpenCategories((previous) => {
      const next = new Set(previous);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function showToast(message: string) {
    setToast(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2400);
  }

  function goToRequirement(offset: number) {
    const selectedIndex = categoryRequirements.findIndex((item) => item.id === selectedRequirement?.id);
    const next = categoryRequirements[selectedIndex + offset];
    if (next) {
      setSelectedRequirementId(next.id);
      setCommentDraft('');
    }
  }

  function jumpToNextIncomplete() {
    const next = catalogue.find((item) => !isAnswerComplete(answers[item.id]));
    if (next) {
      selectRequirement(next.id);
      showToast('Jumped to the next incomplete requirement');
      return;
    }
    showToast('Every requirement is complete');
  }

  function updateAnswer(patch: Partial<RequirementAnswer>) {
    if (!selectedRequirement) return;
    upsertAnswer(selectedRequirement.id, patch);
    setSaving(true);
    if (savingTimeout.current) clearTimeout(savingTimeout.current);
    savingTimeout.current = setTimeout(() => setSaving(false), 450);
  }

  function submitCategory() {
    if (!canEditResponse) return;
    const incomplete = categoryRequirements.filter((requirement) => !isAnswerComplete(answers[requirement.id]));
    if (incomplete.length) {
      window.alert(
        `Complete the remaining ${incomplete.length} requirement${incomplete.length === 1 ? '' : 's'} in ${selectedCategory} before submitting.`,
      );
      return;
    }
    setCategorySubmissions({
      ...categorySubmissions,
      [selectedCategory]: { status: 'Submitted', submittedAt: new Date().toISOString() },
    });
    showToast(`${selectedCategory} submitted for review`);
  }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>) {
    if (!canEditResponse) {
      event.target.value = '';
      return;
    }
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const oversized = files.find((file) => file.size > MAX_UPLOAD_BYTES);
    if (oversized) {
      window.alert(`${oversized.name} is larger than the 1.5 MB limit for this browser-based workspace.`);
      event.target.value = '';
      return;
    }
    const uploaded = await Promise.all(
      files.map(
        (file) =>
          new Promise<RequirementAnswer['attachments'][number]>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                id: window.crypto.randomUUID(),
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                dataUrl: String(reader.result),
              });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );
    updateAnswer({ attachments: [...currentAnswer.attachments, ...uploaded] });
    event.target.value = '';
  }

  function addComment() {
    const message = commentDraft.trim();
    if (!message || !account) return;
    updateAnswer({
      comments: [
        ...currentAnswer.comments,
        {
          id: window.crypto.randomUUID(),
          author: account.name,
          role: account.role,
          message,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setCommentDraft('');
  }

  function changeReviewStatus(status: RequirementAnswer['reviewStatus']) {
    if (!canReview) return;
    updateAnswer({ reviewStatus: status });
    if (status === 'Changes Requested') {
      setCategorySubmissions({
        ...categorySubmissions,
        [selectedCategory]: {
          ...categorySubmissions[selectedCategory],
          status: 'Changes Requested',
        },
      });
      return;
    }
    const allApproved = categoryRequirements.every((requirement) =>
      requirement.id === selectedRequirement?.id
        ? status === 'Approved'
        : answers[requirement.id]?.reviewStatus === 'Approved',
    );
    if (allApproved) {
      setCategorySubmissions({
        ...categorySubmissions,
        [selectedCategory]: {
          ...categorySubmissions[selectedCategory],
          status: 'Approved',
        },
      });
    }
  }

  function closeAccountMenu() {
    accountMenuRef.current?.removeAttribute('open');
  }

  function handleJsonExport() {
    if (!account) return;
    exportPortableData(account, answers, categorySubmissions);
    closeAccountMenu();
    showToast('JSON export downloaded');
  }

  async function handleWorkbookExport() {
    if (!account) return;
    try {
      setDataAction('xlsx');
      await exportWorkbook(account, catalogue, answers, scoring);
      closeAccountMenu();
      showToast('Workbook export downloaded');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Workbook export failed.');
    } finally {
      setDataAction(null);
    }
  }

  function handlePrint() {
    setWorkspaceView('analytics');
    closeAccountMenu();
    setTimeout(() => window.print(), 50);
  }

  function triggerImport() {
    closeAccountMenu();
    importInputRef.current?.click();
  }

  async function handleImportSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = await readPortableDataFile(file);
      const validation = validatePortableDataFile(
        raw,
        new Set(catalogue.map((item) => item.id)),
        new Set(categories),
      );
      if (!validation.valid) {
        window.alert(`Import failed: ${validation.error}`);
        return;
      }
      const summary = summarizePortableImport(answers, categorySubmissions, validation.data);
      setPendingImport({ data: validation.data, summary });
    } catch {
      window.alert('The selected file could not be read as valid JSON.');
    } finally {
      event.target.value = '';
    }
  }

  function confirmImport() {
    if (!pendingImport) return;
    setAnswers(pendingImport.data.answers);
    setCategorySubmissions(pendingImport.data.categorySubmissions);
    setPendingImport(null);
    showToast('Imported assessment data applied');
  }

  useEffect(() => {
    if (workspaceView !== 'assessment') return;
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (typing) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        goToRequirement(1);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        goToRequirement(-1);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        jumpToNextIncomplete();
      }
      if (canEditResponse && ['1', '2', '3', '4'].includes(event.key) && selectedRequirement) {
        updateAnswer({
          compliance:
            ['Fully Meets', 'Meets through Configuration', 'Customization Required', 'Not Available'][
              Number(event.key) - 1
            ] as RequirementAnswer['compliance'],
        });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canEditResponse, selectedRequirement, workspaceView]);

  if (!hydrated || sessionStatus === 'loading' || (sessionStatus === 'authenticated' && (workspaceLoading || !sessionLoaded))) {
    return (
      <main className="appLoading" aria-label="Loading ACSA Evaluation">
        <span className="mark">A</span>
        <div>
          <b>ACSA Evaluation</b>
          <small>Loading your workspace…</small>
        </div>
      </main>
    );
  }

  if (!account) return <AuthScreen />;

  return (
    <main className="assessmentApp" data-print-view={workspaceView}>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleImportSelection}
      />
      <section className="content requirementsContent">
        <header>
          <div className="assessmentBrand">
            <span className="mark">A</span>
            <span>
              ACSA <b>Evaluation</b>
            </span>
            <i />
            <div>
              <strong />
              <small>
                {scoring.answered} of {catalogue.length} complete
              </small>
            </div>
            <div className="scoreSummary">
              <strong>{scoring.complianceScore}%</strong>
              <small>Compliance score</small>
            </div>
          </div>
          <nav className="viewSwitcher" aria-label="Main navigation">
            <button className={workspaceView === 'home' ? 'active' : ''} onClick={() => setWorkspaceView('home')}>
              <span>⌂</span>
              Home
            </button>
            <button className={workspaceView === 'assessment' ? 'active' : ''} onClick={() => setWorkspaceView('assessment')}>
              <span>☷</span>
              Assessment
            </button>
            <button className={workspaceView === 'analytics' ? 'active' : ''} onClick={() => setWorkspaceView('analytics')}>
              <span>▥</span>
              Analytics
            </button>
          </nav>
          <div className="headerActions">
            {workspaceView === 'assessment' && (
              <div className={`autosavePill ${saving ? 'saving' : ''}`}>
                <span className="dot" />
                {saving ? 'Saving…' : 'All changes saved'}
              </div>
            )}
            <details ref={accountMenuRef} className="accountDropdown">
              <summary className="accountSummary">
                <div className="accountAvatar">
                  {account.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="accountBadge">
                  <b>{account.name}</b>
                  <small>
                    {account.role} · {account.organization}
                  </small>
                </div>
                <span className="accountChevron">▾</span>
              </summary>
              <div className="accountDropdownMenu">
                <button onClick={handleJsonExport}>Export data</button>
                <button onClick={triggerImport}>Import data</button>
                <button onClick={handleWorkbookExport} disabled={dataAction === 'xlsx'}>
                  {dataAction === 'xlsx' ? 'Preparing XLSX…' : 'Export to XLSX'}
                </button>
                <button onClick={handlePrint}>Print / Save PDF</button>
                <button onClick={() => signOut()} className="dangerAction">
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>

        {workspaceView === 'home' ? (
          <HomeView
            accountName={account.name}
            answered={scoring.answered}
            totalRequirements={catalogue.length}
            functionalCount={functionalCount}
            nonFunctionalCount={nonFunctionalCount}
            categoryCount={categories.length}
            mustCount={mustCount}
            shouldCount={shouldCount}
            couldCount={couldCount}
            maxWeightedScore={scoring.maxWeightedScore}
            categoryAnalytics={scoring.categoryAnalytics}
            onStartAssessment={() => setWorkspaceView('assessment')}
            onViewAnalytics={() => setWorkspaceView('analytics')}
            onOpenCategory={(category) => {
              chooseCategory(category);
              setWorkspaceView('assessment');
            }}
          />
        ) : workspaceView === 'assessment' ? (
          <AssessmentView
            account={account}
            answered={scoring.answered}
            totalRequirements={catalogue.length}
            categories={categories}
            selectedCategory={selectedCategory}
            selectedRequirementId={selectedRequirementId}
            selectedRequirement={selectedRequirement}
            categoryRequirements={categoryRequirements}
            navigatorGroups={navigatorGroups}
            answers={answers}
            categorySubmissions={categorySubmissions}
            openCategories={openCategories}
            search={search}
            filter={filter}
            filterCounts={filterCounts}
            activeTab={resolvedActiveTab}
            commentDraft={commentDraft}
            currentAnswer={currentAnswer}
            canEditResponse={canEditResponse}
            canReview={canReview}
            searchInputRef={searchInputRef}
            onSearchChange={setSearch}
            onFilterChange={setFilter}
            onToggleCategory={toggleCategory}
            onSelectRequirement={selectRequirement}
            onOpenSelectedCategory={() => chooseCategory(selectedCategory)}
            onBackToOverview={() => setWorkspaceView('home')}
            onSubmitCategory={submitCategory}
            onGoToRequirement={goToRequirement}
            onJumpToNextIncomplete={jumpToNextIncomplete}
            onSetActiveTab={setActiveTab}
            onSetCommentDraft={setCommentDraft}
            onUpdateAnswer={updateAnswer}
            onUploadEvidence={uploadEvidence}
            onAddComment={addComment}
            onChangeReviewStatus={changeReviewStatus}
          />
        ) : (
          <AnalyticsView
            account={account}
            answered={scoring.answered}
            totalRequirements={catalogue.length}
            complianceScore={scoring.complianceScore}
            scoredAnswersCount={scoring.scoredAnswers.length}
            approvedCount={scoring.approvedCount}
            changesRequestedCount={scoring.changesRequestedCount}
            evidenceCount={scoring.evidenceCount}
            evidenceRequirementCount={evidenceRequirementCount}
            analyticsScopes={scoring.analyticsScopes}
            modeAnalytics={scoring.modeAnalytics}
            dependencyAnalytics={scoring.dependencyAnalytics}
            onExportWorkbook={handleWorkbookExport}
            onPrint={handlePrint}
            exportingWorkbook={dataAction === 'xlsx'}
          />
        )}

        {toast && (
          <div className="toast">
            <span className="check">✓</span>
            {toast}
          </div>
        )}

        {pendingImport && (
          <div className="importOverlay" role="presentation">
            <div className="importDialog" role="dialog" aria-modal="true" aria-labelledby="import-dialog-title">
              <span className="eyebrow">IMPORT REVIEW</span>
              <h2 id="import-dialog-title">Confirm imported assessment data</h2>
              <p>
                Review the detected changes before replacing the current browser data for this account.
              </p>
              <div className="importSource">
                <b>{pendingImport.data.account.name}</b>
                <small>
                  {pendingImport.data.account.organization} · {pendingImport.data.account.email}
                </small>
              </div>
              <div className="importSummaryGrid">
                <article>
                  <span>Answers found</span>
                  <strong>{pendingImport.summary.answersFound}</strong>
                </article>
                <article>
                  <span>Submissions found</span>
                  <strong>{pendingImport.summary.submissionsFound}</strong>
                </article>
                <article>
                  <span>Answers changing</span>
                  <strong>{pendingImport.summary.answerChanges}</strong>
                </article>
                <article>
                  <span>Submissions changing</span>
                  <strong>{pendingImport.summary.submissionChanges}</strong>
                </article>
              </div>
              <div className="importActions">
                <button className="secondaryAction" onClick={() => setPendingImport(null)}>
                  Cancel
                </button>
                <button onClick={confirmImport}>Confirm import</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
