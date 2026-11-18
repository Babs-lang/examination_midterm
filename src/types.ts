export type UserRole = 'scholar' | 'staff';

export type VerificationStatus = 'Pending Verification' | 'Verified' | 'Returned';
export type ComplianceStatus = 'Not Evaluated' | 'Compliant' | 'With Deficiency';
export type RenewalDecision = 'Pending' | 'Approved' | 'Held';
export type AwardStatus = 'Active' | 'Renewed' | 'Held';

export interface AuthUser {
  id: string;
  accountCode?: string;
  email: string;
  fullName: string;
  role: UserRole;
  scholarCode: string | null;
  studentNumber: string | null;
}

export interface ScholarshipProgram {
  id: string;
  name: string;
  max_gwa: number;
  min_units: number;
  allowed_failed: number;
  allowed_incomplete: number;
  allowed_dropped: number;
  required_evidence: string;
  deadline_iso: string;
  updated_at: string;
}

export interface ScholarAssignment {
  scholar_code: string;
  student_number: string;
  full_name: string;
  email: string;
  program_id: string;
  program_name: string;
  award_status: AwardStatus;
  created_at: string;
}

export interface PolicyCheckResult {
  rule: string;
  expected: string;
  actual: string;
  passed: boolean;
  reason?: string;
}

export interface SemesterSubmission {
  id: string;
  scholar_code: string;
  student_number: string;
  scholar_name: string;
  program_id: string;
  program_name: string;
  award_status: AwardStatus;
  academic_year: string;
  semester: number;
  gwa: number;
  enrolled_units: number;
  failed_count: number;
  incomplete_count: number;
  dropped_count: number;
  evidence_ref: string;
  submitted_at: string;
  verification_status: VerificationStatus;
  compliance_status: ComplianceStatus;
  deficiency_reasons: string[];
  policy_checks: PolicyCheckResult[];
  renewal_decision: RenewalDecision;
  decision_notes: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  submission_id: string;
  scholar_code: string;
  actor_name: string;
  actor_role: UserRole | 'system';
  action_type: string;
  previous_state: string;
  new_state: string;
  notes: string;
  created_at: string;
}

export interface DashboardSummary {
  academic_year: string;
  semester: number;
  total_assigned_scholars: number;
  total_submissions: number;
  pending_verification: number;
  verified_count: number;
  returned_count: number;
  compliant: number;
  with_deficiency: number;
  not_evaluated: number;
  approved_renewals: number;
  held_renewals: number;
}

export interface SyntheticAccountOption {
  accountCode: string;
  email: string;
  fullName: string;
  role: UserRole;
  scholarCode: string | null;
  programName: string | null;
}
