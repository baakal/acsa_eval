import { complianceOptions, complianceValues, priorityWeights } from './config';
import type {
  CatalogueItem,
  CategoryAnalytics,
  CategorySubmission,
  DeliveryMode,
  DistributionAnalyticsRow,
  RequirementAnswer,
  ScopeAnalytics,
  ScoringSummary,
  WeightedBreakdown,
  WeightedPriority,
} from './types';

const weightedPriorities: WeightedPriority[] = ['Must', 'Should', 'Could'];

export function isAnswerComplete(answer?: RequirementAnswer) {
  return Boolean(
    answer?.compliance &&
      answer.mode &&
      answer.dependsOnOtherSystems !== undefined &&
      (!answer.dependsOnOtherSystems || answer.dependentSystems.trim()),
  );
}

export function getComplianceScoreValue(answer?: RequirementAnswer) {
  return (
    complianceOptions.find((option) => option.value === answer?.compliance)?.score ?? 0
  );
}

export function calculateMaxWeightedScore(catalogue: CatalogueItem[]) {
  return catalogue.reduce(
    (total, requirement) =>
      total + 3 * (priorityWeights[requirement.priority as WeightedPriority] ?? 1),
    0,
  );
}

export function calculateAchievedWeightedScore(
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
) {
  return catalogue.reduce((total, requirement) => {
    const responseScore = getComplianceScoreValue(answers[requirement.id]);
    return total + responseScore * (priorityWeights[requirement.priority as WeightedPriority] ?? 1);
  }, 0);
}

export function calculateComplianceScore(
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
) {
  const max = calculateMaxWeightedScore(catalogue);
  if (!max) return 0;
  return Math.round((calculateAchievedWeightedScore(catalogue, answers) / max) * 100);
}

function buildPriorityBreakdown(
  requirements: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
): WeightedBreakdown[] {
  return weightedPriorities.map((priority) => {
    const scopedRequirements = requirements.filter((item) => item.priority === priority);
    const max = scopedRequirements.length * 3 * priorityWeights[priority];
    const achieved = scopedRequirements.reduce(
      (total, requirement) =>
        total + getComplianceScoreValue(answers[requirement.id]) * priorityWeights[priority],
      0,
    );
    return { priority, max, achieved };
  });
}

export function buildCategoryAnalytics(
  categories: string[],
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
  categorySubmissions: Record<string, CategorySubmission>,
): CategoryAnalytics[] {
  return categories.map((category) => {
    const requirements = catalogue.filter((item) => item.category === category);
    const completed = requirements.filter((item) => isAnswerComplete(answers[item.id])).length;
    const max = calculateMaxWeightedScore(requirements);
    const achieved = calculateAchievedWeightedScore(requirements, answers);
    return {
      category,
      total: requirements.length,
      completed,
      score: max ? Math.round((achieved / max) * 100) : 0,
      status: categorySubmissions[category]?.status ?? 'Draft',
    };
  });
}

export function buildScopeAnalytics(
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
): ScopeAnalytics[] {
  return [
    { label: 'Total (Functional + Non-functional)', requirements: catalogue },
    {
      label: 'Functional',
      requirements: catalogue.filter((item) => item.type === 'Functional'),
    },
    {
      label: 'Non-functional',
      requirements: catalogue.filter((item) => item.type === 'Non-functional'),
    },
  ].map((scope) => {
    const byPriority = buildPriorityBreakdown(scope.requirements, answers);
    const max = byPriority.reduce((total, item) => total + item.max, 0);
    const achieved = byPriority.reduce((total, item) => total + item.achieved, 0);
    const counts = complianceValues.map(
      (compliance) =>
        scope.requirements.filter((item) => answers[item.id]?.compliance === compliance).length,
    );
    const noResponse = scope.requirements.filter((item) => !answers[item.id]?.compliance).length;
    return {
      ...scope,
      byPriority,
      max,
      achieved,
      achievement: max ? (achieved / max) * 100 : 0,
      counts,
      noResponse,
      responseRate: scope.requirements.length
        ? ((scope.requirements.length - noResponse) / scope.requirements.length) * 100
        : 0,
    };
  });
}

export function buildModeAnalytics(
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
): DistributionAnalyticsRow[] {
  return ([...(['Online', 'Offline', 'Both'] as DeliveryMode[]), 'No Response'] as const).map(
    (mode) => {
      const requirements = catalogue.filter((item) =>
        mode === 'No Response' ? !answers[item.id]?.mode : answers[item.id]?.mode === mode,
      );
      const counts = complianceValues.map(
        (compliance) =>
          requirements.filter((item) => answers[item.id]?.compliance === compliance).length,
      );
      const noResponse = requirements.filter((item) => !answers[item.id]?.compliance).length;
      return {
        label: mode,
        counts,
        noResponse,
        total: requirements.length,
        responseRate: requirements.length
          ? ((requirements.length - noResponse) / requirements.length) * 100
          : 0,
      };
    },
  );
}

export function buildDependencyAnalytics(
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
): DistributionAnalyticsRow[] {
  return (['Yes', 'No', 'No Response'] as const).map((dependency) => {
    const requirements = catalogue.filter((item) =>
      dependency === 'No Response'
        ? answers[item.id]?.dependsOnOtherSystems === undefined
        : answers[item.id]?.dependsOnOtherSystems === (dependency === 'Yes'),
    );
    const counts = complianceValues.map(
      (compliance) =>
        requirements.filter((item) => answers[item.id]?.compliance === compliance).length,
    );
    const noResponse = requirements.filter((item) => !answers[item.id]?.compliance).length;
    return {
      label: dependency,
      counts,
      noResponse,
      total: requirements.length,
      responseRate: requirements.length
        ? ((requirements.length - noResponse) / requirements.length) * 100
        : 0,
    };
  });
}

export function buildScoringSummary(
  categories: string[],
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
  categorySubmissions: Record<string, CategorySubmission>,
): ScoringSummary {
  const scoredAnswers = Object.values(answers).filter((answer) => answer.compliance);
  const maxWeightedScore = calculateMaxWeightedScore(catalogue);
  const achievedWeightedScore = calculateAchievedWeightedScore(catalogue, answers);
  return {
    answered: Object.values(answers).filter(isAnswerComplete).length,
    scoredAnswers,
    maxWeightedScore,
    achievedWeightedScore,
    complianceScore: maxWeightedScore ? Math.round((achievedWeightedScore / maxWeightedScore) * 100) : 0,
    approvedCount: Object.values(answers).filter((answer) => answer.reviewStatus === 'Approved').length,
    changesRequestedCount: Object.values(answers).filter((answer) => answer.reviewStatus === 'Changes Requested').length,
    evidenceCount: Object.values(answers).reduce(
      (total, answer) => total + (answer.attachments?.length ?? 0),
      0,
    ),
    categoryAnalytics: buildCategoryAnalytics(categories, catalogue, answers, categorySubmissions),
    analyticsScopes: buildScopeAnalytics(catalogue, answers),
    modeAnalytics: buildModeAnalytics(catalogue, answers),
    dependencyAnalytics: buildDependencyAnalytics(catalogue, answers),
  };
}
