import type { ComplianceLevel, WeightedPriority } from './types';

export const MAX_UPLOAD_BYTES = 1_500_000;
export const DATA_EXPORT_VERSION = 1;
export const JSON_EXPORT_PREFIX = 'acsa-evaluation-data';
export const XLSX_EXPORT_PREFIX = 'acsa-evaluation-workbook';
export const XLSX_TEMPLATE_PATH = '/ACSA_evaluation_tool_version_v2.0.11.xlsx';

export const complianceOptions: {
  value: ComplianceLevel;
  description: string;
  score: number;
}[] = [
  {
    value: 'Fully Meets',
    description:
      'Fully supported standard functionality without configuration, customization, or development.',
    score: 2,
  },
  {
    value: 'Meets through Configuration',
    description:
      'Enabled through configuration without software development.',
    score: 2,
  },
  {
    value: 'Customization Required',
    description:
      'Additional development or significant configuration is required.',
    score: 1,
  },
  {
    value: 'Not Available',
    description: 'The requirement is not supported.',
    score: 0,
  },
];

export const priorityWeights: Record<WeightedPriority, number> = {
  Must: 2,
  Should: 1.5,
  Could: 1,
};

export const complianceValues = complianceOptions.map((option) => option.value);
