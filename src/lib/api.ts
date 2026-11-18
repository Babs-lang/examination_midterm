import type {
  AuditLogEntry,
  AuthUser,
  DashboardSummary,
  ScholarAssignment,
  ScholarshipProgram,
  SemesterSubmission,
  SyntheticAccountOption,
} from '../types';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof payload.error === 'string' ? payload.error : `Request failed with HTTP ${response.status}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return payload as T;
}

export const api = {
  getMe: () => requestJson<{ user: AuthUser | null }>('/api/auth/me'),
  getSyntheticAccounts: () =>
    requestJson<{ accounts: SyntheticAccountOption[] }>('/api/auth/synthetic-accounts'),
  syntheticLogin: (accountCode: string) =>
    requestJson<{ user: AuthUser }>('/api/auth/synthetic-login', {
      method: 'POST',
      body: JSON.stringify({ accountCode }),
    }),
  login: (email: string, password: string) =>
    requestJson<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (payload: { email: string; password: string; fullName: string; programId: string }) =>
    requestJson<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  getPrograms: () => requestJson<{ programs: ScholarshipProgram[] }>('/api/programs'),
  updateProgram: (id: string, body: Partial<ScholarshipProgram>) =>
    requestJson<{ program: ScholarshipProgram }>(`/api/programs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  getScholars: () => requestJson<{ scholars: ScholarAssignment[] }>('/api/scholars'),
  createScholar: (body: {
    scholar_code: string;
    student_number: string;
    full_name: string;
    email: string;
    program_id: string;
  }) =>
    requestJson<{ scholar: ScholarAssignment }>('/api/scholars', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateScholarProgram: (scholarCode: string, program_id: string) =>
    requestJson<{ scholar: ScholarAssignment }>(`/api/scholars/${encodeURIComponent(scholarCode)}/program`, {
      method: 'PATCH',
      body: JSON.stringify({ program_id }),
    }),

  getDashboard: (academicYear: string, semester: number) =>
    requestJson<{ summary: DashboardSummary }>(
      `/api/dashboard?academicYear=${encodeURIComponent(academicYear)}&semester=${semester}`
    ),

  getSubmissions: (params: {
    academicYear?: string;
    semester?: number;
    search?: string;
    programId?: string;
    complianceStatus?: string;
    verificationStatus?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params.academicYear) sp.set('academicYear', params.academicYear);
    if (params.semester) sp.set('semester', String(params.semester));
    if (params.search) sp.set('search', params.search);
    if (params.programId) sp.set('programId', params.programId);
    if (params.complianceStatus) sp.set('complianceStatus', params.complianceStatus);
    if (params.verificationStatus) sp.set('verificationStatus', params.verificationStatus);
    return requestJson<{ submissions: SemesterSubmission[] }>(`/api/submissions?${sp.toString()}`);
  },

  createSubmission: (body: {
    scholar_code?: string;
    academic_year: string;
    semester: number;
    gwa: number;
    enrolled_units: number;
    failed_count: number;
    incomplete_count: number;
    dropped_count: number;
    evidence_ref: string;
  }) =>
    requestJson<{ submission: SemesterSubmission }>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  resubmitSubmission: (
    id: string,
    body: {
      gwa: number;
      enrolled_units: number;
      failed_count: number;
      incomplete_count: number;
      dropped_count: number;
      evidence_ref: string;
      correction_note?: string;
    }
  ) =>
    requestJson<{ submission: SemesterSubmission }>(`/api/submissions/${encodeURIComponent(id)}/resubmit`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  verifySubmission: (id: string, decision: 'Verified' | 'Returned', reason: string) =>
    requestJson<{ submission: SemesterSubmission }>(`/api/submissions/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ decision, reason }),
    }),

  evaluateSubmission: (id: string) =>
    requestJson<{ submission: SemesterSubmission }>(`/api/submissions/${encodeURIComponent(id)}/evaluate`, {
      method: 'POST',
    }),

  recordDecision: (id: string, decision: 'Approved' | 'Held', notes: string) =>
    requestJson<{ submission: SemesterSubmission }>(`/api/submissions/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    }),

  getAuditLogs: (submissionId?: string) =>
    requestJson<{ logs: AuditLogEntry[] }>(
      submissionId ? `/api/audit-logs?submissionId=${encodeURIComponent(submissionId)}` : '/api/audit-logs'
    ),

  resetSeedData: () => requestJson<{ ok: boolean; message: string }>('/api/admin/reset-seed', { method: 'POST' }),

  runTestSuite: () =>
    requestJson<{
      executedAt: string;
      passedCount: number;
      totalCount: number;
      results: Array<{
        testId: string;
        name: string;
        inputOrAction: string;
        expectedResult: string;
        actualResult: string;
        passed: boolean;
        evidenceRef: string;
      }>;
    }>('/api/tests/run-suite', { method: 'POST' }),
};
