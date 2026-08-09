import catalogue from '../catalogue.json';

export type AccountRole = 'Country' | 'Solution Provider';

export type Account = {
  id: string;
  role: AccountRole;
  name: string;
  email: string;
  organization: string;
  country: string;
  passwordHash: string;
};

export type ComplianceLevel =
  | 'Fully Meets'
  | 'Meets through Configuration'
  | 'Customization Required'
  | 'Not Available';

export type DeliveryMode = 'Online' | 'Offline' | 'Both';
export type ReviewStatus = 'Not Reviewed' | 'Approved' | 'Changes Requested';

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  dataUrl: string;
};

export type DiscussionComment = {
  id: string;
  author: string;
  role: string;
  message: string;
  createdAt: string;
};

export type RequirementAnswer = {
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

export type CategorySubmission = {
  status: 'Draft' | 'Submitted' | 'Changes Requested' | 'Approved';
  submittedAt?: string;
};

export type FilterKey = 'all' | 'incomplete' | 'flagged' | 'complete';
export type ResponseTab = 'response' | 'review' | 'discussion';
export type CatalogueItem = (typeof catalogue)[number];

export type CategoryAnalytics = {
  category: string;
  total: number;
  completed: number;
  score: number;
  status: CategorySubmission['status'];
};

export type WeightedPriority = 'Must' | 'Should' | 'Could';

export type WeightedBreakdown = {
  priority: WeightedPriority;
  max: number;
  achieved: number;
};

export type ScopeAnalytics = {
  label: string;
  requirements: CatalogueItem[];
  byPriority: WeightedBreakdown[];
  max: number;
  achieved: number;
  achievement: number;
  counts: number[];
  noResponse: number;
  responseRate: number;
};

export type DistributionAnalyticsRow = {
  label: string;
  counts: number[];
  noResponse: number;
  total: number;
  responseRate: number;
};

export type ScoringSummary = {
  answered: number;
  scoredAnswers: RequirementAnswer[];
  maxWeightedScore: number;
  achievedWeightedScore: number;
  complianceScore: number;
  approvedCount: number;
  changesRequestedCount: number;
  evidenceCount: number;
  categoryAnalytics: CategoryAnalytics[];
  analyticsScopes: ScopeAnalytics[];
  modeAnalytics: DistributionAnalyticsRow[];
  dependencyAnalytics: DistributionAnalyticsRow[];
};

export type PortableAccountMetadata = Omit<Account, 'passwordHash'>;

export type PortableDataFile = {
  formatVersion: number;
  exportedAt: string;
  account: PortableAccountMetadata;
  answers: Record<string, RequirementAnswer>;
  categorySubmissions: Record<string, CategorySubmission>;
};

export type ImportSummary = {
  answersFound: number;
  submissionsFound: number;
  answerChanges: number;
  submissionChanges: number;
};
