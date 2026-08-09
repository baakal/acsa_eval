import * as XLSX from 'xlsx';
import {
  DATA_EXPORT_VERSION,
  JSON_EXPORT_PREFIX,
  XLSX_EXPORT_PREFIX,
  XLSX_TEMPLATE_PATH,
  complianceValues,
  priorityWeights,
} from './config';
import { getComplianceScoreValue } from './scoring';
import type {
  Attachment,
  CatalogueItem,
  CategorySubmission,
  DiscussionComment,
  ImportSummary,
  PortableAccountMetadata,
  PortableDataFile,
  RequirementAnswer,
  ScoringSummary,
  SessionAccount,
  WeightedPriority,
} from './types';

function toTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:]/g, '-').replace(/\.\d+Z$/, 'Z');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isAttachment(value: unknown): value is Attachment {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.type) &&
    typeof value.size === 'number' &&
    isString(value.uploadedAt) &&
    isString(value.dataUrl)
  );
}

function isComment(value: unknown): value is DiscussionComment {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.author) &&
    isString(value.role) &&
    isString(value.message) &&
    isString(value.createdAt)
  );
}

function parseRequirementAnswer(value: unknown): RequirementAnswer | null {
  if (!isRecord(value)) return null;
  const attachments = value.attachments ?? [];
  const comments = value.comments ?? [];
  if (value.compliance !== undefined && !complianceValues.includes(value.compliance as never)) {
    return null;
  }
  if (
    value.mode !== undefined &&
    !(['Online', 'Offline', 'Both'] as const).includes(value.mode as never)
  ) {
    return null;
  }
  if (
    value.reviewStatus !== undefined &&
    !(['Not Reviewed', 'Approved', 'Changes Requested'] as const).includes(
      value.reviewStatus as never,
    )
  ) {
    return null;
  }
  if (
    value.dependsOnOtherSystems !== undefined &&
    typeof value.dependsOnOtherSystems !== 'boolean'
  ) {
    return null;
  }
  if (
    !isString(value.dependentSystems ?? '') ||
    !isString(value.evidence ?? '') ||
    !isString(value.notes ?? '') ||
    !isString(value.reviewFeedback ?? '')
  ) {
    return null;
  }
  if (
    !Array.isArray(attachments) ||
    !attachments.every(isAttachment) ||
    !Array.isArray(comments) ||
    !comments.every(isComment)
  ) {
    return null;
  }
  return {
    compliance: value.compliance as RequirementAnswer['compliance'],
    mode: value.mode as RequirementAnswer['mode'],
    dependsOnOtherSystems: value.dependsOnOtherSystems as
      | RequirementAnswer['dependsOnOtherSystems']
      | undefined,
    dependentSystems: String(value.dependentSystems ?? ''),
    evidence: String(value.evidence ?? ''),
    notes: String(value.notes ?? ''),
    attachments: attachments as Attachment[],
    comments: comments as DiscussionComment[],
    reviewStatus: (value.reviewStatus as RequirementAnswer['reviewStatus']) ?? 'Not Reviewed',
    reviewFeedback: String(value.reviewFeedback ?? ''),
  };
}

function isPortableAccountMetadata(value: unknown): value is PortableAccountMetadata {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.role) &&
    isString(value.name) &&
    isString(value.email) &&
    isString(value.organization) &&
    isString(value.country)
  );
}

function getPortableAccount(account: SessionAccount): PortableAccountMetadata {
  return {
    id: account.id,
    role: account.role,
    name: account.name,
    email: account.email,
    organization: account.organization,
    country: account.country,
  };
}

export function buildPortableDataFile(
  account: SessionAccount,
  answers: Record<string, RequirementAnswer>,
  categorySubmissions: Record<string, CategorySubmission>,
): PortableDataFile {
  return {
    formatVersion: DATA_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    account: getPortableAccount(account),
    answers,
    categorySubmissions,
  };
}

export function exportPortableData(
  account: SessionAccount,
  answers: Record<string, RequirementAnswer>,
  categorySubmissions: Record<string, CategorySubmission>,
) {
  const file = buildPortableDataFile(account, answers, categorySubmissions);
  downloadBlob(
    new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
    `${JSON_EXPORT_PREFIX}-${toTimestamp()}.json`,
  );
}

export async function readPortableDataFile(file: File) {
  return JSON.parse(await file.text()) as unknown;
}

