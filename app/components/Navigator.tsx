import type { RefObject } from 'react';
import type { FilterKey, CatalogueItem, RequirementAnswer } from '../lib/types';
import { isAnswerComplete } from '../lib/scoring';

type NavigatorGroup = {
  category: string;
  requirements: CatalogueItem[];
  visible: CatalogueItem[];
  complete: number;
  total: number;
};

type NavigatorProps = {
  answered: number;
  totalRequirements: number;
  search: string;
  onSearchChange: (value: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  filter: FilterKey;
  onFilterChange: (filter: FilterKey) => void;
  filterCounts: Record<FilterKey, number>;
  navigatorGroups: NavigatorGroup[];
  openCategories: Set<string>;
  selectedCategory: string;
  selectedRequirementId: string | null;
  answers: Record<string, RequirementAnswer>;
  onToggleCategory: (category: string) => void;
  onSelectRequirement: (id: string) => void;
  categoriesCount: number;
};

export function Navigator({
  answered,
  totalRequirements,
  search,
  onSearchChange,
  searchInputRef,
  filter,
  onFilterChange,
  filterCounts,
  navigatorGroups,
  openCategories,
  selectedCategory,
  selectedRequirementId,
  answers,
  onToggleCategory,
  onSelectRequirement,
  categoriesCount,
}: NavigatorProps) {
  return (
    <div className="navigator">
      <div className="navHead">
        <h2>
          Requirements <span>{answered}/{totalRequirements}</span>
        </h2>
        <label className="searchBox">
          <span>⌕</span>
          <input
            ref={searchInputRef}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search all categories…"
          />
          <kbd>/</kbd>
        </label>
        <div className="filterChips">
          {([
            { key: 'all', label: 'All' },
            { key: 'incomplete', label: 'Incomplete' },
            { key: 'flagged', label: 'Flagged' },
            { key: 'complete', label: 'Complete' },
          ] as { key: FilterKey; label: string }[]).map((chip) => (
            <button
              key={chip.key}
              className={filter === chip.key ? 'active' : ''}
              onClick={() => onFilterChange(chip.key)}
            >
              {chip.label} <em>{filterCounts[chip.key]}</em>
            </button>
          ))}
        </div>
      </div>
      <div className="navList">
        {navigatorGroups.map((group) => {
          if (search.trim() && group.visible.length === 0) return null;
          const isOpen = openCategories.has(group.category) || Boolean(search.trim());
          const pct = group.total ? Math.round((group.complete / group.total) * 100) : 0;
          return (
            <div
              key={group.category}
              className={`catGroup ${isOpen ? 'open' : ''} ${
                selectedCategory === group.category ? 'active' : ''
              }`}
            >
              <button
                className="catHead"
                onClick={() => onToggleCategory(group.category)}
                title={group.category}
              >
                <span
                  className="ring"
                  style={{
                    background: `conic-gradient(${
                      pct === 100 ? 'var(--success)' : 'var(--blue)'
                    } ${pct * 3.6}deg, var(--line) 0deg)`,
                  }}
                />
                <span className="label">{group.category}</span>
                <span className="count">
                  {group.complete}/{group.total}
                </span>
                <span className="chev">›</span>
              </button>
              <div className="reqRows">
                {group.visible.map((item) => {
                  const answer = answers[item.id];
                  const complete = isAnswerComplete(answer);
                  const flagged = answer?.reviewStatus === 'Changes Requested';
                  return (
                    <button
                      key={item.id}
                      className={`reqRow ${selectedRequirementId === item.id ? 'selected' : ''}`}
                      onClick={() => onSelectRequirement(item.id)}
                    >
                      <span className={`reqStatusDot ${complete ? 'complete' : flagged ? 'flagged' : ''}`}>
                        {complete ? '✓' : ''}
                      </span>
                      <span className="name">{item.name}</span>
                      <span className={`reqPriorityDot ${item.priority.toLowerCase()}`} />
                    </button>
                  );
                })}
                {group.visible.length === 0 && <p className="navNoResults">No matches in this category.</p>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="navFoot">
        <span>{categoriesCount} categories</span>
        <span>↑ ↓ to move</span>
      </div>
    </div>
  );
}
