import type { ChangeEvent, RefObject } from 'react';
import type { CatalogueItem, FilterKey, RequirementAnswer, ResponseTab } from '../lib/types';
import { isAnswerComplete } from '../lib/scoring';
import { Navigator } from './Navigator';
import { RequirementDetail } from './RequirementDetail';
import type { Account, CategorySubmission } from '../lib/types';

type NavigatorGroup = {
  category: string;
  requirements: CatalogueItem[];
  visible: CatalogueItem[];
  complete: number;
  total: number;
};

type AssessmentViewProps = {
  account: Account;
  answered: number;
  totalRequirements: number;
  categories: string[];
  selectedCategory: string;
  selectedRequirementId: string | null;
  selectedRequirement: CatalogueItem | null;
  categoryRequirements: CatalogueItem[];
  navigatorGroups: NavigatorGroup[];
  answers: Record<string, RequirementAnswer>;
  categorySubmissions: Record<string, CategorySubmission>;
  openCategories: Set<string>;
  search: string;
  filter: FilterKey;
  filterCounts: Record<FilterKey, number>;
  activeTab: ResponseTab;
  commentDraft: string;
  currentAnswer: RequirementAnswer;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: FilterKey) => void;
  onToggleCategory: (category: string) => void;
  onSelectRequirement: (id: string) => void;
  onOpenSelectedCategory: () => void;
  onBackToOverview: () => void;
  onSubmitCategory: () => void;
  onGoToRequirement: (offset: number) => void;
  onJumpToNextIncomplete: () => void;
  onSetActiveTab: (tab: ResponseTab) => void;
  onSetCommentDraft: (value: string) => void;
  onUpdateAnswer: (patch: Partial<RequirementAnswer>) => void;
  onUploadEvidence: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onAddComment: () => void;
  onChangeReviewStatus: (status: RequirementAnswer['reviewStatus']) => void;
};

export function AssessmentView({
  account,
  answered,
  totalRequirements,
  categories,
  selectedCategory,
  selectedRequirementId,
  selectedRequirement,
  categoryRequirements,
  navigatorGroups,
  answers,
  categorySubmissions,
  openCategories,
  search,
  filter,
  filterCounts,
  activeTab,
  commentDraft,
  currentAnswer,
  searchInputRef,
  onSearchChange,
  onFilterChange,
  onToggleCategory,
  onSelectRequirement,
  onOpenSelectedCategory,
  onBackToOverview,
  onSubmitCategory,
  onGoToRequirement,
  onJumpToNextIncomplete,
  onSetActiveTab,
  onSetCommentDraft,
  onUpdateAnswer,
  onUploadEvidence,
  onAddComment,
  onChangeReviewStatus,
}: AssessmentViewProps) {
  const selectedIndex = categoryRequirements.findIndex((item) => item.id === selectedRequirement?.id);

  return (
    <div className="assessment">
      <Navigator
        answered={answered}
        totalRequirements={totalRequirements}
        search={search}
        onSearchChange={onSearchChange}
        searchInputRef={searchInputRef}
        filter={filter}
        onFilterChange={onFilterChange}
        filterCounts={filterCounts}
        navigatorGroups={navigatorGroups}
        openCategories={openCategories}
        selectedCategory={selectedCategory}
        selectedRequirementId={selectedRequirementId}
        answers={answers}
        onToggleCategory={onToggleCategory}
        onSelectRequirement={onSelectRequirement}
        categoriesCount={categories.length}
      />

      <div className="canvasWrap">
        <div className="canvas">
          {!selectedRequirement ? (
            <div className="assessmentIntro questionPane">
              <div className="introCard">
                <span className="eyebrow">ASSESSMENT INTRODUCTION</span>
                <h1>Select a category to begin</h1>
                <p>
                  The navigator on the left is a shortcut for jumping between assessment areas.
                  Start with the overview below, then open a category when you are ready to answer requirements.
                </p>
                <div className="introActions">
                  <button onClick={onOpenSelectedCategory}>Start with {selectedCategory}</button>
                  <button onClick={onBackToOverview}>Back to overview</button>
                </div>
              </div>

              <div className="introGrid">
                <article>
                  <span>1</span>
                  <div>
                    <b>Choose a category</b>
                    <p>Use the navigator on the left to jump to a section when you are ready.</p>
                  </div>
                </article>
                <article>
                  <span>2</span>
                  <div>
                    <b>Search or filter</b>
                    <p>Search across every category at once, or filter down to what still needs an answer.</p>
                  </div>
                </article>
                <article>
                  <span>3</span>
                  <div>
                    <b>Open the first question</b>
                    <p>Select a requirement from the list to start entering responses and evidence.</p>
                  </div>
                </article>
                <article>
                  <span>4</span>
                  <div>
                    <b>Work through the section</b>
                    <p>Answers autosave as you go — submit the category once everything is complete.</p>
                  </div>
                </article>
              </div>
            </div>
          ) : (
            <RequirementDetail
              account={account}
              selectedCategory={selectedCategory}
              categoryRequirements={categoryRequirements}
              selectedRequirement={selectedRequirement}
              selectedIndex={selectedIndex}
              currentAnswer={currentAnswer}
              activeTab={activeTab}
              commentDraft={commentDraft}
              categorySubmission={categorySubmissions[selectedCategory]}
              onSetActiveTab={onSetActiveTab}
              onSetCommentDraft={onSetCommentDraft}
              onUpdateAnswer={onUpdateAnswer}
              onUploadEvidence={onUploadEvidence}
              onSubmitCategory={onSubmitCategory}
              onGoToRequirement={onGoToRequirement}
              onJumpToNextIncomplete={onJumpToNextIncomplete}
              onAddComment={onAddComment}
              onChangeReviewStatus={onChangeReviewStatus}
            />
          )}
        </div>
        <div className="minimap">
          {categoryRequirements.map((item) => {
            const answer = answers[item.id];
            const cls =
              selectedRequirement?.id === item.id
                ? 'current'
                : isAnswerComplete(answer)
                  ? 'complete'
                  : answer?.reviewStatus === 'Changes Requested'
                    ? 'flagged'
                    : '';
            return (
              <button
                key={item.id}
                className={`miniDot ${cls}`}
                onClick={() => onSelectRequirement(item.id)}
                aria-label={item.name}
              >
                <span className="tip">
                  {item.id.split('-').pop()} · {item.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