export function validatePortableDataFile(
  value: unknown,
  validRequirementIds: Set<string>,
  validCategories: Set<string>,
): { valid: true; data: PortableDataFile } | { valid: false; error: string } {
  if (!isRecord(value)) {
    return { valid: false, error: 'The selected file does not contain a JSON object.' };
  }
  if (typeof value.formatVersion !== 'number') {
    return { valid: false, error: 'Missing or invalid formatVersion.' };
  }
  if (!isString(value.exportedAt) || !isPortableAccountMetadata(value.account)) {
    return { valid: false, error: 'Missing or invalid account metadata.' };
  }
  if (!isRecord(value.answers) || !isRecord(value.categorySubmissions)) {
    return { valid: false, error: 'Missing answers or category submissions.' };
  }

  const answers: Record<string, RequirementAnswer> = {};
  for (const [requirementId, answer] of Object.entries(value.answers)) {
    if (!validRequirementIds.has(requirementId)) {
      return { valid: false, error: `Unknown requirement ID: ${requirementId}` };
    }
    const parsed = parseRequirementAnswer(answer);
    if (!parsed) {
      return { valid: false, error: `Invalid answer payload for ${requirementId}.` };
    }
    answers[requirementId] = parsed;
  }

  const categorySubmissions: Record<string, CategorySubmission> = {};
  for (const [category, submission] of Object.entries(value.categorySubmissions)) {
    if (!validCategories.has(category)) {
      return { valid: false, error: `Unknown category: ${category}` };
    }
    if (
      !isRecord(submission) ||
      !(['Draft', 'Submitted', 'Changes Requested', 'Approved'] as const).includes(
        submission.status as never,
      ) ||
      (submission.submittedAt !== undefined && !isString(submission.submittedAt))
    ) {
      return { valid: false, error: `Invalid category submission for ${category}.` };
    }
    categorySubmissions[category] = {
      status: submission.status as CategorySubmission['status'],
      submittedAt: submission.submittedAt as string | undefined,
    };
  }

  return {
    valid: true,
    data: {
      formatVersion: value.formatVersion,
      exportedAt: value.exportedAt,
      account: value.account,
      answers,
      categorySubmissions,
    },
  };
}

export function summarizePortableImport(
  currentAnswers: Record<string, RequirementAnswer>,
  currentCategorySubmissions: Record<string, CategorySubmission>,
  incoming: PortableDataFile,
): ImportSummary {
  const answerChanges = Object.entries(incoming.answers).filter(
    ([key, value]) => JSON.stringify(currentAnswers[key] ?? null) !== JSON.stringify(value),
  ).length;
  const submissionChanges = Object.entries(incoming.categorySubmissions).filter(
    ([key, value]) =>
      JSON.stringify(currentCategorySubmissions[key] ?? null) !== JSON.stringify(value),
  ).length;

  return {
    answersFound: Object.keys(incoming.answers).length,
    submissionsFound: Object.keys(incoming.categorySubmissions).length,
    answerChanges,
    submissionChanges,
  };
}

function setCell(sheet: XLSX.WorkSheet, address: string, value: string | number | undefined) {
  const existing = sheet[address] ?? {};
  if (typeof value === 'number') {
    sheet[address] = { ...existing, t: 'n', v: value };
    return;
  }
  sheet[address] = { ...existing, t: 's', v: value ?? '' };
}

function setPercent(sheet: XLSX.WorkSheet, address: string, percent: number | undefined) {
  setCell(sheet, address, percent === undefined ? undefined : percent / 100);
}

function updateSummarySheet(summarySheet: XLSX.WorkSheet, catalogue: CatalogueItem[]) {
  setCell(summarySheet, 'B2', catalogue.length);
  setCell(
    summarySheet,
    'B3',
    catalogue.filter((item) => item.type === 'Functional').length,
  );
  setCell(
    summarySheet,
    'B4',
    catalogue.filter((item) => item.type === 'Non-functional').length,
  );
}

function updateMasterSheet(
  masterSheet: XLSX.WorkSheet,
  account: SessionAccount,
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
) {
  setCell(
    masterSheet,
    'B4',
    [account.organization, account.country].filter(Boolean).join(' — ') || account.name,
  );
  setCell(masterSheet, 'B5', account.name);
  setCell(masterSheet, 'B6', account.email);
  setCell(masterSheet, 'B7', account.country);
  setCell(masterSheet, 'N12', 'Evidence');
  setCell(masterSheet, 'O12', 'Notes');
  setCell(masterSheet, 'P12', 'Attachments');
  setCell(masterSheet, 'Q12', 'Review Status');
  setCell(masterSheet, 'R12', 'Review Feedback');
  setCell(masterSheet, 'S12', 'Comments');

  const rowById = new Map<string, number>();
  for (let row = 13; row < 13 + catalogue.length; row += 1) {
    const requirementId = masterSheet[`A${row}`]?.v;
    if (typeof requirementId === 'string') {
      rowById.set(requirementId, row);
    }
  }

  for (const requirement of catalogue) {
    const row = rowById.get(requirement.id);
    if (!row) continue;
    const answer = answers[requirement.id];
    const score = getComplianceScoreValue(answer);
    const weight = priorityWeights[requirement.priority as WeightedPriority] ?? 1;
    setCell(masterSheet, `G${row}`, answer?.compliance);
    setCell(masterSheet, `H${row}`, answer?.mode);
    setCell(
      masterSheet,
      `I${row}`,
      answer?.dependsOnOtherSystems === undefined
        ? ''
        : answer.dependsOnOtherSystems
          ? 'Yes'
          : 'No',
    );
    setCell(masterSheet, `J${row}`, answer?.dependentSystems);
    setCell(masterSheet, `K${row}`, answer?.compliance ? score : undefined);
    setCell(masterSheet, `L${row}`, weight);
    setCell(masterSheet, `M${row}`, answer?.compliance ? score * weight : undefined);
    setCell(masterSheet, `N${row}`, answer?.evidence);
    setCell(masterSheet, `O${row}`, answer?.notes);
    setCell(
      masterSheet,
      `P${row}`,
      answer?.attachments.map((attachment) => attachment.name).join(', '),
    );
    setCell(masterSheet, `Q${row}`, answer?.reviewStatus);
    setCell(masterSheet, `R${row}`, answer?.reviewFeedback);
    setCell(
      masterSheet,
      `S${row}`,
      answer?.comments
        .map((comment) => `${comment.author} (${comment.role}) — ${comment.message}`)
        .join('\n'),
    );
  }
}

