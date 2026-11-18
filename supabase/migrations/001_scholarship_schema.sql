-- ============================================================================
-- AcadGrant: Student Scholarship Monitoring & Academic Compliance System
-- Supabase PostgreSQL Migration & Row-Level Security (RLS) Policies
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. User Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('scholar', 'staff')),
  student_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Scholarship Programs & Policy Thresholds
CREATE TABLE IF NOT EXISTS public.scholarship_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  max_gwa NUMERIC(3, 2) NOT NULL CHECK (max_gwa >= 1.00 AND max_gwa <= 5.00),
  min_units INTEGER NOT NULL CHECK (min_units >= 0),
  allowed_failed INTEGER NOT NULL CHECK (allowed_failed >= 0),
  allowed_incomplete INTEGER NOT NULL CHECK (allowed_incomplete >= 0),
  allowed_dropped INTEGER NOT NULL CHECK (allowed_dropped >= 0),
  required_evidence TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Scholar Assignments
CREATE TABLE IF NOT EXISTS public.scholar_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_code TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  student_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  program_id TEXT NOT NULL REFERENCES public.scholarship_programs(id),
  award_status TEXT NOT NULL DEFAULT 'Active' CHECK (award_status IN ('Active', 'Renewed', 'Held')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Semester Submissions (Unique per Scholar + Academic Year + Semester)
CREATE TABLE IF NOT EXISTS public.semester_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_code TEXT NOT NULL REFERENCES public.scholar_assignments(scholar_code) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  semester INTEGER NOT NULL CHECK (semester IN (1, 2, 3)),
  gwa NUMERIC(3, 2) NOT NULL CHECK (gwa >= 1.00 AND gwa <= 5.00),
  enrolled_units INTEGER NOT NULL CHECK (enrolled_units >= 0),
  failed_count INTEGER NOT NULL CHECK (failed_count >= 0),
  incomplete_count INTEGER NOT NULL CHECK (incomplete_count >= 0),
  dropped_count INTEGER NOT NULL CHECK (dropped_count >= 0),
  evidence_ref TEXT NOT NULL CHECK (LENGTH(TRIM(evidence_ref)) > 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_status TEXT NOT NULL DEFAULT 'Pending Verification'
    CHECK (verification_status IN ('Pending Verification', 'Verified', 'Returned')),
  compliance_status TEXT NOT NULL DEFAULT 'Not Evaluated'
    CHECK (compliance_status IN ('Not Evaluated', 'Compliant', 'With Deficiency')),
  deficiency_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  renewal_decision TEXT NOT NULL DEFAULT 'Pending'
    CHECK (renewal_decision IN ('Pending', 'Approved', 'Held')),
  decision_notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_scholar_term UNIQUE (scholar_code, academic_year, semester)
);

-- 5. Evaluation & Decision Audit History
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.semester_submissions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('scholar', 'staff', 'system')),
  action_type TEXT NOT NULL,
  previous_state TEXT,
  new_state TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Helper Function for Role Check in RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_scholarship_staff()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'staff'
  );
$$;

-- ============================================================================
-- Enable Row-Level Security (RLS)
-- ============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholarship_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholar_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users read own profile; staff read all
CREATE POLICY "profiles_select_own_or_staff" ON public.user_profiles
  FOR SELECT USING (id = auth.uid() OR public.is_scholarship_staff());

-- Programs: any authenticated user can read policies; only staff can modify
CREATE POLICY "programs_select_authenticated" ON public.scholarship_programs
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "programs_manage_staff" ON public.scholarship_programs
  FOR ALL USING (public.is_scholarship_staff())
  WITH CHECK (public.is_scholarship_staff());

-- Scholar assignments: scholar reads own row; staff manage all
CREATE POLICY "assignments_select_own_or_staff" ON public.scholar_assignments
  FOR SELECT USING (profile_id = auth.uid() OR public.is_scholarship_staff());

CREATE POLICY "assignments_manage_staff" ON public.scholar_assignments
  FOR ALL USING (public.is_scholarship_staff())
  WITH CHECK (public.is_scholarship_staff());

-- Submissions: scholar reads own submissions; staff read all
CREATE POLICY "submissions_select_own_or_staff" ON public.semester_submissions
  FOR SELECT USING (
    public.is_scholarship_staff()
    OR EXISTS (
      SELECT 1 FROM public.scholar_assignments sa
      WHERE sa.scholar_code = semester_submissions.scholar_code
        AND sa.profile_id = auth.uid()
    )
  );

-- Submissions: scholar can insert only for self and only in Pending Verification state
CREATE POLICY "submissions_insert_scholar" ON public.semester_submissions
  FOR INSERT WITH CHECK (
    verification_status = 'Pending Verification'
    AND compliance_status = 'Not Evaluated'
    AND renewal_decision = 'Pending'
    AND EXISTS (
      SELECT 1 FROM public.scholar_assignments sa
      WHERE sa.scholar_code = semester_submissions.scholar_code
        AND sa.profile_id = auth.uid()
    )
  );

-- Submissions: scholar can update only their own Returned record back to Pending Verification
CREATE POLICY "submissions_resubmit_scholar" ON public.semester_submissions
  FOR UPDATE USING (
    verification_status = 'Returned'
    AND EXISTS (
      SELECT 1 FROM public.scholar_assignments sa
      WHERE sa.scholar_code = semester_submissions.scholar_code
        AND sa.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    verification_status = 'Pending Verification'
    AND compliance_status = 'Not Evaluated'
    AND renewal_decision = 'Pending'
  );

-- Submissions: staff can update verification, compliance, and renewal decisions
-- (Renewal approval requires Verified + Compliant enforced via check constraint / trigger)
CREATE POLICY "submissions_update_staff" ON public.semester_submissions
  FOR UPDATE USING (public.is_scholarship_staff())
  WITH CHECK (public.is_scholarship_staff());

-- Audit logs: scholar sees logs for own submissions; staff see all and insert
CREATE POLICY "audit_select_own_or_staff" ON public.audit_logs
  FOR SELECT USING (
    public.is_scholarship_staff()
    OR EXISTS (
      SELECT 1 FROM public.semester_submissions sub
      JOIN public.scholar_assignments sa ON sa.scholar_code = sub.scholar_code
      WHERE sub.id = audit_logs.submission_id AND sa.profile_id = auth.uid()
    )
  );

CREATE POLICY "audit_insert_authenticated" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (TRUE);

-- ============================================================================
-- Server-Side Data Integrity Trigger: Verification & Compliance Gate
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_submission_gates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.compliance_status IN ('Compliant', 'With Deficiency') AND NEW.verification_status <> 'Verified' THEN
    RAISE EXCEPTION 'Compliance evaluation blocked: submission must be Verified first.';
  END IF;

  IF NEW.renewal_decision = 'Approved' AND (NEW.verification_status <> 'Verified' OR NEW.compliance_status <> 'Compliant') THEN
    RAISE EXCEPTION 'Renewal approval blocked: submission must be Verified and Compliant.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_submission_gates ON public.semester_submissions;
CREATE TRIGGER trg_enforce_submission_gates
  BEFORE INSERT OR UPDATE ON public.semester_submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_gates();
