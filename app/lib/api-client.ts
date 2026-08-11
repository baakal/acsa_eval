/**
 * Typed API client for the ACSA FastAPI backend.
 * Attaches the HS256 access token (signed by next-auth) to every request.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const authHeader = 'Bearer ' + token;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new ApiError(response.status, detail || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ── Workspace ─────────────────────────────────────────────────────────────────

export interface WorkspaceOut {
  user_id: string;
  organization_id: string;
  organization_name: string;
  assessment_id: string;
  assessment_name: string;
  assessment_status: string;
}

export async function bootstrapWorkspace(token: string): Promise<WorkspaceOut> {
  return request<WorkspaceOut>('/api/v1/me/workspace', token, { method: 'POST' });
}

// ── Responses ─────────────────────────────────────────────────────────────────

export interface ResponseOut {
  id: string;
  assessment_id: string;
  requirement_stable_id: string;
  compliance_code: string | null;
  operating_mode: string | null;
  depends_on_systems: boolean | null;
  dependent_systems: string | null;
  evidence_text: string | null;
  notes: string | null;
  is_complete: boolean;
  review_outcome: string | null;
  updated_at: string;
}

export interface ResponseUpsert {
  compliance_code?: string | null;
  operating_mode?: string | null;
  depends_on_systems?: boolean | null;
  dependent_systems?: string | null;
  evidence_text?: string | null;
  notes?: string | null;
  is_complete?: boolean;
  review_outcome?: string | null;
}

export async function listResponses(
  token: string,
  assessmentId: string,
): Promise<ResponseOut[]> {
  return request<ResponseOut[]>(`/api/v1/assessments/${assessmentId}/responses`, token);
}

export async function upsertResponse(
  token: string,
  assessmentId: string,
  requirementStableId: string,
  body: ResponseUpsert,
): Promise<ResponseOut> {
  return request<ResponseOut>(
    `/api/v1/assessments/${assessmentId}/responses/${encodeURIComponent(requirementStableId)}`,
    token,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

// ── Section statuses ──────────────────────────────────────────────────────────

export interface SectionStatusOut {
  id: string;
  assessment_id: string;
  section_stable_id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
}

export interface SectionStatusUpsert {
  status: string;
  submitted_at?: string | null;
}

export async function listSectionStatuses(
  token: string,
  assessmentId: string,
): Promise<SectionStatusOut[]> {
  return request<SectionStatusOut[]>(
    `/api/v1/assessments/${assessmentId}/section-statuses`,
    token,
  );
}

export async function upsertSectionStatus(
  token: string,
  assessmentId: string,
  sectionStableId: string,
  body: SectionStatusUpsert,
): Promise<SectionStatusOut> {
  return request<SectionStatusOut>(
    `/api/v1/assessments/${assessmentId}/section-statuses/${encodeURIComponent(sectionStableId)}`,
    token,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

// ── Admin reporting ────────────────────────────────────────────────────────────

export interface AdminAssessmentSummaryOut {
  id: string;
  organization_id: string;
  organization_name: string;
  country_code: string | null;
  questionnaire_version_id: string;
  name: string;
  status: string;
  due_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  completed_requirements: number;
  total_requirements: number;
  completion_percent: number;
  compliance_score: number;
}

export interface AdminSectionStatusOut {
  section_stable_id: string;
  status: string;
  submitted_at: string | null;
  updated_at: string;
}

export interface AdminAuditEventOut {
  id: string;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  occurred_at: string;
}

export interface AdminAssessmentDetailOut extends AdminAssessmentSummaryOut {
  section_statuses: AdminSectionStatusOut[];
  audit_events: AdminAuditEventOut[];
  total_audit_events: number;
}

export async function listAdminAssessments(token: string): Promise<AdminAssessmentSummaryOut[]> {
  return request<AdminAssessmentSummaryOut[]>('/api/v1/admin/assessments', token);
}

export async function getAdminAssessment(
  token: string,
  assessmentId: string,
): Promise<AdminAssessmentDetailOut> {
  return request<AdminAssessmentDetailOut>(`/api/v1/admin/assessments/${assessmentId}`, token);
}
