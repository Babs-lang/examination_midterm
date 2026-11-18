-- ============================================================================
-- Seed Data: Section B Policies & Six Fictional Scholar Records (B01–B06)
-- Academic Year 2026-2027, Semester 1 | Deadline: 2026-11-06 17:00 Asia/Manila
-- ============================================================================

INSERT INTO public.scholarship_programs (
  id, name, max_gwa, min_units, allowed_failed, allowed_incomplete, allowed_dropped, required_evidence, deadline
) VALUES
  ('PROG-EXC', 'Excellence Scholar', 2.00, 18, 0, 0, 0, 'Grade document reference', '2026-11-06T17:00:00+08:00'),
  ('PROG-ACC', 'Access Scholar',     2.50, 15, 0, 0, 1, 'Grade document reference', '2026-11-06T17:00:00+08:00')
ON CONFLICT (id) DO UPDATE SET
  max_gwa = EXCLUDED.max_gwa,
  min_units = EXCLUDED.min_units,
  allowed_failed = EXCLUDED.allowed_failed,
  allowed_incomplete = EXCLUDED.allowed_incomplete,
  allowed_dropped = EXCLUDED.allowed_dropped,
  required_evidence = EXCLUDED.required_evidence,
  deadline = EXCLUDED.deadline;

INSERT INTO public.scholar_assignments (
  scholar_code, student_number, full_name, email, program_id, award_status
) VALUES
  ('B01', '2026-00101', 'Marco Villanueva', 'b01@acadgrant.edu', 'PROG-EXC', 'Active'),
  ('B02', '2026-00102', 'Camille Reyes',    'b02@acadgrant.edu', 'PROG-EXC', 'Active'),
  ('B03', '2026-00103', 'Jerome Bautista',  'b03@acadgrant.edu', 'PROG-ACC', 'Active'),
  ('B04', '2026-00104', 'Alyssa Mendoza',   'b04@acadgrant.edu', 'PROG-ACC', 'Active'),
  ('B05', '2026-00105', 'Rafael Navarro',   'b05@acadgrant.edu', 'PROG-EXC', 'Active'),
  ('B06', '2026-00106', 'Daniel Cruz',      'b06@acadgrant.edu', 'PROG-ACC', 'Active')
ON CONFLICT (scholar_code) DO NOTHING;

INSERT INTO public.semester_submissions (
  scholar_code, academic_year, semester, gwa, enrolled_units, failed_count, incomplete_count, dropped_count,
  evidence_ref, submitted_at, verification_status, compliance_status, renewal_decision, decision_notes
) VALUES
  ('B01', '2026-2027', 1, 2.00, 18, 0, 0, 0, 'REG-2026-B01-TOR.pdf', '2026-11-06T17:00:00+08:00', 'Verified',             'Not Evaluated', 'Pending', 'Verified against Registrar grade summary (submitted at exact deadline).'),
  ('B02', '2026-2027', 1, 2.01, 18, 0, 0, 0, 'REG-2026-B02-TOR.pdf', '2026-11-05T17:00:00+08:00', 'Verified',             'Not Evaluated', 'Pending', 'Verified against Registrar grade summary.'),
  ('B03', '2026-2027', 1, 2.50, 15, 0, 0, 1, 'REG-2026-B03-TOR.pdf', '2026-11-05T17:00:00+08:00', 'Verified',             'Not Evaluated', 'Pending', 'Verified against Registrar grade summary.'),
  ('B04', '2026-2027', 1, 2.50, 14, 0, 1, 0, 'REG-2026-B04-TOR.pdf', '2026-11-05T17:00:00+08:00', 'Verified',             'Not Evaluated', 'Pending', 'Verified against Registrar grade summary.'),
  ('B05', '2026-2027', 1, 1.75, 18, 1, 0, 0, 'REG-2026-B05-TOR.pdf', '2026-11-06T17:01:00+08:00', 'Verified',             'Not Evaluated', 'Pending', 'Verified against Registrar grade summary (submitted 1 minute after deadline).'),
  ('B06', '2026-2027', 1, 2.25, 15, 0, 0, 0, 'REG-2026-B06-TOR.pdf', '2026-11-05T17:00:00+08:00', 'Pending Verification', 'Not Evaluated', 'Pending', 'Awaiting Scholarship Staff verification.')
ON CONFLICT (scholar_code, academic_year, semester) DO NOTHING;
