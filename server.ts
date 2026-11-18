import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type UserRole = 'scholar' | 'staff';

interface AuthUser {
  id: string;
  accountCode: string;
  email: string;
  fullName: string;
  role: UserRole;
  scholarCode: string | null;
  studentNumber: string | null;
}

interface ProgramRow {
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

interface PolicyCheckResult {
  rule: string;
  expected: string;
  actual: string;
  passed: boolean;
  reason?: string;
}

interface SubmissionJoinedRow {
  id: string;
  scholar_code: string;
  student_number: string;
  scholar_name: string;
  program_id: string;
  program_name: string;
  award_status: string;
  academic_year: string;
  semester: number;
  gwa: number;
  enrolled_units: number;
  failed_count: number;
  incomplete_count: number;
  dropped_count: number;
  evidence_ref: string;
  submitted_at: string;
  verification_status: string;
  compliance_status: string;
  deficiency_reasons: string;
  policy_checks: string;
  renewal_decision: string;
  decision_notes: string;
  updated_at: string;
}

interface AuthedRequest extends Request {
  authUser?: AuthUser;
}

const PORT = Number(process.env.PORT || 3000);
const SESSION_COOKIE_NAME = 'acadgrant_session';
const SESSION_SECRET =
  process.env.SESSION_SECRET || crypto.createHash('sha256').update('acadgrant-dev-session-key').digest('hex');

const dataDir = path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'acadgrant.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_accounts (
      id TEXT PRIMARY KEY,
      account_code TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('scholar', 'staff')),
      scholar_code TEXT UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scholarship_programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      max_gwa REAL NOT NULL CHECK (max_gwa >= 1.00 AND max_gwa <= 5.00),
      min_units INTEGER NOT NULL CHECK (min_units >= 0),
      allowed_failed INTEGER NOT NULL CHECK (allowed_failed >= 0),
      allowed_incomplete INTEGER NOT NULL CHECK (allowed_incomplete >= 0),
      allowed_dropped INTEGER NOT NULL CHECK (allowed_dropped >= 0),
      required_evidence TEXT NOT NULL,
      deadline_iso TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scholar_assignments (
      scholar_code TEXT PRIMARY KEY,
      student_number TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      program_id TEXT NOT NULL REFERENCES scholarship_programs(id),
      award_status TEXT NOT NULL DEFAULT 'Active' CHECK (award_status IN ('Active', 'Renewed', 'Held')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS semester_submissions (
      id TEXT PRIMARY KEY,
      scholar_code TEXT NOT NULL REFERENCES scholar_assignments(scholar_code) ON DELETE CASCADE,
      academic_year TEXT NOT NULL,
      semester INTEGER NOT NULL CHECK (semester IN (1, 2, 3)),
      gwa REAL NOT NULL CHECK (gwa >= 1.00 AND gwa <= 5.00),
      enrolled_units INTEGER NOT NULL CHECK (enrolled_units >= 0),
      failed_count INTEGER NOT NULL CHECK (failed_count >= 0),
      incomplete_count INTEGER NOT NULL CHECK (incomplete_count >= 0),
      dropped_count INTEGER NOT NULL CHECK (dropped_count >= 0),
      evidence_ref TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'Pending Verification'
        CHECK (verification_status IN ('Pending Verification', 'Verified', 'Returned')),
      compliance_status TEXT NOT NULL DEFAULT 'Not Evaluated'
        CHECK (compliance_status IN ('Not Evaluated', 'Compliant', 'With Deficiency')),
      deficiency_reasons TEXT NOT NULL DEFAULT '[]',
      policy_checks TEXT NOT NULL DEFAULT '[]',
      renewal_decision TEXT NOT NULL DEFAULT 'Pending'
        CHECK (renewal_decision IN ('Pending', 'Approved', 'Held')),
      decision_notes TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE (scholar_code, academic_year, semester)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      submission_id TEXT NOT NULL REFERENCES semester_submissions(id) ON DELETE CASCADE,
      scholar_code TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL CHECK (actor_role IN ('scholar', 'staff', 'system')),
      action_type TEXT NOT NULL,
      previous_state TEXT NOT NULL,
      new_state TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function seedBaseline(forceReset = false): void {
  const existingPrograms = db.prepare('SELECT COUNT(*) AS cnt FROM scholarship_programs').get() as { cnt: number };
  if (!forceReset && existingPrograms.cnt > 0) {
    return;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    if (forceReset) {
      db.exec('DELETE FROM audit_logs;');
      db.exec('DELETE FROM semester_submissions;');
      db.exec('DELETE FROM scholar_assignments;');
      db.exec('DELETE FROM user_accounts;');
      db.exec('DELETE FROM scholarship_programs;');
    }

    const nowIso = '2026-11-05T09:00:00+08:00';

    const insertProgram = db.prepare(`
      INSERT INTO scholarship_programs (
        id, name, max_gwa, min_units, allowed_failed, allowed_incomplete, allowed_dropped, required_evidence, deadline_iso, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProgram.run(
      'PROG-EXC',
      'Excellence Scholar',
      2.0,
      18,
      0,
      0,
      0,
      'Grade document reference',
      '2026-11-06T17:00:00+08:00',
      nowIso
    );
    insertProgram.run(
      'PROG-ACC',
      'Access Scholar',
      2.5,
      15,
      0,
      0,
      1,
      'Grade document reference',
      '2026-11-06T17:00:00+08:00',
      nowIso
    );

    const insertScholar = db.prepare(`
      INSERT INTO scholar_assignments (
        scholar_code, student_number, full_name, email, program_id, award_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const scholars = [
      ['B01', '2026-00101', 'Marco Villanueva', 'b01@acadgrant.edu', 'PROG-EXC', 'Active'],
      ['B02', '2026-00102', 'Camille Reyes', 'b02@acadgrant.edu', 'PROG-EXC', 'Active'],
      ['B03', '2026-00103', 'Jerome Bautista', 'b03@acadgrant.edu', 'PROG-ACC', 'Active'],
      ['B04', '2026-00104', 'Alyssa Mendoza', 'b04@acadgrant.edu', 'PROG-ACC', 'Active'],
      ['B05', '2026-00105', 'Rafael Navarro', 'b05@acadgrant.edu', 'PROG-EXC', 'Active'],
      ['B06', '2026-00106', 'Daniel Cruz', 'b06@acadgrant.edu', 'PROG-ACC', 'Active'],
    ] as const;

    for (const row of scholars) {
      insertScholar.run(row[0], row[1], row[2], row[3], row[4], row[5], nowIso);
    }

    const insertAccount = db.prepare(`
      INSERT INTO user_accounts (
        id, account_code, email, full_name, role, scholar_code, password_salt, password_hash, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const runtimeDemoSecret = process.env.SYNTHETIC_ACCOUNT_SECRET || crypto.randomBytes(16).toString('hex');

    const staffSalt = crypto.randomBytes(16).toString('hex');
    insertAccount.run(
      'usr-staff-01',
      'STAFF-01',
      'staff@acadgrant.edu',
      'Elena Santos (Scholarship Staff)',
      'staff',
      null,
      staffSalt,
      hashPassword(runtimeDemoSecret, staffSalt),
      nowIso
    );

    for (const row of scholars) {
      const salt = crypto.randomBytes(16).toString('hex');
      insertAccount.run(
        `usr-${row[0].toLowerCase()}`,
        row[0],
        row[3],
        row[2],
        'scholar',
        row[0],
        salt,
        hashPassword(runtimeDemoSecret, salt),
        nowIso
      );
    }

    const insertSubmission = db.prepare(`
      INSERT INTO semester_submissions (
        id, scholar_code, academic_year, semester, gwa, enrolled_units, failed_count, incomplete_count, dropped_count,
        evidence_ref, submitted_at, verification_status, compliance_status, deficiency_reasons, policy_checks,
        renewal_decision, decision_notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (
        id, submission_id, scholar_code, actor_name, actor_role, action_type, previous_state, new_state, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seededSubmissions = [
      {
        id: 'sub-b01-2026-1',
        scholarCode: 'B01',
        name: 'Marco Villanueva',
        gwa: 2.0,
        units: 18,
        failed: 0,
        inc: 0,
        drop: 0,
        evidence: 'REG-2026-B01-TOR.pdf',
        submittedAt: '2026-11-06T17:00:00+08:00',
        verificationStatus: 'Verified',
        notes: 'Submitted at exact deadline; grade document verified against Registrar export.',
      },
      {
        id: 'sub-b02-2026-1',
        scholarCode: 'B02',
        name: 'Camille Reyes',
        gwa: 2.01,
        units: 18,
        failed: 0,
        inc: 0,
        drop: 0,
        evidence: 'REG-2026-B02-TOR.pdf',
        submittedAt: '2026-11-05T17:00:00+08:00',
        verificationStatus: 'Verified',
        notes: 'Submitted 1 day before deadline; grade document verified.',
      },
      {
        id: 'sub-b03-2026-1',
        scholarCode: 'B03',
        name: 'Jerome Bautista',
        gwa: 2.5,
        units: 15,
        failed: 0,
        inc: 0,
        drop: 1,
        evidence: 'REG-2026-B03-TOR.pdf',
        submittedAt: '2026-11-05T17:00:00+08:00',
        verificationStatus: 'Verified',
        notes: 'Submitted 1 day before deadline; grade document verified.',
      },
      {
        id: 'sub-b04-2026-1',
        scholarCode: 'B04',
        name: 'Alyssa Mendoza',
        gwa: 2.5,
        units: 14,
        failed: 0,
        inc: 1,
        drop: 0,
        evidence: 'REG-2026-B04-TOR.pdf',
        submittedAt: '2026-11-05T17:00:00+08:00',
        verificationStatus: 'Verified',
        notes: 'Submitted 1 day before deadline; grade document verified.',
      },
      {
        id: 'sub-b05-2026-1',
        scholarCode: 'B05',
        name: 'Rafael Navarro',
        gwa: 1.75,
        units: 18,
        failed: 1,
        inc: 0,
        drop: 0,
        evidence: 'REG-2026-B05-TOR.pdf',
        submittedAt: '2026-11-06T17:01:00+08:00',
        verificationStatus: 'Verified',
        notes: 'Submitted 1 minute after deadline; grade document verified.',
      },
      {
        id: 'sub-b06-2026-1',
        scholarCode: 'B06',
        name: 'Daniel Cruz',
        gwa: 2.25,
        units: 15,
        failed: 0,
        inc: 0,
        drop: 0,
        evidence: 'REG-2026-B06-TOR.pdf',
        submittedAt: '2026-11-05T17:00:00+08:00',
        verificationStatus: 'Pending Verification',
        notes: 'Submitted 1 day before deadline; awaiting staff verification.',
      },
    ];

    for (const sub of seededSubmissions) {
      insertSubmission.run(
        sub.id,
        sub.scholarCode,
        '2026-2027',
        1,
        sub.gwa,
        sub.units,
        sub.failed,
        sub.inc,
        sub.drop,
        sub.evidence,
        sub.submittedAt,
        sub.verificationStatus,
        'Not Evaluated',
        '[]',
        '[]',
        'Pending',
        sub.notes,
        sub.submittedAt
      );

      insertAudit.run(
        `aud-seed-sub-${sub.scholarCode.toLowerCase()}`,
        sub.id,
        sub.scholarCode,
        sub.name,
        'scholar',
        'SUBMISSION_CREATED',
        'None',
        'Pending Verification',
        `Submitted AY 2026-2027 Sem 1 grades with reference ${sub.evidence}.`,
        sub.submittedAt
      );

      if (sub.verificationStatus === 'Verified') {
        insertAudit.run(
          `aud-seed-ver-${sub.scholarCode.toLowerCase()}`,
          sub.id,
          sub.scholarCode,
          'Elena Santos (Scholarship Staff)',
          'staff',
          'VERIFICATION_RECORDED',
          'Pending Verification',
          'Verified',
          sub.notes,
          '2026-11-06T18:00:00+08:00'
        );
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

initSchema();
seedBaseline(false);

function signSessionToken(payload: { userId: string; exp: number }): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySessionToken(token: string): { userId: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { userId: string; exp: number };
    if (!parsed.userId || typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(val);
  }
  return result;
}

function loadUserById(userId: string): AuthUser | null {
  const row = db
    .prepare(
      `SELECT ua.id, ua.account_code, ua.email, ua.full_name, ua.role, ua.scholar_code, sa.student_number
       FROM user_accounts ua
       LEFT JOIN scholar_assignments sa ON sa.scholar_code = ua.scholar_code
       WHERE ua.id = ?`
    )
    .get(userId) as
    | {
        id: string;
        account_code: string;
        email: string;
        full_name: string;
        role: UserRole;
        scholar_code: string | null;
        student_number: string | null;
      }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    accountCode: row.account_code,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    scholarCode: row.scholar_code,
    studentNumber: row.student_number,
  };
}

function setSessionCookie(res: Response, userId: string): void {
  const token = signSessionToken({ userId, exp: Date.now() + 1000 * 60 * 60 * 12 });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 12,
  });
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[SESSION_COOKIE_NAME] || req.header('x-session-token');
  if (!rawToken) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  const verified = verifySessionToken(rawToken);
  if (!verified) {
    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    return;
  }
  const user = loadUserById(verified.userId);
  if (!user) {
    res.status(401).json({ error: 'Authenticated account not found.' });
    return;
  }
  req.authUser = user;
  next();
}

function requireStaff(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.authUser.role !== 'staff') {
    res.status(403).json({ error: 'Access denied: Scholarship Staff authority is required for this operation.' });
    return;
  }
  next();
}

function formatManilaDateTime(isoString: string): string {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return isoString;
  return (
    new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dt) + ' Asia/Manila'
  );
}

function validateSubmissionInput(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: {
    gwa: number;
    enrolled_units: number;
    failed_count: number;
    incomplete_count: number;
    dropped_count: number;
    evidence_ref: string;
  };
} {
  const gwa = Number(body.gwa);
  const enrolled_units = Number(body.enrolled_units);
  const failed_count = Number(body.failed_count);
  const incomplete_count = Number(body.incomplete_count);
  const dropped_count = Number(body.dropped_count);
  const evidence_ref = typeof body.evidence_ref === 'string' ? body.evidence_ref.trim() : '';

  if (!Number.isFinite(gwa) || gwa < 1.0 || gwa > 5.0) {
    return { valid: false, error: 'Invalid GWA: value must be between 1.00 and 5.00 inclusive (1.00 is highest).' };
  }
  if (!Number.isInteger(enrolled_units) || enrolled_units < 0) {
    return { valid: false, error: 'Invalid enrolled units: must be a nonnegative integer.' };
  }
  if (!Number.isInteger(failed_count) || failed_count < 0) {
    return { valid: false, error: 'Invalid failed subject count: must be a nonnegative integer.' };
  }
  if (!Number.isInteger(incomplete_count) || incomplete_count < 0) {
    return { valid: false, error: 'Invalid incomplete grade count: must be a nonnegative integer.' };
  }
  if (!Number.isInteger(dropped_count) || dropped_count < 0) {
    return { valid: false, error: 'Invalid dropped subject count: must be a nonnegative integer.' };
  }
  if (!evidence_ref) {
    return { valid: false, error: 'Supporting grade-document reference is required.' };
  }

  return {
    valid: true,
    data: {
      gwa: Math.round(gwa * 100) / 100,
      enrolled_units,
      failed_count,
      incomplete_count,
      dropped_count,
      evidence_ref,
    },
  };
}

function evaluateSubmissionAgainstProgram(
  submission: SubmissionJoinedRow,
  program: ProgramRow
): {
  complianceStatus: 'Compliant' | 'With Deficiency';
  deficiencyReasons: string[];
  policyChecks: PolicyCheckResult[];
} {
  const checks: PolicyCheckResult[] = [];
  const reasons: string[] = [];

  // 1. GWA check (1.00 is best, smaller is better)
  const gwaPassed = submission.gwa <= program.max_gwa;
  const gwaReason = gwaPassed
    ? undefined
    : `GWA ${submission.gwa.toFixed(2)} exceeds ${program.name} maximum permitted GWA of ${program.max_gwa.toFixed(2)}.`;
  if (gwaReason) reasons.push(gwaReason);
  checks.push({
    rule: 'Maximum permitted GWA',
    expected: `<= ${program.max_gwa.toFixed(2)}`,
    actual: submission.gwa.toFixed(2),
    passed: gwaPassed,
    reason: gwaReason,
  });

  // 2. Minimum enrolled units
  const unitsPassed = submission.enrolled_units >= program.min_units;
  const unitsReason = unitsPassed
    ? undefined
    : `Enrolled units (${submission.enrolled_units}) is below ${program.name} minimum of ${program.min_units} units.`;
  if (unitsReason) reasons.push(unitsReason);
  checks.push({
    rule: 'Minimum enrolled units',
    expected: `>= ${program.min_units}`,
    actual: `${submission.enrolled_units}`,
    passed: unitsPassed,
    reason: unitsReason,
  });

  // 3. Allowed failed subjects
  const failedPassed = submission.failed_count <= program.allowed_failed;
  const failedReason = failedPassed
    ? undefined
    : `Failed subject count (${submission.failed_count}) exceeds ${program.name} allowance of ${program.allowed_failed}.`;
  if (failedReason) reasons.push(failedReason);
  checks.push({
    rule: 'Allowed failed subjects',
    expected: `<= ${program.allowed_failed}`,
    actual: `${submission.failed_count}`,
    passed: failedPassed,
    reason: failedReason,
  });

  // 4. Allowed incomplete grades
  const incPassed = submission.incomplete_count <= program.allowed_incomplete;
  const incReason = incPassed
    ? undefined
    : `Incomplete grade count (${submission.incomplete_count}) exceeds ${program.name} allowance of ${program.allowed_incomplete}.`;
  if (incReason) reasons.push(incReason);
  checks.push({
    rule: 'Allowed incomplete grades',
    expected: `<= ${program.allowed_incomplete}`,
    actual: `${submission.incomplete_count}`,
    passed: incPassed,
    reason: incReason,
  });

  // 5. Allowed dropped subjects
  const dropPassed = submission.dropped_count <= program.allowed_dropped;
  const dropReason = dropPassed
    ? undefined
    : `Dropped subject count (${submission.dropped_count}) exceeds ${program.name} allowance of ${program.allowed_dropped}.`;
  if (dropReason) reasons.push(dropReason);
  checks.push({
    rule: 'Allowed dropped subjects',
    expected: `<= ${program.allowed_dropped}`,
    actual: `${submission.dropped_count}`,
    passed: dropPassed,
    reason: dropReason,
  });

  // 6. Verified evidence reference
  const evidencePassed = Boolean(submission.evidence_ref.trim()) && submission.verification_status === 'Verified';
  const evidenceReason = evidencePassed
    ? undefined
    : `Required ${program.required_evidence} is missing or unverified.`;
  if (evidenceReason) reasons.push(evidenceReason);
  checks.push({
    rule: 'Required evidence',
    expected: `${program.required_evidence} (Verified)`,
    actual: `${submission.evidence_ref} (${submission.verification_status})`,
    passed: evidencePassed,
    reason: evidenceReason,
  });

  // 7. Submission deadline (Asia/Manila; exact deadline is on time)
  const submittedMs = new Date(submission.submitted_at).getTime();
  const deadlineMs = new Date(program.deadline_iso).getTime();
  const onTime = submittedMs <= deadlineMs;
  const lateMinutes = Math.max(1, Math.ceil((submittedMs - deadlineMs) / 60000));
  const deadlineReason = onTime
    ? undefined
    : `Late submission (${lateMinutes} minute${lateMinutes === 1 ? '' : 's'} after ${formatManilaDateTime(program.deadline_iso)} deadline).`;
  if (deadlineReason) reasons.push(deadlineReason);
  checks.push({
    rule: 'Submission deadline',
    expected: `<= ${formatManilaDateTime(program.deadline_iso)}`,
    actual: formatManilaDateTime(submission.submitted_at),
    passed: onTime,
    reason: deadlineReason,
  });

  return {
    complianceStatus: reasons.length === 0 ? 'Compliant' : 'With Deficiency',
    deficiencyReasons: reasons,
    policyChecks: checks,
  };
}

function mapSubmissionRow(row: SubmissionJoinedRow) {
  return {
    ...row,
    deficiency_reasons: JSON.parse(row.deficiency_reasons || '[]') as string[],
    policy_checks: JSON.parse(row.policy_checks || '[]') as PolicyCheckResult[],
  };
}

function getSubmissionJoinedById(id: string): SubmissionJoinedRow | undefined {
  return db
    .prepare(
      `SELECT sub.*, sa.student_number, sa.full_name AS scholar_name, sa.program_id, sa.award_status, sp.name AS program_name
       FROM semester_submissions sub
       JOIN scholar_assignments sa ON sa.scholar_code = sub.scholar_code
       JOIN scholarship_programs sp ON sp.id = sa.program_id
       WHERE sub.id = ?`
    )
    .get(id) as SubmissionJoinedRow | undefined;
}

function createAuditEntry(params: {
  submissionId: string;
  scholarCode: string;
  actorName: string;
  actorRole: UserRole | 'system';
  actionType: string;
  previousState: string;
  newState: string;
  notes: string;
}): void {
  const id = `aud-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO audit_logs (
      id, submission_id, scholar_code, actor_name, actor_role, action_type, previous_state, new_state, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.submissionId,
    params.scholarCode,
    params.actorName,
    params.actorRole,
    params.actionType,
    params.previousState,
    params.newState,
    params.notes,
    createdAt
  );
}

const app = express();
app.use(express.json());

// Auth Endpoints
app.get('/api/auth/me', (req: AuthedRequest, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) {
    res.json({ user: null });
    return;
  }
  const verified = verifySessionToken(rawToken);
  if (!verified) {
    res.json({ user: null });
    return;
  }
  const user = loadUserById(verified.userId);
  res.json({ user });
});

app.get('/api/auth/synthetic-accounts', (_req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT ua.account_code, ua.email, ua.full_name, ua.role, ua.scholar_code, sp.name AS program_name
       FROM user_accounts ua
       LEFT JOIN scholar_assignments sa ON sa.scholar_code = ua.scholar_code
       LEFT JOIN scholarship_programs sp ON sp.id = sa.program_id
       ORDER BY CASE WHEN ua.role = 'staff' THEN 0 ELSE 1 END, ua.account_code ASC`
    )
    .all() as Array<{
    account_code: string;
    email: string;
    full_name: string;
    role: UserRole;
    scholar_code: string | null;
    program_name: string | null;
  }>;

  res.json({
    accounts: rows.map((r) => ({
      accountCode: r.account_code,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      scholarCode: r.scholar_code,
      programName: r.program_name,
    })),
  });
});

app.post('/api/auth/synthetic-login', (req: Request, res: Response) => {
  const accountCode = typeof req.body?.accountCode === 'string' ? req.body.accountCode.trim() : '';
  if (!accountCode) {
    res.status(400).json({ error: 'accountCode is required.' });
    return;
  }
  const row = db
    .prepare('SELECT id FROM user_accounts WHERE account_code = ?')
    .get(accountCode) as { id: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Synthetic test account not found.' });
    return;
  }

  const user = loadUserById(row.id);
  if (!user) {
    res.status(404).json({ error: 'Account profile unavailable.' });
    return;
  }

  setSessionCookie(res, user.id);
  res.json({ user });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const row = db
    .prepare('SELECT id, password_salt, password_hash FROM user_accounts WHERE LOWER(email) = ?')
    .get(email) as { id: string; password_salt: string; password_hash: string } | undefined;

  if (!row) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const candidateHash = hashPassword(password, row.password_salt);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(row.password_hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const user = loadUserById(row.id);
  setSessionCookie(res, row.id);
  res.json({ user });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
  const programId = typeof req.body?.programId === 'string' ? req.body.programId.trim() : 'PROG-ACC';

  if (!email || password.length < 6 || !fullName) {
    res.status(400).json({ error: 'Full name, valid email, and password (min 6 chars) are required.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM user_accounts WHERE LOWER(email) = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const programExists = db.prepare('SELECT id FROM scholarship_programs WHERE id = ?').get(programId);
  if (!programExists) {
    res.status(400).json({ error: 'Selected scholarship program does not exist.' });
    return;
  }

  const countRow = db.prepare('SELECT COUNT(*) AS cnt FROM scholar_assignments').get() as { cnt: number };
  const nextNum = countRow.cnt + 1;
  const scholarCode = `B${String(nextNum).padStart(2, '0')}`;
  const studentNumber = `2026-${String(100 + nextNum).padStart(5, '0')}`;
  const userId = `usr-${crypto.randomUUID()}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const nowIso = new Date().toISOString();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(
      `INSERT INTO scholar_assignments (scholar_code, student_number, full_name, email, program_id, award_status, created_at)
       VALUES (?, ?, ?, ?, ?, 'Active', ?)`
    ).run(scholarCode, studentNumber, fullName, email, programId, nowIso);

    db.prepare(
      `INSERT INTO user_accounts (id, account_code, email, full_name, role, scholar_code, password_salt, password_hash, created_at)
       VALUES (?, ?, ?, ?, 'scholar', ?, ?, ?, ?)`
    ).run(userId, scholarCode, email, fullName, scholarCode, salt, hashPassword(password, salt), nowIso);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to register scholar account.' });
    return;
  }

  const user = loadUserById(userId);
  setSessionCookie(res, userId);
  res.status(201).json({ user });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

// Programs (Policies)
app.get('/api/programs', requireAuth, (_req: AuthedRequest, res: Response) => {
  const programs = db.prepare('SELECT * FROM scholarship_programs ORDER BY id ASC').all() as unknown as ProgramRow[];
  res.json({ programs });
});

app.put('/api/programs/:id', requireAuth, requireStaff, (req: AuthedRequest, res: Response) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM scholarship_programs WHERE id = ?').get(id) as ProgramRow | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Scholarship program not found.' });
    return;
  }

  const max_gwa = Number(req.body?.max_gwa);
  const min_units = Number(req.body?.min_units);
  const allowed_failed = Number(req.body?.allowed_failed);
  const allowed_incomplete = Number(req.body?.allowed_incomplete);
  const allowed_dropped = Number(req.body?.allowed_dropped);
  const deadline_iso = typeof req.body?.deadline_iso === 'string' ? req.body.deadline_iso.trim() : existing.deadline_iso;

  if (!Number.isFinite(max_gwa) || max_gwa < 1.0 || max_gwa > 5.0) {
    res.status(400).json({ error: 'max_gwa must be between 1.00 and 5.00.' });
    return;
  }
  if (!Number.isInteger(min_units) || min_units < 0) {
    res.status(400).json({ error: 'min_units must be a nonnegative integer.' });
    return;
  }
  if (
    !Number.isInteger(allowed_failed) ||
    allowed_failed < 0 ||
    !Number.isInteger(allowed_incomplete) ||
    allowed_incomplete < 0 ||
    !Number.isInteger(allowed_dropped) ||
    allowed_dropped < 0
  ) {
    res.status(400).json({ error: 'Allowed counts must be nonnegative integers.' });
    return;
  }
  if (Number.isNaN(new Date(deadline_iso).getTime())) {
    res.status(400).json({ error: 'Invalid deadline ISO timestamp.' });
    return;
  }

  const nowIso = new Date().toISOString();
  db.prepare(
    `UPDATE scholarship_programs
     SET max_gwa = ?, min_units = ?, allowed_failed = ?, allowed_incomplete = ?, allowed_dropped = ?, deadline_iso = ?, updated_at = ?
     WHERE id = ?`
  ).run(max_gwa, min_units, allowed_failed, allowed_incomplete, allowed_dropped, deadline_iso, nowIso, id);

  const updated = db.prepare('SELECT * FROM scholarship_programs WHERE id = ?').get(id);
  res.json({ program: updated });
});

// Scholars & Assignments
app.get('/api/scholars', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  if (user.role === 'scholar') {
    const own = db
      .prepare(
        `SELECT sa.*, sp.name AS program_name
         FROM scholar_assignments sa
         JOIN scholarship_programs sp ON sp.id = sa.program_id
         WHERE sa.scholar_code = ?`
      )
      .all(user.scholarCode);
    res.json({ scholars: own });
    return;
  }

  const all = db
    .prepare(
      `SELECT sa.*, sp.name AS program_name
       FROM scholar_assignments sa
       JOIN scholarship_programs sp ON sp.id = sa.program_id
       ORDER BY sa.scholar_code ASC`
    )
    .all();
  res.json({ scholars: all });
});

app.post('/api/scholars', requireAuth, requireStaff, (req: AuthedRequest, res: Response) => {
  const scholarCode = typeof req.body?.scholar_code === 'string' ? req.body.scholar_code.trim().toUpperCase() : '';
  const studentNumber = typeof req.body?.student_number === 'string' ? req.body.student_number.trim() : '';
  const fullName = typeof req.body?.full_name === 'string' ? req.body.full_name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const programId = typeof req.body?.program_id === 'string' ? req.body.program_id.trim() : '';

  if (!scholarCode || !studentNumber || !fullName || !email || !programId) {
    res.status(400).json({ error: 'Scholar ID, student number, full name, email, and program are required.' });
    return;
  }

  const program = db.prepare('SELECT id FROM scholarship_programs WHERE id = ?').get(programId);
  if (!program) {
    res.status(400).json({ error: 'Selected scholarship program record does not exist.' });
    return;
  }

  const dup = db
    .prepare('SELECT scholar_code FROM scholar_assignments WHERE scholar_code = ? OR student_number = ? OR LOWER(email) = ?')
    .get(scholarCode, studentNumber, email);
  if (dup) {
    res.status(409).json({ error: 'A scholar with that Scholar ID, Student Number, or Email already exists.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const userId = `usr-${crypto.randomUUID()}`;
  const salt = crypto.randomBytes(16).toString('hex');
  const tempSecret = process.env.SYNTHETIC_ACCOUNT_SECRET || crypto.randomBytes(16).toString('hex');

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(
      `INSERT INTO scholar_assignments (scholar_code, student_number, full_name, email, program_id, award_status, created_at)
       VALUES (?, ?, ?, ?, ?, 'Active', ?)`
    ).run(scholarCode, studentNumber, fullName, email, programId, nowIso);

    db.prepare(
      `INSERT INTO user_accounts (id, account_code, email, full_name, role, scholar_code, password_salt, password_hash, created_at)
       VALUES (?, ?, ?, ?, 'scholar', ?, ?, ?, ?)`
    ).run(userId, scholarCode, email, fullName, scholarCode, salt, hashPassword(tempSecret, salt), nowIso);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to register scholar.' });
    return;
  }

  const created = db
    .prepare(
      `SELECT sa.*, sp.name AS program_name
       FROM scholar_assignments sa
       JOIN scholarship_programs sp ON sp.id = sa.program_id
       WHERE sa.scholar_code = ?`
    )
    .get(scholarCode);

  res.status(201).json({ scholar: created });
});

app.patch('/api/scholars/:scholarCode/program', requireAuth, requireStaff, (req: AuthedRequest, res: Response) => {
  const scholarCode = req.params.scholarCode;
  const programId = typeof req.body?.program_id === 'string' ? req.body.program_id.trim() : '';

  const scholar = db.prepare('SELECT * FROM scholar_assignments WHERE scholar_code = ?').get(scholarCode);
  if (!scholar) {
    res.status(404).json({ error: 'Scholar record not found.' });
    return;
  }
  const program = db.prepare('SELECT * FROM scholarship_programs WHERE id = ?').get(programId);
  if (!program) {
    res.status(400).json({ error: 'Target scholarship program does not exist.' });
    return;
  }

  db.prepare('UPDATE scholar_assignments SET program_id = ? WHERE scholar_code = ?').run(programId, scholarCode);
  const updated = db
    .prepare(
      `SELECT sa.*, sp.name AS program_name
       FROM scholar_assignments sa
       JOIN scholarship_programs sp ON sp.id = sa.program_id
       WHERE sa.scholar_code = ?`
    )
    .get(scholarCode);

  res.json({ scholar: updated });
});

// Dashboard Summary
app.get('/api/dashboard', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : '2026-2027';
  const semester = Number(req.query.semester || 1);

  if (user.role === 'scholar') {
    const subs = db
      .prepare('SELECT verification_status, compliance_status, renewal_decision FROM semester_submissions WHERE scholar_code = ? AND academic_year = ? AND semester = ?')
      .all(user.scholarCode, academicYear, semester) as Array<{
      verification_status: string;
      compliance_status: string;
      renewal_decision: string;
    }>;

    res.json({
      summary: {
        academic_year: academicYear,
        semester,
        total_assigned_scholars: 1,
        total_submissions: subs.length,
        pending_verification: subs.filter((s) => s.verification_status === 'Pending Verification').length,
        verified_count: subs.filter((s) => s.verification_status === 'Verified').length,
        returned_count: subs.filter((s) => s.verification_status === 'Returned').length,
        compliant: subs.filter((s) => s.compliance_status === 'Compliant').length,
        with_deficiency: subs.filter((s) => s.compliance_status === 'With Deficiency').length,
        not_evaluated: subs.filter((s) => s.compliance_status === 'Not Evaluated').length,
        approved_renewals: subs.filter((s) => s.renewal_decision === 'Approved').length,
        held_renewals: subs.filter((s) => s.renewal_decision === 'Held').length,
      },
    });
    return;
  }

  const totalScholarsRow = db.prepare('SELECT COUNT(*) AS cnt FROM scholar_assignments').get() as { cnt: number };
  const subs = db
    .prepare('SELECT verification_status, compliance_status, renewal_decision FROM semester_submissions WHERE academic_year = ? AND semester = ?')
    .all(academicYear, semester) as Array<{
    verification_status: string;
    compliance_status: string;
    renewal_decision: string;
  }>;

  res.json({
    summary: {
      academic_year: academicYear,
      semester,
      total_assigned_scholars: totalScholarsRow.cnt,
      total_submissions: subs.length,
      pending_verification: subs.filter((s) => s.verification_status === 'Pending Verification').length,
      verified_count: subs.filter((s) => s.verification_status === 'Verified').length,
      returned_count: subs.filter((s) => s.verification_status === 'Returned').length,
      compliant: subs.filter((s) => s.compliance_status === 'Compliant').length,
      with_deficiency: subs.filter((s) => s.compliance_status === 'With Deficiency').length,
      not_evaluated: subs.filter((s) => s.compliance_status === 'Not Evaluated').length,
      approved_renewals: subs.filter((s) => s.renewal_decision === 'Approved').length,
      held_renewals: subs.filter((s) => s.renewal_decision === 'Held').length,
    },
  });
});

// Submissions List (Enforces backend role isolation!)
app.get('/api/submissions', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const requestedScholarCode = typeof req.query.scholarCode === 'string' ? req.query.scholarCode.trim() : '';

  if (user.role === 'scholar' && requestedScholarCode && requestedScholarCode !== user.scholarCode) {
    res.status(403).json({
      error: 'Access denied: Scholars may only query their own scholarship submissions.',
    });
    return;
  }

  const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
  const semester = req.query.semester ? Number(req.query.semester) : 0;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
  const programId = typeof req.query.programId === 'string' ? req.query.programId.trim() : '';
  const complianceStatus = typeof req.query.complianceStatus === 'string' ? req.query.complianceStatus.trim() : '';
  const verificationStatus = typeof req.query.verificationStatus === 'string' ? req.query.verificationStatus.trim() : '';

  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (user.role === 'scholar') {
    conditions.push('sub.scholar_code = ?');
    params.push(user.scholarCode!);
  } else if (requestedScholarCode) {
    conditions.push('sub.scholar_code = ?');
    params.push(requestedScholarCode);
  }

  if (academicYear) {
    conditions.push('sub.academic_year = ?');
    params.push(academicYear);
  }
  if (semester > 0) {
    conditions.push('sub.semester = ?');
    params.push(semester);
  }
  if (programId && programId !== 'ALL') {
    conditions.push('sa.program_id = ?');
    params.push(programId);
  }
  if (complianceStatus && complianceStatus !== 'ALL') {
    conditions.push('sub.compliance_status = ?');
    params.push(complianceStatus);
  }
  if (verificationStatus && verificationStatus !== 'ALL') {
    conditions.push('sub.verification_status = ?');
    params.push(verificationStatus);
  }
  if (search) {
    conditions.push(
      '(LOWER(sub.scholar_code) LIKE ? OR LOWER(sa.student_number) LIKE ? OR LOWER(sa.full_name) LIKE ?)'
    );
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT sub.*, sa.student_number, sa.full_name AS scholar_name, sa.program_id, sa.award_status, sp.name AS program_name
       FROM semester_submissions sub
       JOIN scholar_assignments sa ON sa.scholar_code = sub.scholar_code
       JOIN scholarship_programs sp ON sp.id = sa.program_id
       ${whereClause}
       ORDER BY sub.academic_year DESC, sub.semester DESC, sub.scholar_code ASC`
    )
    .all(...params) as unknown as SubmissionJoinedRow[];

  res.json({ submissions: rows.map(mapSubmissionRow) });
});

// Get Single Submission (Enforces backend role isolation!)
app.get('/api/submissions/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const row = getSubmissionJoinedById(req.params.id);
  if (!row) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }
  if (user.role === 'scholar' && row.scholar_code !== user.scholarCode) {
    res.status(403).json({
      error: 'Access denied: You are not authorized to view another scholar’s grade submission.',
    });
    return;
  }
  res.json({ submission: mapSubmissionRow(row) });
});

// Create Semester Grade Submission
app.post('/api/submissions', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const requestedScholarCode =
    typeof req.body?.scholar_code === 'string' ? req.body.scholar_code.trim().toUpperCase() : user.scholarCode || '';

  if (user.role === 'scholar' && requestedScholarCode !== user.scholarCode) {
    res.status(403).json({
      error: 'Access denied: Scholars may only submit academic records for their own account.',
    });
    return;
  }

  if (!requestedScholarCode) {
    res.status(400).json({ error: 'Scholar ID is required.' });
    return;
  }

  const scholar = db
    .prepare('SELECT scholar_code, full_name FROM scholar_assignments WHERE scholar_code = ?')
    .get(requestedScholarCode) as { scholar_code: string; full_name: string } | undefined;

  if (!scholar) {
    res.status(404).json({ error: 'Assigned scholar record not found.' });
    return;
  }

  const academic_year = typeof req.body?.academic_year === 'string' ? req.body.academic_year.trim() : '';
  const semester = Number(req.body?.semester);
  if (!academic_year || ![1, 2, 3].includes(semester)) {
    res.status(400).json({ error: 'Valid Academic Year and Semester (1, 2, or 3) are required.' });
    return;
  }

  const validated = validateSubmissionInput(req.body as Record<string, unknown>);
  if (!validated.valid || !validated.data) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const duplicate = db
    .prepare('SELECT id FROM semester_submissions WHERE scholar_code = ? AND academic_year = ? AND semester = ?')
    .get(requestedScholarCode, academic_year, semester);

  if (duplicate) {
    res.status(409).json({
      error: `Duplicate semester submission rejected: Scholar ${requestedScholarCode} already has a record for AY ${academic_year} Semester ${semester}.`,
    });
    return;
  }

  const submittedAt =
    user.role === 'staff' && typeof req.body?.submitted_at === 'string' && !Number.isNaN(new Date(req.body.submitted_at).getTime())
      ? req.body.submitted_at
      : new Date().toISOString();

  const id = `sub-${requestedScholarCode.toLowerCase()}-${academic_year}-${semester}-${crypto.randomUUID().slice(0, 8)}`;
  const nowIso = new Date().toISOString();

  db.prepare(
    `INSERT INTO semester_submissions (
      id, scholar_code, academic_year, semester, gwa, enrolled_units, failed_count, incomplete_count, dropped_count,
      evidence_ref, submitted_at, verification_status, compliance_status, deficiency_reasons, policy_checks,
      renewal_decision, decision_notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Verification', 'Not Evaluated', '[]', '[]', 'Pending', '', ?)`
  ).run(
    id,
    requestedScholarCode,
    academic_year,
    semester,
    validated.data.gwa,
    validated.data.enrolled_units,
    validated.data.failed_count,
    validated.data.incomplete_count,
    validated.data.dropped_count,
    validated.data.evidence_ref,
    submittedAt,
    nowIso
  );

  createAuditEntry({
    submissionId: id,
    scholarCode: requestedScholarCode,
    actorName: user.fullName,
    actorRole: user.role,
    actionType: 'SUBMISSION_CREATED',
    previousState: 'None',
    newState: 'Pending Verification',
    notes: `Submitted AY ${academic_year} Sem ${semester} summary (GWA ${validated.data.gwa.toFixed(2)}, ${validated.data.enrolled_units} units, ref: ${validated.data.evidence_ref}).`,
  });

  const created = getSubmissionJoinedById(id)!;
  res.status(201).json({ submission: mapSubmissionRow(created) });
});

// Resubmit Returned Record (Scholar corrects and returns to Pending Verification)
app.put('/api/submissions/:id/resubmit', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const existing = getSubmissionJoinedById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  if (user.role === 'scholar' && existing.scholar_code !== user.scholarCode) {
    res.status(403).json({ error: 'Access denied: Scholars may only modify their own submissions.' });
    return;
  }

  if (existing.verification_status !== 'Returned') {
    res.status(400).json({
      error: `Resubmission blocked: Only submissions with status 'Returned' can be corrected and resubmitted (current status: ${existing.verification_status}).`,
    });
    return;
  }

  const validated = validateSubmissionInput(req.body as Record<string, unknown>);
  if (!validated.valid || !validated.data) {
    res.status(400).json({ error: validated.error });
    return;
  }

  const nowIso = new Date().toISOString();
  const correctionNote =
    typeof req.body?.correction_note === 'string' && req.body.correction_note.trim()
      ? req.body.correction_note.trim()
      : 'Corrected grade summary and resubmitted for verification.';

  db.prepare(
    `UPDATE semester_submissions
     SET gwa = ?, enrolled_units = ?, failed_count = ?, incomplete_count = ?, dropped_count = ?,
         evidence_ref = ?, verification_status = 'Pending Verification',
         compliance_status = 'Not Evaluated', deficiency_reasons = '[]', policy_checks = '[]',
         renewal_decision = 'Pending', decision_notes = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    validated.data.gwa,
    validated.data.enrolled_units,
    validated.data.failed_count,
    validated.data.incomplete_count,
    validated.data.dropped_count,
    validated.data.evidence_ref,
    correctionNote,
    nowIso,
    existing.id
  );

  createAuditEntry({
    submissionId: existing.id,
    scholarCode: existing.scholar_code,
    actorName: user.fullName,
    actorRole: user.role,
    actionType: 'SUBMISSION_RESUBMITTED',
    previousState: 'Returned',
    newState: 'Pending Verification',
    notes: `${correctionNote} (Updated GWA ${validated.data.gwa.toFixed(2)}, ${validated.data.enrolled_units} units, ref: ${validated.data.evidence_ref}).`,
  });

  const updated = getSubmissionJoinedById(existing.id)!;
  res.json({ submission: mapSubmissionRow(updated) });
});

// Verify or Return Submission (Staff Only)
app.post('/api/submissions/:id/verify', requireAuth, requireStaff, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const existing = getSubmissionJoinedById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  const decision = req.body?.decision;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

  if (decision !== 'Verified' && decision !== 'Returned') {
    res.status(400).json({ error: "Verification decision must be 'Verified' or 'Returned'." });
    return;
  }
  if (decision === 'Returned' && !reason) {
    res.status(400).json({ error: 'A clear reason is required when returning a submission for correction.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const noteText = reason || (decision === 'Verified' ? 'Evidence verified against Registrar document reference.' : '');

  if (decision === 'Returned') {
    db.prepare(
      `UPDATE semester_submissions
       SET verification_status = 'Returned', compliance_status = 'Not Evaluated',
           deficiency_reasons = '[]', policy_checks = '[]', renewal_decision = 'Pending',
           decision_notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(noteText, nowIso, existing.id);
  } else {
    db.prepare(
      `UPDATE semester_submissions
       SET verification_status = 'Verified', decision_notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(noteText, nowIso, existing.id);
  }

  createAuditEntry({
    submissionId: existing.id,
    scholarCode: existing.scholar_code,
    actorName: user.fullName,
    actorRole: user.role,
    actionType: 'VERIFICATION_RECORDED',
    previousState: existing.verification_status,
    newState: decision,
    notes: noteText,
  });

  const updated = getSubmissionJoinedById(existing.id)!;
  res.json({ submission: mapSubmissionRow(updated) });
});

// Evaluate Policy Compliance (Staff Only, Verification Gate Enforced)
app.post('/api/submissions/:id/evaluate', requireAuth, requireStaff, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const existing = getSubmissionJoinedById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  if (existing.verification_status !== 'Verified') {
    res.status(400).json({
      error: `Compliance evaluation blocked: Submission ${existing.scholar_code} must be 'Verified' before policy evaluation (current status: '${existing.verification_status}').`,
    });
    return;
  }

  // Always read thresholds from persisted scholarship_programs record
  const program = db
    .prepare('SELECT * FROM scholarship_programs WHERE id = ?')
    .get(existing.program_id) as ProgramRow | undefined;

  if (!program) {
    res.status(500).json({ error: 'Assigned scholarship policy record could not be loaded.' });
    return;
  }

  const evaluation = evaluateSubmissionAgainstProgram(existing, program);
  const nowIso = new Date().toISOString();

  db.prepare(
    `UPDATE semester_submissions
     SET compliance_status = ?, deficiency_reasons = ?, policy_checks = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    evaluation.complianceStatus,
    JSON.stringify(evaluation.deficiencyReasons),
    JSON.stringify(evaluation.policyChecks),
    nowIso,
    existing.id
  );

  createAuditEntry({
    submissionId: existing.id,
    scholarCode: existing.scholar_code,
    actorName: user.fullName,
    actorRole: user.role,
    actionType: 'COMPLIANCE_EVALUATED',
    previousState: existing.compliance_status,
    newState: evaluation.complianceStatus,
    notes:
      evaluation.deficiencyReasons.length > 0
        ? `Policy (${program.name}) deficiencies: ${evaluation.deficiencyReasons.join(' | ')}`
        : `All ${evaluation.policyChecks.length} ${program.name} policy criteria satisfied.`,
  });

  const updated = getSubmissionJoinedById(existing.id)!;
  res.json({ submission: mapSubmissionRow(updated) });
});

// Record Renewal Decision (Staff Only, Verification + Compliance Gates Enforced)
app.post('/api/submissions/:id/decision', requireAuth, requireStaff, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const existing = getSubmissionJoinedById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Submission not found.' });
    return;
  }

  const decision = req.body?.decision;
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : '';

  if (decision !== 'Approved' && decision !== 'Held') {
    res.status(400).json({ error: "Renewal decision must be 'Approved' or 'Held'." });
    return;
  }

  if (existing.verification_status !== 'Verified') {
    res.status(400).json({
      error: `Renewal decision blocked: Submission ${existing.scholar_code} must be 'Verified' before recording a renewal decision.`,
    });
    return;
  }

  if (existing.compliance_status === 'Not Evaluated') {
    res.status(400).json({
      error: `Renewal decision blocked: Compliance must be evaluated before recording a renewal decision for ${existing.scholar_code}.`,
    });
    return;
  }

  if (decision === 'Approved' && existing.compliance_status !== 'Compliant') {
    res.status(400).json({
      error: `Renewal approval blocked: Scholar ${existing.scholar_code} has status 'With Deficiency'. Staff cannot approve a deficient record; only 'Held' is permitted.`,
    });
    return;
  }

  const nowIso = new Date().toISOString();
  const nextAwardStatus = decision === 'Approved' ? 'Renewed' : 'Held';
  const finalNotes =
    notes || (decision === 'Approved' ? 'Renewal approved after verified compliant evaluation.' : 'Renewal held pending deficiency resolution.');

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(
      `UPDATE semester_submissions
       SET renewal_decision = ?, decision_notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(decision, finalNotes, nowIso, existing.id);

    db.prepare('UPDATE scholar_assignments SET award_status = ? WHERE scholar_code = ?').run(
      nextAwardStatus,
      existing.scholar_code
    );

    createAuditEntry({
      submissionId: existing.id,
      scholarCode: existing.scholar_code,
      actorName: user.fullName,
      actorRole: user.role,
      actionType: 'RENEWAL_DECIDED',
      previousState: existing.renewal_decision,
      newState: decision,
      notes: finalNotes,
    });

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to record renewal decision.' });
    return;
  }

  const updated = getSubmissionJoinedById(existing.id)!;
  res.json({ submission: mapSubmissionRow(updated) });
});

// Audit Logs (Role Isolated)
app.get('/api/audit-logs', requireAuth, (req: AuthedRequest, res: Response) => {
  const user = req.authUser!;
  const submissionId = typeof req.query.submissionId === 'string' ? req.query.submissionId.trim() : '';

  if (submissionId) {
    const sub = getSubmissionJoinedById(submissionId);
    if (!sub) {
      res.status(404).json({ error: 'Submission not found.' });
      return;
    }
    if (user.role === 'scholar' && sub.scholar_code !== user.scholarCode) {
      res.status(403).json({ error: 'Access denied: Cannot inspect audit logs of another scholar.' });
      return;
    }
    const logs = db
      .prepare('SELECT * FROM audit_logs WHERE submission_id = ? ORDER BY created_at DESC, rowid DESC')
      .all(submissionId);
    res.json({ logs });
    return;
  }

  if (user.role === 'scholar') {
    const logs = db
      .prepare('SELECT * FROM audit_logs WHERE scholar_code = ? ORDER BY created_at DESC, rowid DESC')
      .all(user.scholarCode);
    res.json({ logs });
    return;
  }

  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC, rowid DESC LIMIT 200').all();
  res.json({ logs });
});

// Reset Seed Data (Staff Only)
app.post('/api/admin/reset-seed', requireAuth, requireStaff, (_req: AuthedRequest, res: Response) => {
  seedBaseline(true);
  res.json({ ok: true, message: 'Database reset to baseline Section B synthetic records (B01–B06).' });
});

// Live Automated Functional Test Runner (TC01–TC10 against live HTTP endpoints)
app.post('/api/tests/run-suite', requireAuth, requireStaff, async (_req: AuthedRequest, res: Response) => {
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const extractCookie = (resp: globalThis.Response): string => {
    const setCookie = resp.headers.get('set-cookie');
    if (!setCookie) return '';
    return setCookie.split(';')[0];
  };

  interface TestResultRow {
    testId: string;
    name: string;
    inputOrAction: string;
    expectedResult: string;
    actualResult: string;
    passed: boolean;
    evidenceRef: string;
  }

  const results: TestResultRow[] = [];

  try {
    // Reset cleanly before running live suite so TC01-TC10 are deterministic
    seedBaseline(true);

    // Sign in via HTTP as Staff and as Scholar B01
    const staffLoginRes = await fetch(`${baseUrl}/api/auth/synthetic-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountCode: 'STAFF-01' }),
    });
    const staffCookie = extractCookie(staffLoginRes);

    const b01LoginRes = await fetch(`${baseUrl}/api/auth/synthetic-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountCode: 'B01' }),
    });
    const b01Cookie = extractCookie(b01LoginRes);

    const callApi = async (
      method: string,
      apiPath: string,
      cookie: string,
      body?: Record<string, unknown>
    ) => {
      const r = await fetch(`${baseUrl}${apiPath}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return { status: r.status, json };
    };

    // TC01: Evaluate record B01 (GWA 2.00, 18 units, at exact deadline) -> Compliant
    const tc01 = await callApi('POST', '/api/submissions/sub-b01-2026-1/evaluate', staffCookie);
    const sub01 = tc01.json.submission as Record<string, unknown> | undefined;
    results.push({
      testId: 'TC01',
      name: 'Valid boundary (B01)',
      inputOrAction: 'POST /api/submissions/sub-b01-2026-1/evaluate (GWA 2.00, at exact deadline)',
      expectedResult: 'HTTP 200; compliance_status = Compliant at exact GWA and deadline boundaries.',
      actualResult: `HTTP ${tc01.status}; compliance_status = ${sub01?.compliance_status ?? 'none'}`,
      passed: tc01.status === 200 && sub01?.compliance_status === 'Compliant',
      evidenceRef: 'Record B01 · PROG-EXC policy check',
    });

    // TC02: Evaluate record B02 (GWA 2.01 > 2.00) -> With Deficiency (GWA reason)
    const tc02 = await callApi('POST', '/api/submissions/sub-b02-2026-1/evaluate', staffCookie);
    const sub02 = tc02.json.submission as Record<string, unknown> | undefined;
    const reasons02 = (sub02?.deficiency_reasons as string[] | undefined) || [];
    results.push({
      testId: 'TC02',
      name: 'GWA above limit (B02)',
      inputOrAction: 'POST /api/submissions/sub-b02-2026-1/evaluate (GWA 2.01 vs 2.00 max)',
      expectedResult: 'HTTP 200; With Deficiency citing GWA threshold exceeded.',
      actualResult: `HTTP ${tc02.status}; ${sub02?.compliance_status} — ${reasons02.join('; ')}`,
      passed:
        tc02.status === 200 &&
        sub02?.compliance_status === 'With Deficiency' &&
        reasons02.some((r) => r.includes('GWA')),
      evidenceRef: 'Record B02 · GWA upper boundary failure',
    });

    // TC03: Evaluate record B03 (Access Scholar, 1 dropped subject permitted) -> Compliant
    const tc03 = await callApi('POST', '/api/submissions/sub-b03-2026-1/evaluate', staffCookie);
    const sub03 = tc03.json.submission as Record<string, unknown> | undefined;
    results.push({
      testId: 'TC03',
      name: 'Program variation (B03)',
      inputOrAction: 'POST /api/submissions/sub-b03-2026-1/evaluate (Access Scholar, 1 dropped)',
      expectedResult: 'HTTP 200; Compliant because Access Scholar allows 1 dropped subject.',
      actualResult: `HTTP ${tc03.status}; compliance_status = ${sub03?.compliance_status}`,
      passed: tc03.status === 200 && sub03?.compliance_status === 'Compliant',
      evidenceRef: 'Record B03 · PROG-ACC allowed_dropped=1',
    });

    // TC04: Evaluate record B04 (14 units < 15, 1 INC > 0) -> With Deficiency (both reasons)
    const tc04 = await callApi('POST', '/api/submissions/sub-b04-2026-1/evaluate', staffCookie);
    const sub04 = tc04.json.submission as Record<string, unknown> | undefined;
    const reasons04 = (sub04?.deficiency_reasons as string[] | undefined) || [];
    results.push({
      testId: 'TC04',
      name: 'Multiple deficiencies (B04)',
      inputOrAction: 'POST /api/submissions/sub-b04-2026-1/evaluate (14 units, 1 INC)',
      expectedResult: 'With Deficiency identifying both insufficient units and incomplete grade.',
      actualResult: `HTTP ${tc04.status}; ${sub04?.compliance_status} — ${reasons04.join('; ')}`,
      passed:
        tc04.status === 200 &&
        sub04?.compliance_status === 'With Deficiency' &&
        reasons04.some((r) => r.toLowerCase().includes('unit')) &&
        reasons04.some((r) => r.toLowerCase().includes('incomplete')),
      evidenceRef: 'Record B04 · Multi-rule evaluation',
    });

    // TC05: Evaluate record B05 (1 failed, 1 min late) -> With Deficiency (both reasons)
    const tc05 = await callApi('POST', '/api/submissions/sub-b05-2026-1/evaluate', staffCookie);
    const sub05 = tc05.json.submission as Record<string, unknown> | undefined;
    const reasons05 = (sub05?.deficiency_reasons as string[] | undefined) || [];
    results.push({
      testId: 'TC05',
      name: 'Failure and lateness (B05)',
      inputOrAction: 'POST /api/submissions/sub-b05-2026-1/evaluate (1 failed, 17:01+08:00)',
      expectedResult: 'With Deficiency identifying failing subject and late submission.',
      actualResult: `HTTP ${tc05.status}; ${sub05?.compliance_status} — ${reasons05.join('; ')}`,
      passed:
        tc05.status === 200 &&
        sub05?.compliance_status === 'With Deficiency' &&
        reasons05.some((r) => r.toLowerCase().includes('failed')) &&
        reasons05.some((r) => r.toLowerCase().includes('late')),
      evidenceRef: 'Record B05 · Asia/Manila deadline check',
    });

    // TC06: Verification gate on record B06 (Pending Verification)
    const tc06Eval = await callApi('POST', '/api/submissions/sub-b06-2026-1/evaluate', staffCookie);
    const tc06Dec = await callApi('POST', '/api/submissions/sub-b06-2026-1/decision', staffCookie, {
      decision: 'Approved',
      notes: 'Attempt before verification',
    });
    results.push({
      testId: 'TC06',
      name: 'Verification gate (B06)',
      inputOrAction: 'Attempt evaluate and renewal approval on Pending Verification record B06',
      expectedResult: 'Both blocked with HTTP 400 until verified and evaluated.',
      actualResult: `Eval: HTTP ${tc06Eval.status} (${tc06Eval.json.error}); Approval: HTTP ${tc06Dec.status} (${tc06Dec.json.error})`,
      passed: tc06Eval.status === 400 && tc06Dec.status === 400,
      evidenceRef: 'Record B06 · Backend gate checks',
    });

    // TC07: Duplicate semester & invalid input (GWA 0.50, negative count)
    const tc07Dup = await callApi('POST', '/api/submissions', b01Cookie, {
      academic_year: '2026-2027',
      semester: 1,
      gwa: 1.9,
      enrolled_units: 18,
      failed_count: 0,
      incomplete_count: 0,
      dropped_count: 0,
      evidence_ref: 'DUP-TEST.pdf',
    });
    const tc07BadGwa = await callApi('POST', '/api/submissions', b01Cookie, {
      academic_year: '2026-2027',
      semester: 2,
      gwa: 0.5,
      enrolled_units: 18,
      failed_count: 0,
      incomplete_count: 0,
      dropped_count: 0,
      evidence_ref: 'BAD-GWA.pdf',
    });
    const tc07Neg = await callApi('POST', '/api/submissions', b01Cookie, {
      academic_year: '2026-2027',
      semester: 2,
      gwa: 1.8,
      enrolled_units: 18,
      failed_count: -1,
      incomplete_count: 0,
      dropped_count: 0,
      evidence_ref: 'NEG-CNT.pdf',
    });
    results.push({
      testId: 'TC07',
      name: 'Duplicate and invalid input',
      inputOrAction: 'Submit duplicate AY 2026-2027 Sem 1, GWA 0.50, and failed_count -1 as B01',
      expectedResult: 'Duplicate rejected (409); invalid GWA and negative count rejected (400).',
      actualResult: `Dup: HTTP ${tc07Dup.status}; GWA 0.50: HTTP ${tc07BadGwa.status}; Neg: HTTP ${tc07Neg.status}`,
      passed: tc07Dup.status === 409 && tc07BadGwa.status === 400 && tc07Neg.status === 400,
      evidenceRef: 'UNIQUE(scholar_code, academic_year, semester) + validation',
    });

    // TC08: Role isolation (Scholar B01 tries to read B02 & verify B06)
    const tc08Read = await callApi('GET', '/api/submissions/sub-b02-2026-1', b01Cookie);
    const tc08Verify = await callApi('POST', '/api/submissions/sub-b06-2026-1/verify', b01Cookie, {
      decision: 'Verified',
      reason: 'Unauthorized attempt',
    });
    results.push({
      testId: 'TC08',
      name: 'Role isolation',
      inputOrAction: 'Scholar B01 requests GET /sub-b02-2026-1 and POST /sub-b06-2026-1/verify',
      expectedResult: 'Backend denies both requests with HTTP 403 Forbidden.',
      actualResult: `Read B02: HTTP ${tc08Read.status}; Verify B06: HTTP ${tc08Verify.status}`,
      passed: tc08Read.status === 403 && tc08Verify.status === 403,
      evidenceRef: 'Server-side requireStaff + ownership check',
    });

    // TC09: Persistence and correction workflow (Return B06, Scholar B06 corrects & resubmits, verify persisted)
    const b06LoginRes = await fetch(`${baseUrl}/api/auth/synthetic-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountCode: 'B06' }),
    });
    const b06Cookie = extractCookie(b06LoginRes);
    const tc09Return = await callApi('POST', '/api/submissions/sub-b06-2026-1/verify', staffCookie, {
      decision: 'Returned',
      reason: 'Please upload signed Registrar certification.',
    });
    const tc09Resubmit = await callApi('PUT', '/api/submissions/sub-b06-2026-1/resubmit', b06Cookie, {
      gwa: 2.25,
      enrolled_units: 15,
      failed_count: 0,
      incomplete_count: 0,
      dropped_count: 0,
      evidence_ref: 'REG-2026-B06-SIGNED.pdf',
      correction_note: 'Uploaded signed Registrar certification.',
    });
    const tc09Fetch = await callApi('GET', '/api/submissions/sub-b06-2026-1', staffCookie);
    const tc09Audit = await callApi('GET', '/api/audit-logs?submissionId=sub-b06-2026-1', staffCookie);
    const fetched06 = tc09Fetch.json.submission as Record<string, unknown> | undefined;
    const logs06 = (tc09Audit.json.logs as Array<Record<string, unknown>> | undefined) || [];
    results.push({
      testId: 'TC09',
      name: 'Persistence and correction',
      inputOrAction: 'Staff returns B06; B06 resubmits signed ref; re-fetch submission & audit trail',
      expectedResult: 'Status returns to Pending Verification and audit history preserves Returned & Resubmitted events.',
      actualResult: `Return HTTP ${tc09Return.status}; Resubmit HTTP ${tc09Resubmit.status}; Persisted status=${fetched06?.verification_status}; Audit entries=${logs06.length}`,
      passed:
        tc09Return.status === 200 &&
        tc09Resubmit.status === 200 &&
        fetched06?.verification_status === 'Pending Verification' &&
        logs06.length >= 3,
      evidenceRef: 'SQLite WAL persistence + audit_logs',
    });

    // TC10: Renewal authority (Approve compliant B01, Hold deficient B02, block scholar decision & block approving deficient B02)
    const tc10Approve01 = await callApi('POST', '/api/submissions/sub-b01-2026-1/decision', staffCookie, {
      decision: 'Approved',
      notes: 'Meets all Excellence Scholar renewal thresholds.',
    });
    const tc10Approve02Blocked = await callApi('POST', '/api/submissions/sub-b02-2026-1/decision', staffCookie, {
      decision: 'Approved',
      notes: 'Should be blocked due to GWA deficiency.',
    });
    const tc10Hold02 = await callApi('POST', '/api/submissions/sub-b02-2026-1/decision', staffCookie, {
      decision: 'Held',
      notes: 'Held due to GWA 2.01 exceeding 2.00 limit.',
    });
    const tc10ScholarBlocked = await callApi('POST', '/api/submissions/sub-b03-2026-1/decision', b01Cookie, {
      decision: 'Approved',
      notes: 'Scholar tampering attempt',
    });
    const sub01After = tc10Approve01.json.submission as Record<string, unknown> | undefined;
    const sub02After = tc10Hold02.json.submission as Record<string, unknown> | undefined;

    results.push({
      testId: 'TC10',
      name: 'Renewal authority',
      inputOrAction: 'Staff approves B01, tries approving deficient B02, holds B02; Scholar attempts decision',
      expectedResult: 'B01 Approved (200); Deficient B02 Approve blocked (400); B02 Held (200); Scholar blocked (403).',
      actualResult: `B01=${sub01After?.renewal_decision} (${tc10Approve01.status}); B02 Approve=${tc10Approve02Blocked.status}; B02=${sub02After?.renewal_decision} (${tc10Hold02.status}); Scholar=${tc10ScholarBlocked.status}`,
      passed:
        tc10Approve01.status === 200 &&
        sub01After?.renewal_decision === 'Approved' &&
        tc10Approve02Blocked.status === 400 &&
        tc10Hold02.status === 200 &&
        sub02After?.renewal_decision === 'Held' &&
        tc10ScholarBlocked.status === 403,
      evidenceRef: 'Renewal authority + compliance gate',
    });

    // Reset seed back to clean initial state OR keep evaluated? Let's reset to clean B01-B06 seed? Wait: if we keep B01-B05 evaluated, or reset? Let's reset to clean baseline AND return test results so dashboard stays predictable, OR let the caller know. Actually resetting cleanly keeps B06 Pending Verification and B01-B05 ready for manual walkthrough! Let's restore baseline after test suite run.
    seedBaseline(true);

    res.json({
      executedAt: new Date().toISOString(),
      passedCount: results.filter((r) => r.passed).length,
      totalCount: results.length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Test suite execution error.' });
  }
});

// Export Clean Submission Bundle as ZIP (SAD_Exam_Section_B_StudentID.zip)
function buildSubmissionZipBuffer(rootDir: string, rootFolderName: string): Buffer {
  const excludedTop = new Set(['node_modules', 'dist', 'data', '.git', 'bun.lock']);
  const files: Array<{ relPath: string; data: Buffer }> = [];

  function walk(dir: string, relPrefix: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
      if (!relPrefix && excludedTop.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.isFile()) {
        files.push({ relPath: `${rootFolderName}/${relPath}`, data: fs.readFileSync(fullPath) });
      }
    }
  }

  walk(rootDir, '');

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.relPath, 'utf8');
    const compressed = zlib.deflateRawSync(file.data);
    const crc = zlib.crc32(file.data) >>> 0;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8); // deflate
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralSize = centralParts.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

app.get('/api/export/submission-zip', requireAuth, (_req: AuthedRequest, res: Response) => {
  try {
    const zipBuffer = buildSubmissionZipBuffer(__dirname, 'SAD_Exam_Section_B_StudentID');
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="SAD_Exam_Section_B_StudentID.zip"');
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unable to build ZIP bundle.' });
  }
});

// Vite / Static Frontend Serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AcadGrant server running on http://localhost:${PORT}`);
  });
}

startServer();