function updateWeightedScoresSheet(analyticsSheet: XLSX.WorkSheet, summary: ScoringSummary) {
  const rows = [
    { row: 3, scope: summary.analyticsScopes[0], metric: 'max' },
    { row: 4, scope: summary.analyticsScopes[0], metric: 'achieved' },
    { row: 5, scope: summary.analyticsScopes[1], metric: 'max' },
    { row: 6, scope: summary.analyticsScopes[1], metric: 'achieved' },
    { row: 7, scope: summary.analyticsScopes[2], metric: 'max' },
    { row: 8, scope: summary.analyticsScopes[2], metric: 'achieved' },
  ] as const;

  for (const { row, scope, metric } of rows) {
    scope.byPriority.forEach((item, index) => {
      setCell(
        analyticsSheet,
        `${String.fromCharCode(67 + index)}${row}`,
        metric === 'max' ? item.max : item.achieved,
      );
    });
    setCell(analyticsSheet, `F${row}`, metric === 'max' ? scope.max : scope.achieved);
    if (metric === 'achieved') {
      setPercent(analyticsSheet, `G${row}`, scope.achievement);
    }
  }
}

function updateDistributionRows(
  analyticsSheet: XLSX.WorkSheet,
  startRow: number,
  rows: { label: string; counts: number[]; noResponse: number; total: number; responseRate: number }[],
) {
  for (const [index, row] of rows.entries()) {
    const countRow = startRow + index * 2;
    const total = row.total || 1;
    row.counts.forEach((count, countIndex) => {
      setCell(analyticsSheet, `${String.fromCharCode(67 + countIndex)}${countRow}`, count);
      setPercent(
        analyticsSheet,
        `${String.fromCharCode(67 + countIndex)}${countRow + 1}`,
        total ? (count / total) * 100 : 0,
      );
    });
    setCell(analyticsSheet, `G${countRow}`, row.noResponse);
    setPercent(analyticsSheet, `G${countRow + 1}`, total ? (row.noResponse / total) * 100 : 0);
    setCell(analyticsSheet, `H${countRow}`, row.total);
    setCell(analyticsSheet, `H${countRow + 1}`, 1);
    setPercent(analyticsSheet, `I${countRow}`, row.responseRate);
    setPercent(analyticsSheet, `I${countRow + 1}`, row.responseRate);
  }
}

function updateAnalyticsSheet(analyticsSheet: XLSX.WorkSheet, summary: ScoringSummary) {
  updateWeightedScoresSheet(analyticsSheet, summary);
  updateDistributionRows(
    analyticsSheet,
    13,
    summary.analyticsScopes.map((scope) => ({
      label: scope.label,
      counts: scope.counts,
      noResponse: scope.noResponse,
      total: scope.requirements.length,
      responseRate: scope.responseRate,
    })),
  );
  updateDistributionRows(analyticsSheet, 23, summary.modeAnalytics);
  updateDistributionRows(analyticsSheet, 35, summary.dependencyAnalytics);
}

export async function exportWorkbook(
  account: SessionAccount,
  catalogue: CatalogueItem[],
  answers: Record<string, RequirementAnswer>,
  summary: ScoringSummary,
) {
  const response = await fetch(XLSX_TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error('The workbook template could not be loaded.');
  }
  const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array', cellStyles: true });
  const masterSheet = workbook.Sheets['Master Requirements Catalogue'];
  const summarySheet = workbook.Sheets['Catalogue Summary'];
  const analyticsSheet = workbook.Sheets.Analytics;
  if (!masterSheet || !summarySheet || !analyticsSheet) {
    throw new Error('The workbook template is missing required sheets.');
  }

  updateMasterSheet(masterSheet, account, catalogue, answers);
  updateSummarySheet(summarySheet, catalogue);
  updateAnalyticsSheet(analyticsSheet, summary);

  const output = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([output], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${XLSX_EXPORT_PREFIX}-${toTimestamp()}.xlsx`,
  );
}
