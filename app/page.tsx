'use client';

import { ChangeEvent, Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import catalogue from './catalogue.json';
import { Account, AuthScreen, SESSION_KEY } from './auth';
import { usePersistentValue, writePersistentValue } from './use-persistent-state';

type ComplianceLevel = 'Fully Meets' | 'Meets through Configuration' | 'Customization Required' | 'Not Available';
type DeliveryMode = 'Online' | 'Offline' | 'Both';
type ReviewStatus = 'Not Reviewed' | 'Approved' | 'Changes Requested';
type Attachment = { id: string; name: string; type: string; size: number; uploadedAt: string; dataUrl: string };
type DiscussionComment = { id: string; author: string; role: string; message: string; createdAt: string };
type RequirementAnswer = {
  compliance?: ComplianceLevel;
  mode?: DeliveryMode;
  dependsOnOtherSystems?: boolean;
  dependentSystems: string;
  evidence: string;
  notes: string;
  attachments: Attachment[];
  comments: DiscussionComment[];
  reviewStatus: ReviewStatus;
  reviewFeedback: string;
};
type CategorySubmission = { status: 'Draft' | 'Submitted' | 'Changes Requested' | 'Approved'; submittedAt?: string };
type FilterKey = 'all' | 'incomplete' | 'flagged' | 'complete';
type ResponseTab = 'response' | 'review' | 'discussion';
type CatalogueItem = (typeof catalogue)[number];

const complianceOptions: { value: ComplianceLevel; description: string; score: number }[] = [
  { value: 'Fully Meets', description: 'Fully supported standard functionality without configuration, customization, or development.', score: 2 },
  { value: 'Meets through Configuration', description: 'Enabled through configuration without software development.', score: 2 },
  { value: 'Customization Required', description: 'Additional development or significant configuration is required.', score: 1 },
  { value: 'Not Available', description: 'The requirement is not supported.', score: 0 },
];
const priorityWeights: Record<string, number> = { Must: 2, Should: 1.5, Could: 1 };
const complianceValues = complianceOptions.map((option) => option.value);

function isAnswerComplete(answer?: RequirementAnswer) {
  return Boolean(
    answer?.compliance && answer.mode && answer.dependsOnOtherSystems !== undefined &&
    (!answer.dependsOnOtherSystems || answer.dependentSystems.trim()),
  );
}

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
  const [account] = usePersistentValue<Account | null>(SESSION_KEY, null);
  const accountId = account?.id ?? 'signed-out';
  const answersKey = `acsa-requirement-answers:${accountId}`;
  const submissionsKey = `acsa-category-submissions:${accountId}`;
  const [answers, setAnswers] = usePersistentValue<Record<string, RequirementAnswer>>(answersKey, {});
  const [categorySubmissions, setCategorySubmissions] = usePersistentValue<Record<string, CategorySubmission>>(submissionsKey, {});
  const [search, setSearch] = useState('');
  const [workspaceView, setWorkspaceView] = useState<'home' | 'assessment' | 'analytics'>('home');
  const [commentDraft, setCommentDraft] = useState('');
  const categories = useMemo(() => Array.from(new Set(catalogue.map((item) => item.category))), []);
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set([categories[0]]));
  const [filter, setFilter] = useState<FilterKey>('all');
  const [activeTab, setActiveTab] = useState<ResponseTab>('response');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const savingTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categoryRequirements = useMemo(
    () => catalogue.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );
  function matchesSearch(item: CatalogueItem) {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${item.id} ${item.name} ${item.description}`.toLowerCase().includes(query);
  }
  function matchesFilter(item: CatalogueItem) {
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
  const selectedRequirement = selectedRequirementId
    ? catalogue.find((item) => item.id === selectedRequirementId) ?? null
    : null;
  const selectedIndex = categoryRequirements.findIndex((item) => item.id === selectedRequirement?.id);
  const savedAnswer = selectedRequirement ? answers[selectedRequirement.id] : undefined;
  const currentAnswer: RequirementAnswer = {
    ...savedAnswer,
    dependentSystems: savedAnswer?.dependentSystems ?? '',
    evidence: savedAnswer?.evidence ?? '',
    notes: savedAnswer?.notes ?? '',
    attachments: savedAnswer?.attachments ?? [],
    comments: savedAnswer?.comments ?? [],
    reviewStatus: savedAnswer?.reviewStatus ?? 'Not Reviewed',
    reviewFeedback: savedAnswer?.reviewFeedback ?? '',
  };
  const answered = Object.values(answers).filter(isAnswerComplete).length;
  const scoredAnswers = Object.values(answers).filter((answer) => answer.compliance);
  const maxWeightedScore = catalogue.reduce((total, requirement) => total + 3 * (priorityWeights[requirement.priority] ?? 1), 0);
  const achievedWeightedScore = catalogue.reduce((total, requirement) => {
    const responseScore = complianceOptions.find((option) => option.value === answers[requirement.id]?.compliance)?.score ?? 0;
    return total + responseScore * (priorityWeights[requirement.priority] ?? 1);
  }, 0);
  const complianceScore = Math.round(achievedWeightedScore / maxWeightedScore * 100);
  const approvedCount = Object.values(answers).filter((answer) => answer.reviewStatus === 'Approved').length;
  const changesRequestedCount = Object.values(answers).filter((answer) => answer.reviewStatus === 'Changes Requested').length;
  const evidenceCount = Object.values(answers).reduce((total, answer) => total + (answer.attachments?.length ?? 0), 0);
  const categoryAnalytics = categories.map((category) => {
    const requirements = catalogue.filter((item) => item.category === category);
    const categoryAnswers = requirements.map((item) => answers[item.id]).filter(Boolean);
    const completed = categoryAnswers.filter(isAnswerComplete).length;
    const categoryMax = requirements.reduce((total, requirement) => total + 3 * (priorityWeights[requirement.priority] ?? 1), 0);
    const categoryAchieved = requirements.reduce((total, requirement) => total + (complianceOptions.find((option) => option.value === answers[requirement.id]?.compliance)?.score ?? 0) * (priorityWeights[requirement.priority] ?? 1), 0);
    const score = Math.round(categoryAchieved / categoryMax * 100);
    return { category, total: requirements.length, completed, score, status: categorySubmissions[category]?.status ?? 'Draft' };
  });
  const analyticsScopes = [
    { label: 'Total (Functional + Non-functional)', requirements: catalogue },
    { label: 'Functional', requirements: catalogue.filter((item) => item.type === 'Functional') },
    { label: 'Non-functional', requirements: catalogue.filter((item) => item.type === 'Non-functional') },
  ].map((scope) => {
    const byPriority = (['Must', 'Should', 'Could'] as const).map((priority) => {
      const requirements = scope.requirements.filter((item) => item.priority === priority);
      const max = requirements.length * 3 * priorityWeights[priority];
      const achieved = requirements.reduce((total, requirement) => total + (complianceOptions.find((option) => option.value === answers[requirement.id]?.compliance)?.score ?? 0) * priorityWeights[priority], 0);
      return { priority, max, achieved };
    });
    const max = byPriority.reduce((total, item) => total + item.max, 0);
    const achieved = byPriority.reduce((total, item) => total + item.achieved, 0);
    const counts = complianceValues.map((compliance) => scope.requirements.filter((item) => answers[item.id]?.compliance === compliance).length);
    const noResponse = scope.requirements.filter((item) => !answers[item.id]?.compliance).length;
    return { ...scope, byPriority, max, achieved, achievement: max ? achieved / max * 100 : 0, counts, noResponse, responseRate: scope.requirements.length ? (scope.requirements.length - noResponse) / scope.requirements.length * 100 : 0 };
  });
  const modeAnalytics = ([...(['Online', 'Offline', 'Both'] as DeliveryMode[]), 'No Response'] as const).map((mode) => {
    const requirements = catalogue.filter((item) => mode === 'No Response' ? !answers[item.id]?.mode : answers[item.id]?.mode === mode);
    const counts = complianceValues.map((compliance) => requirements.filter((item) => answers[item.id]?.compliance === compliance).length);
    const noResponse = requirements.filter((item) => !answers[item.id]?.compliance).length;
    return { label: mode, counts, noResponse, total: requirements.length, responseRate: requirements.length ? (requirements.length - noResponse) / requirements.length * 100 : 0 };
  });
  const dependencyAnalytics = (['Yes', 'No', 'No Response'] as const).map((dependency) => {
    const requirements = catalogue.filter((item) => dependency === 'No Response' ? answers[item.id]?.dependsOnOtherSystems === undefined : answers[item.id]?.dependsOnOtherSystems === (dependency === 'Yes'));
    const counts = complianceValues.map((compliance) => requirements.filter((item) => answers[item.id]?.compliance === compliance).length);
    const noResponse = requirements.filter((item) => !answers[item.id]?.compliance).length;
    return { label: dependency, counts, noResponse, total: requirements.length, responseRate: requirements.length ? (requirements.length - noResponse) / requirements.length * 100 : 0 };
  });

  function chooseCategory(category: string) {
    const firstRequirement = catalogue.find((item) => item.category === category);
    setSelectedCategory(category);
    setSelectedRequirementId(firstRequirement?.id ?? '');
    setSearch('');
    setActiveTab('response');
    setOpenCategories((previous) => new Set(previous).add(category));
  }

  function openSelectedCategory() {
    chooseCategory(selectedCategory);
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
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  }

  function showToast(message: string) {
    setToast(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 2400);
  }

  function jumpToNextIncomplete() {
    const next = catalogue.find((item) => !isAnswerComplete(answers[item.id]));
    if (next) {
      selectRequirement(next.id);
      showToast('Jumped to the next incomplete requirement');
    } else {
      showToast('Every requirement is complete');
    }
  }

  function updateAnswer(patch: Partial<RequirementAnswer>) {
    if (!selectedRequirement) return;
    const previous = answers[selectedRequirement.id];
    const next = {
      ...answers,
      [selectedRequirement.id]: {
        ...previous,
        ...patch,
        dependentSystems: patch.dependentSystems ?? previous?.dependentSystems ?? '',
        evidence: patch.evidence ?? previous?.evidence ?? '',
        notes: patch.notes ?? previous?.notes ?? '',
        attachments: patch.attachments ?? previous?.attachments ?? [],
        comments: patch.comments ?? previous?.comments ?? [],
        reviewStatus: patch.reviewStatus ?? previous?.reviewStatus ?? 'Not Reviewed',
        reviewFeedback: patch.reviewFeedback ?? previous?.reviewFeedback ?? '',
      },
    };
    setAnswers(next);
    setSaving(true);
    if (savingTimeout.current) clearTimeout(savingTimeout.current);
    savingTimeout.current = setTimeout(() => setSaving(false), 450);
  }

  function submitCategory() {
    const incomplete = categoryRequirements.filter((requirement) => !isAnswerComplete(answers[requirement.id]));
    if (incomplete.length) {
      window.alert(`Complete the remaining ${incomplete.length} requirement${incomplete.length === 1 ? '' : 's'} in ${selectedCategory} before submitting.`);
      return;
    }
    setCategorySubmissions({
      ...categorySubmissions,
      [selectedCategory]: { status: 'Submitted', submittedAt: new Date().toISOString() },
    });
  }

  async function uploadEvidence(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const oversized = files.find((file) => file.size > 1_500_000);
    if (oversized) {
      window.alert(`${oversized.name} is larger than the 1.5 MB limit for this browser-based workspace.`);
      event.target.value = '';
      return;
    }
    const uploaded = await Promise.all(files.map((file) => new Promise<Attachment>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ id: window.crypto.randomUUID(), name: file.name, type: file.type, size: file.size, uploadedAt: new Date().toISOString(), dataUrl: String(reader.result) });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    })));
    updateAnswer({ attachments: [...currentAnswer.attachments, ...uploaded] });
    event.target.value = '';
  }

  function addComment() {
    const message = commentDraft.trim();
    if (!message || !account) return;
    updateAnswer({ comments: [...currentAnswer.comments, { id: window.crypto.randomUUID(), author: account.name, role: account.role, message, createdAt: new Date().toISOString() }] });
    setCommentDraft('');
  }

  function changeReviewStatus(status: ReviewStatus) {
    updateAnswer({ reviewStatus: status });
    if (status === 'Changes Requested') {
      setCategorySubmissions({ ...categorySubmissions, [selectedCategory]: { ...categorySubmissions[selectedCategory], status: 'Changes Requested' } });
      return;
    }
    const allApproved = categoryRequirements.every((requirement) =>
      requirement.id === selectedRequirement?.id
        ? status === 'Approved'
        : answers[requirement.id]?.reviewStatus === 'Approved',
    );
    if (allApproved) {
      setCategorySubmissions({ ...categorySubmissions, [selectedCategory]: { ...categorySubmissions[selectedCategory], status: 'Approved' } });
    }
  }

  function goToRequirement(offset: number) {
    const next = categoryRequirements[selectedIndex + offset];
    if (next) {
      setSelectedRequirementId(next.id);
      setCommentDraft('');
    }
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
      if (event.key === 'ArrowDown') { event.preventDefault(); goToRequirement(1); }
      if (event.key === 'ArrowUp') { event.preventDefault(); goToRequirement(-1); }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); jumpToNextIncomplete(); }
      if (['1', '2', '3', '4'].includes(event.key) && selectedRequirement) {
        updateAnswer({ compliance: complianceOptions[Number(event.key) - 1].value });
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!hydrated) return <main className="appLoading" aria-label="Loading ACSA Evaluation"><span className="mark">A</span><div><b>ACSA Evaluation</b><small>Loading your workspace…</small></div></main>;
  if (!account) return <AuthScreen/>;

  return <main className="assessmentApp">
    <section className="content requirementsContent">
      <header>
        <div className="assessmentBrand"><span className="mark">A</span><span>ACSA <b>Evaluation</b></span><i></i><div><strong>Civil Registry 2.4</strong><small>{answered} of {catalogue.length} complete</small></div><div className="scoreSummary"><strong>{complianceScore}%</strong><small>Compliance score</small></div></div>
        <nav className="viewSwitcher" aria-label="Main navigation"><button className={workspaceView === 'home' ? 'active' : ''} onClick={() => setWorkspaceView('home')}><span>⌂</span>Home</button><button className={workspaceView === 'assessment' ? 'active' : ''} onClick={() => setWorkspaceView('assessment')}><span>☷</span>Assessment</button><button className={workspaceView === 'analytics' ? 'active' : ''} onClick={() => setWorkspaceView('analytics')}><span>▥</span>Analytics</button></nav>
        <div className="headerActions">{workspaceView === 'assessment' && <div className={`autosavePill ${saving ? 'saving' : ''}`}><span className="dot"/>{saving ? 'Saving…' : 'All changes saved'}</div>}<div className="accountMenu"><div className="accountAvatar">{account.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="accountBadge"><b>{account.name}</b><small>{account.role} · {account.organization}</small></div><button className="logout" onClick={() => writePersistentValue(SESSION_KEY, null)} aria-label="Sign out">Sign out</button></div></div>
      </header>

      {workspaceView === 'home' ? <div className="homePage">
        <section className="homeHero"><div><span className="eyebrow">ACSA CORE REQUIREMENTS SCREENING</span><h1>Welcome, {account.name.split(' ')[0]}</h1><p>This evidence-based assessment helps countries and solution providers evaluate how a CRVS, Legal Identity, or related digital solution meets the ACSA requirements catalogue.</p><div className="homeActions"><button onClick={() => setWorkspaceView('assessment')}>{answered ? 'Continue data entry' : 'Start data entry'} <span>→</span></button><button onClick={() => setWorkspaceView('analytics')}>View analytics</button></div></div><div className="homeProgress"><span>ASSESSMENT PROGRESS</span><strong>{Math.round(answered / catalogue.length * 100)}%</strong><p>{answered} of {catalogue.length} requirements complete</p><div><i style={{ width: `${answered / catalogue.length * 100}%` }}/></div></div></section>

        <section className="homeStats"><article><span>Weighted achievement</span><strong>{complianceScore}%</strong><small>{achievedWeightedScore.toFixed(1)} of {maxWeightedScore.toFixed(1)} points</small></article><article><span>Categories submitted</span><strong>{categoryAnalytics.filter((item) => item.status === 'Submitted' || item.status === 'Approved').length}</strong><small>of {categories.length} assessment areas</small></article><article><span>Requirements approved</span><strong>{approvedCount}</strong><small>{changesRequestedCount} changes requested</small></article><article><span>Evidence documents</span><strong>{evidenceCount}</strong><small>Uploaded across the assessment</small></article></section>

        <section className="startGuide"><div className="homeSectionTitle"><div><span className="eyebrow">HOW TO COMPLETE THE ASSESSMENT</span><h2>Start with the requirements catalogue</h2><p>Responses should reflect current solution capabilities, not planned future functionality unless clearly stated.</p></div></div><div className="guideSteps"><article><span>1</span><div><b>Select a category</b><p>Work through one assessment area at a time and review every requirement carefully.</p></div></article><article><span>2</span><div><b>Record the response</b><p>Select compliance, operating mode, and dependencies using the workbook taxonomy.</p></div></article><article><span>3</span><div><b>Provide evidence</b><p>Attach documentation, screenshots, demonstrations, configuration guides, or API specifications.</p></div></article><article><span>4</span><div><b>Submit the category</b><p>Complete all required fields, review the score, and submit the category for requirement-level review.</p></div></article></div></section>

        <section className="homeCategories"><div className="homeSectionTitle"><div><span className="eyebrow">DATA ENTRY</span><h2>Requirement categories</h2><p>Choose a category to begin or continue entering responses.</p></div><button onClick={() => setWorkspaceView('assessment')}>View all {categories.length} categories →</button></div><div>{categoryAnalytics.slice(0, 8).map((item) => <button key={item.category} onClick={() => { chooseCategory(item.category); setWorkspaceView('assessment'); }}><span><b>{item.category}</b><small>{item.status}</small></span><span><strong>{item.completed}/{item.total}</strong><i>→</i></span></button>)}</div></section>
      </div> : workspaceView === 'assessment' ? <div className="assessment">
        <div className="navigator">
          <div className="navHead">
            <h2>Requirements <span>{answered}/{catalogue.length}</span></h2>
            <label className="searchBox">
              <span>⌕</span>
              <input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search all categories…" />
              <kbd>/</kbd>
            </label>
            <div className="filterChips">
              {([{ key: 'all', label: 'All' }, { key: 'incomplete', label: 'Incomplete' }, { key: 'flagged', label: 'Flagged' }, { key: 'complete', label: 'Complete' }] as { key: FilterKey; label: string }[]).map((chip) => (
                <button key={chip.key} className={filter === chip.key ? 'active' : ''} onClick={() => setFilter(chip.key)}>{chip.label} <em>{filterCounts[chip.key]}</em></button>
              ))}
            </div>
          </div>
          <div className="navList">
            {navigatorGroups.map((group) => {
              if (search.trim() && group.visible.length === 0) return null;
              const isOpen = openCategories.has(group.category) || Boolean(search.trim());
              const pct = group.total ? Math.round((group.complete / group.total) * 100) : 0;
              const submission = categorySubmissions[group.category]?.status ?? 'Draft';
              return <div key={group.category} className={`catGroup ${isOpen ? 'open' : ''} ${selectedCategory === group.category ? 'active' : ''}`}>
                <button className="catHead" onClick={() => toggleCategory(group.category)} title={submission}>
                  <span className="ring" style={{ background: `conic-gradient(${pct === 100 ? 'var(--success)' : 'var(--blue)'} ${pct * 3.6}deg, var(--line) 0deg)` }} />
                  <span className="label">{group.category}</span>
                  <span className="count">{group.complete}/{group.total}</span>
                  <span className="chev">›</span>
                </button>
                <div className="reqRows">
                  {group.visible.map((item) => {
                    const answer = answers[item.id];
                    const complete = isAnswerComplete(answer);
                    const flagged = answer?.reviewStatus === 'Changes Requested';
                    return <button key={item.id} className={`reqRow ${selectedRequirement?.id === item.id ? 'selected' : ''}`} onClick={() => selectRequirement(item.id)}>
                      <span className={`reqStatusDot ${complete ? 'complete' : flagged ? 'flagged' : ''}`}>{complete ? '✓' : ''}</span>
                      <span className="name">{item.name}</span>
                      <span className={`reqPriorityDot ${item.priority.toLowerCase()}`} />
                    </button>;
                  })}
                  {group.visible.length === 0 && <p className="navNoResults">No matches in this category.</p>}
                </div>
              </div>;
            })}
          </div>
          <div className="navFoot"><span>{categories.length} categories</span><span>↑ ↓ to move</span></div>
        </div>

        <div className="canvasWrap">
          <div className="canvas">
            {!selectedRequirement ? <div className="assessmentIntro questionPane">
              <div className="introCard">
                <span className="eyebrow">ASSESSMENT INTRODUCTION</span>
                <h1>Select a category to begin</h1>
                <p>The navigator on the left is a shortcut for jumping between assessment areas. Start with the overview below, then open a category when you are ready to answer requirements.</p>
                <div className="introActions">
                  <button onClick={openSelectedCategory}>Start with {selectedCategory}</button>
                  <button onClick={() => setWorkspaceView('home')}>Back to overview</button>
                </div>
              </div>

              <div className="introGrid">
                <article><span>1</span><div><b>Choose a category</b><p>Use the navigator on the left to jump to a section when you are ready.</p></div></article>
                <article><span>2</span><div><b>Search or filter</b><p>Search across every category at once, or filter down to what still needs an answer.</p></div></article>
                <article><span>3</span><div><b>Open the first question</b><p>Select a requirement from the list to start entering responses and evidence.</p></div></article>
                <article><span>4</span><div><b>Work through the section</b><p>Answers autosave as you go — submit the category once everything is complete.</p></div></article>
              </div>
            </div> : <>
              <div className="canvasTop">
                <div className="crumbGroup">
                  <span className="navCrumb"><b>{selectedCategory}</b> · Question {selectedIndex + 1} of {categoryRequirements.length}</span>
                  <em className={`categoryStatusChip ${(categorySubmissions[selectedCategory]?.status ?? 'Draft').toLowerCase().replaceAll(' ', '-')}`}>{categorySubmissions[selectedCategory]?.status ?? 'Draft'}</em>
                </div>
                <div className="canvasTopActions">
                  <button className="submitCategoryBtn" onClick={submitCategory}>{categorySubmissions[selectedCategory]?.status === 'Submitted' || categorySubmissions[selectedCategory]?.status === 'Approved' ? 'Resubmit category' : 'Submit category'}</button>
                  <div className="navArrows">
                    <button disabled={selectedIndex === 0} onClick={() => goToRequirement(-1)} aria-label="Previous requirement">←</button>
                    <button disabled={selectedIndex === categoryRequirements.length - 1} onClick={() => goToRequirement(1)} aria-label="Next requirement">→</button>
                  </div>
                </div>
              </div>

              <div className="questionBody">
                <div className="reqQuote"><span>Requirement</span><p>{selectedRequirement.description}</p></div>
                <div className="qHeadRow">
                  <h1>{selectedRequirement.name}</h1>
                  <div className="tagRow">
                    <span className={`tag ${selectedRequirement.priority.toLowerCase()}`}>{selectedRequirement.priority}</span>
                    <span className="tag type">{selectedRequirement.type}</span>
                  </div>
                </div>
                <p className="reqId">{selectedRequirement.id}</p>

                <div className="quickStrip">
                  <fieldset className="quickField">
                    <legend>Level of compliance<small>Select the statement that most accurately reflects the solution&apos;s current capability.</small></legend>
                    <div className="pillGroup">
                      {complianceOptions.map((option, index) => <label key={option.value} className={`pill ${currentAnswer.compliance === option.value ? 'checked' : ''}`} title={option.description}>
                        <input type="radio" name={`compliance-${selectedRequirement.id}`} checked={currentAnswer.compliance === option.value} onChange={() => updateAnswer({ compliance: option.value })}/>
                        <kbd>{index + 1}</kbd>{option.value}<span className="score">{option.score}pt</span>
                      </label>)}
                    </div>
                  </fieldset>

                  <fieldset className="quickField">
                    <legend>Operating mode<small>Select how this capability operates.</small></legend>
                    <div className="pillGroup">
                      {(['Online', 'Offline', 'Both'] as DeliveryMode[]).map((mode) => <label key={mode} className={`pill ${currentAnswer.mode === mode ? 'checked' : ''}`} title={mode === 'Online' ? 'Requires an active connection' : mode === 'Offline' ? 'Operates without an internet connection' : 'Supports online and offline operation'}>
                        <input type="radio" name={`mode-${selectedRequirement.id}`} checked={currentAnswer.mode === mode} onChange={() => updateAnswer({ mode })}/>
                        {mode}
                      </label>)}
                    </div>
                  </fieldset>

                  <fieldset className="quickField">
                    <legend>Is this dependent on other systems?<small>Indicate whether external systems are needed to fulfil the requirement.</small></legend>
                    <div className="pillGroup">
                      {[{ label: 'Yes', value: true }, { label: 'No', value: false }].map((choice) => <label key={choice.label} className={`pill ${currentAnswer.dependsOnOtherSystems === choice.value ? 'checked' : ''}`}>
                        <input type="radio" name={`dependency-${selectedRequirement.id}`} checked={currentAnswer.dependsOnOtherSystems === choice.value} onChange={() => updateAnswer({ dependsOnOtherSystems: choice.value, ...(choice.value ? {} : { dependentSystems: '' }) })}/>
                        {choice.label}
                      </label>)}
                    </div>
                    {currentAnswer.dependsOnOtherSystems && <div className="dependsWrap"><small>List each system needed to fulfil this requirement.</small><textarea value={currentAnswer.dependentSystems} onChange={(event) => updateAnswer({ dependentSystems: event.target.value })} placeholder={'e.g. National ID System\nPayment Gateway\nSMS Gateway'} rows={3}/></div>}
                  </fieldset>
                </div>

                <div className="tabBar">
                  <button className={activeTab === 'response' ? 'active' : ''} onClick={() => setActiveTab('response')}>Evidence &amp; notes</button>
                  <button className={activeTab === 'review' ? 'active' : ''} onClick={() => setActiveTab('review')}>Review{currentAnswer.reviewStatus !== 'Not Reviewed' && <span className={`warnDot ${currentAnswer.reviewStatus === 'Approved' ? 'approved' : 'changes'}`} />}</button>
                  <button className={activeTab === 'discussion' ? 'active' : ''} onClick={() => setActiveTab('discussion')}>Discussion <span className="badge">{currentAnswer.comments.length}</span></button>
                </div>

                <div className={`tabPanel ${activeTab === 'response' ? 'active' : ''}`}>
                  <label className="systemsField evidenceField"><span>Evidence <em>Provide wherever possible</em></span><small>Add screenshots, system documentation, demonstrations, configuration guides, API specifications, or deployment references.</small><textarea value={currentAnswer.evidence} onChange={(event) => updateAnswer({ evidence: event.target.value })} placeholder="Describe the evidence or paste links to supporting documentation" rows={4}/></label>

                  <div className="documentEvidence"><div><b>Supporting documents</b><small>PDF, Word, Excel, images, or other supporting files up to 1.5 MB each.</small></div><label className="uploadButton">＋ Upload documents<input type="file" multiple onChange={uploadEvidence}/></label>{currentAnswer.attachments.length > 0 && <div className="attachmentList">{currentAnswer.attachments.map((attachment) => <div key={attachment.id}><span>▤</span><a href={attachment.dataUrl} download={attachment.name}><b>{attachment.name}</b><small>{Math.max(1, Math.round(attachment.size / 1024))} KB · {new Date(attachment.uploadedAt).toLocaleDateString()}</small></a><button aria-label={`Remove ${attachment.name}`} onClick={() => updateAnswer({ attachments: currentAnswer.attachments.filter((entry) => entry.id !== attachment.id) })}>×</button></div>)}</div>}</div>

                  <label className="systemsField"><span>Assumptions and explanatory notes</span><small>Do not leave fields blank unless information is genuinely unavailable. Record any uncertainty or assumptions here.</small><textarea value={currentAnswer.notes} onChange={(event) => updateAnswer({ notes: event.target.value })} placeholder="Add context, assumptions, limitations, or information that still needs validation" rows={4}/></label>
                </div>

                <div className={`tabPanel ${activeTab === 'review' ? 'active' : ''}`}>
                  {(!categorySubmissions[selectedCategory] || categorySubmissions[selectedCategory].status === 'Draft') ? <div className="reviewLocked">Submit <b>{selectedCategory}</b> before reviewing its requirements. Reviewer decisions apply once every requirement in the category has a complete response.</div> : <div className="reviewCard">
                    <div className="reviewChoice">
                      <button className={`approve ${currentAnswer.reviewStatus === 'Approved' ? 'active' : ''}`} onClick={() => changeReviewStatus('Approved')}>✓ Approve</button>
                      <button className={`request ${currentAnswer.reviewStatus === 'Changes Requested' ? 'active' : ''}`} onClick={() => changeReviewStatus('Changes Requested')}>↺ Request changes</button>
                      {currentAnswer.reviewStatus !== 'Not Reviewed' && <button className="resetReview" onClick={() => changeReviewStatus('Not Reviewed')}>Reset</button>}
                    </div>
                    <label>Reviewer feedback<textarea value={currentAnswer.reviewFeedback} onChange={(event) => updateAnswer({ reviewFeedback: event.target.value })} placeholder="Explain what should be changed or provide review feedback" rows={3}/></label>
                  </div>}
                </div>

                <div className={`tabPanel ${activeTab === 'discussion' ? 'active' : ''}`}>
                  <div className="commentList">{currentAnswer.comments.length === 0 && <p>No discussion yet. Start a conversation about this requirement.</p>}{currentAnswer.comments.map((comment) => <article key={comment.id}><div className="commentAvatar">{comment.author.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div><b>{comment.author}<em>{comment.role}</em></b><small>{new Date(comment.createdAt).toLocaleString()}</small><p>{comment.message}</p></div></article>)}</div>
                  <div className="commentComposer"><textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Add a comment or respond to feedback" rows={3}/><button disabled={!commentDraft.trim()} onClick={addComment}>Post comment</button></div>
                </div>
              </div>

              <div className="canvasFoot">
                <button className="previous" disabled={selectedIndex === 0} onClick={() => goToRequirement(-1)}>← Previous</button>
                <span>{isAnswerComplete(currentAnswer) ? 'Response complete' : 'Complete all required fields'}</span>
                <div className="footBtns">
                  <button className="jumpIncomplete" onClick={jumpToNextIncomplete}>Next incomplete →</button>
                  <button className="nextQuestion" disabled={selectedIndex === categoryRequirements.length - 1} onClick={() => goToRequirement(1)}>Next requirement →</button>
                </div>
              </div>
            </>}
          </div>
          <div className="minimap">
            {categoryRequirements.map((item) => {
              const answer = answers[item.id];
              const cls = selectedRequirement?.id === item.id ? 'current' : isAnswerComplete(answer) ? 'complete' : answer?.reviewStatus === 'Changes Requested' ? 'flagged' : '';
              return <button key={item.id} className={`miniDot ${cls}`} onClick={() => selectRequirement(item.id)} aria-label={item.name}><span className="tip">{item.id.split('-').pop()} · {item.name}</span></button>;
            })}
          </div>
        </div>

        {toast && <div className="toast"><span className="check">✓</span>{toast}</div>}
      </div> : <div className="analyticsPage">
        <div className="analyticsHero"><div><span className="eyebrow">ASSESSMENT ANALYTICS</span><h1>Evaluation overview</h1><p>Live results calculated from completed and reviewed requirement responses.</p></div><div className="analyticsStamp"><b>{account.organization}</b><span>{account.role} assessment</span></div></div>

        <div className="metricGrid">
          <article><span>COMPLETION</span><strong>{Math.round(answered / catalogue.length * 100)}%</strong><p>{answered} of {catalogue.length} requirements</p><div className="metricTrack"><i style={{ width: `${answered / catalogue.length * 100}%` }}/></div></article>
          <article><span>COMPLIANCE SCORE</span><strong>{complianceScore}%</strong><p>Based on {scoredAnswers.length} scored responses</p><div className="metricTrack score"><i style={{ width: `${complianceScore}%` }}/></div></article>
          <article><span>REVIEW PROGRESS</span><strong>{approvedCount}</strong><p>Approved · {changesRequestedCount} changes requested</p></article>
          <article><span>SUPPORTING EVIDENCE</span><strong>{evidenceCount}</strong><p>Documents across {Object.values(answers).filter((answer) => answer.attachments?.length).length} requirements</p></article>
        </div>

        <section className="excelAnalytics"><div className="analyticsTitle"><div><span className="eyebrow">EXCEL ANALYTICS · TABLE 1</span><h2>Weighted Scores</h2><p>Compliance score × requirement priority weight, using the workbook&apos;s maximum possible score.</p></div></div><div className="tableScroll"><table><thead><tr><th>Scope</th><th>Metric</th><th>Must</th><th>Should</th><th>Could</th><th>Total</th><th>Achievement %</th></tr></thead><tbody>{analyticsScopes.map((scope) => <Fragment key={scope.label}><tr><td>{scope.label}</td><td>Max Possible Score</td>{scope.byPriority.map((item) => <td key={item.priority}>{item.max.toFixed(1)}</td>)}<td>{scope.max.toFixed(1)}</td><td>—</td></tr><tr className="achievedRow"><td>{scope.label}</td><td>Achieved Weighted Score</td>{scope.byPriority.map((item) => <td key={item.priority}>{item.achieved.toFixed(1)}</td>)}<td>{scope.achieved.toFixed(1)}</td><td><b>{scope.achievement.toFixed(1)}%</b></td></tr></Fragment>)}</tbody></table></div></section>

        <section className="excelAnalytics"><div className="analyticsTitle"><div><span className="eyebrow">EXCEL ANALYTICS · TABLE 2</span><h2>Level of Compliance by Scope</h2><p>Total, functional, and non-functional response distribution.</p></div></div><div className="tableScroll"><table><thead><tr><th>Scope</th><th>Metric</th>{complianceValues.map((value) => <th key={value}>{value}</th>)}<th>No Response</th><th>Total</th><th>Response Rate %</th></tr></thead><tbody>{analyticsScopes.map((scope) => <Fragment key={scope.label}><tr><td>{scope.label}</td><td>Count</td>{scope.counts.map((count, index) => <td key={complianceValues[index]}>{count}</td>)}<td>{scope.noResponse}</td><td>{scope.requirements.length}</td><td><b>{scope.responseRate.toFixed(1)}%</b></td></tr><tr className="percentRow"><td>{scope.label}</td><td>%</td>{scope.counts.map((count, index) => <td key={complianceValues[index]}>{(count / scope.requirements.length * 100).toFixed(1)}%</td>)}<td>{(scope.noResponse / scope.requirements.length * 100).toFixed(1)}%</td><td>100%</td><td>{scope.responseRate.toFixed(1)}%</td></tr></Fragment>)}</tbody></table></div></section>

        <section className="excelAnalytics"><div className="analyticsTitle"><div><span className="eyebrow">EXCEL ANALYTICS · TABLE 3</span><h2>Online/Offline vs Level of Compliance</h2><p>Operating mode cross-tabulated against compliance responses.</p></div></div><div className="tableScroll"><table><thead><tr><th>Online/Offline</th><th>Metric</th>{complianceValues.map((value) => <th key={value}>{value}</th>)}<th>No Response</th><th>Total</th><th>Response Rate %</th></tr></thead><tbody>{modeAnalytics.map((row) => <tr key={row.label}><td>{row.label}</td><td>Count</td>{row.counts.map((count, index) => <td key={complianceValues[index]}>{count}</td>)}<td>{row.noResponse}</td><td>{row.total}</td><td>{row.responseRate.toFixed(1)}%</td></tr>)}</tbody></table></div></section>

        <section className="excelAnalytics"><div className="analyticsTitle"><div><span className="eyebrow">EXCEL ANALYTICS · TABLE 4</span><h2>Dependent on Other Systems vs Level of Compliance</h2><p>System dependency cross-tabulated against compliance responses.</p></div></div><div className="tableScroll"><table><thead><tr><th>Dependent on other systems</th><th>Metric</th>{complianceValues.map((value) => <th key={value}>{value}</th>)}<th>No Response</th><th>Total</th><th>Response Rate %</th></tr></thead><tbody>{dependencyAnalytics.map((row) => <tr key={row.label}><td>{row.label}</td><td>Count</td>{row.counts.map((count, index) => <td key={complianceValues[index]}>{count}</td>)}<td>{row.noResponse}</td><td>{row.total}</td><td>{row.responseRate.toFixed(1)}%</td></tr>)}</tbody></table></div></section>
      </div>}
    </section>
  </main>;
}
