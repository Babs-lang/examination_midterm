import React, { useState } from 'react';
import { CheckCircle2, FilePlus2, ShieldAlert } from 'lucide-react';
import { api } from '../lib/api';
import type { AuthUser, ScholarAssignment, ScholarshipProgram, SemesterSubmission } from '../types';

interface ScholarSubmissionFormProps {
  user: AuthUser;
  scholars: ScholarAssignment[];
  programs: ScholarshipProgram[];
  onSubmitted: (submission: SemesterSubmission) => void;
}

export const ScholarSubmissionForm: React.FC<ScholarSubmissionFormProps> = ({
  user,
  scholars,
  programs,
  onSubmitted,
}) => {
  const [scholarCode, setScholarCode] = useState(user.scholarCode || scholars[0]?.scholar_code || 'B01');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [semester, setSemester] = useState('2');
  const [gwa, setGwa] = useState('1.85');
  const [enrolledUnits, setEnrolledUnits] = useState('18');
  const [failedCount, setFailedCount] = useState('0');
  const [incompleteCount, setIncompleteCount] = useState('0');
  const [droppedCount, setDroppedCount] = useState('0');
  const [evidenceRef, setEvidenceRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedScholar = scholars.find((s) => s.scholar_code === scholarCode);
  const assignedProgram = programs.find((p) => p.id === selectedScholar?.program_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await api.createSubmission({
        scholar_code: user.role === 'staff' ? scholarCode : undefined,
        academic_year: academicYear,
        semester: Number(semester),
        gwa: Number(gwa),
        enrolled_units: Number(enrolledUnits),
        failed_count: Number(failedCount),
        incomplete_count: Number(incompleteCount),
        dropped_count: Number(droppedCount),
        evidence_ref: evidenceRef,
      });

      setSuccess(
        `Submission recorded for ${res.submission.scholar_code} (AY ${res.submission.academic_year} Sem ${res.submission.semester}). Status is Pending Verification.`
      );
      setEvidenceRef('');
      onSubmitted(res.submission);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit semester grades.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">Submit Semester Academic Summary</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter your semester academic summary and supporting Registrar grade-document reference. Duplicate
            submissions for the same Academic Year and Semester are rejected.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-md border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5"
          >
            <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {user.role === 'staff' && (
              <div>
                <label htmlFor="sub-scholar" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Scholar
                </label>
                <select
                  id="sub-scholar"
                  value={scholarCode}
                  onChange={(e) => setScholarCode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {scholars.map((s) => (
                    <option key={s.scholar_code} value={s.scholar_code}>
                      {s.scholar_code} — {s.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="sub-ay" className="block text-xs font-medium text-slate-700 mb-1.5">
                Academic Year
              </label>
              <select
                id="sub-ay"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white font-mono"
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
              </select>
            </div>

            <div>
              <label htmlFor="sub-sem" className="block text-xs font-medium text-slate-700 mb-1.5">
                Semester
              </label>
              <select
                id="sub-sem"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Summer / Midyear (3)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <label htmlFor="sub-gwa" className="block text-xs font-medium text-slate-700 mb-1.5">
                GWA (1.00–5.00)
              </label>
              <input
                id="sub-gwa"
                type="number"
                step="0.01"
                required
                value={gwa}
                onChange={(e) => setGwa(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="sub-units" className="block text-xs font-medium text-slate-700 mb-1.5">
                Enrolled Units
              </label>
              <input
                id="sub-units"
                type="number"
                step="1"
                required
                value={enrolledUnits}
                onChange={(e) => setEnrolledUnits(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="sub-failed" className="block text-xs font-medium text-slate-700 mb-1.5">
                Failed Count
              </label>
              <input
                id="sub-failed"
                type="number"
                step="1"
                required
                value={failedCount}
                onChange={(e) => setFailedCount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="sub-inc" className="block text-xs font-medium text-slate-700 mb-1.5">
                Incomplete (INC)
              </label>
              <input
                id="sub-inc"
                type="number"
                step="1"
                required
                value={incompleteCount}
                onChange={(e) => setIncompleteCount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="sub-drop" className="block text-xs font-medium text-slate-700 mb-1.5">
                Dropped Count
              </label>
              <input
                id="sub-drop"
                type="number"
                step="1"
                required
                value={droppedCount}
                onChange={(e) => setDroppedCount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sub-evidence" className="block text-xs font-medium text-slate-700 mb-1.5">
              Supporting Grade-Document Reference
            </label>
            <input
              id="sub-evidence"
              type="text"
              required
              value={evidenceRef}
              onChange={(e) => setEvidenceRef(e.target.value)}
              placeholder="e.g. REG-2026-B01-SEM2-CERT.pdf or Registrar Portal Ref #88412"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
            <p className="text-xs text-slate-500 mt-1">
              Provide the official Registrar certification filename or document reference ID for staff verification.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-60"
            >
              <FilePlus2 className="w-4 h-4" aria-hidden="true" />
              <span>{submitting ? 'Submitting...' : 'Submit Academic Summary'}</span>
            </button>
          </div>
        </form>
      </section>

      <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Assigned Policy Reference</h3>
        {assignedProgram ? (
          <div className="space-y-2.5 text-xs">
            <p className="text-sm font-semibold text-blue-900">{assignedProgram.name}</p>
            <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
              <div className="py-2 flex justify-between">
                <span className="text-slate-600">Maximum permitted GWA</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {assignedProgram.max_gwa.toFixed(2)}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600">Minimum enrolled units</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {assignedProgram.min_units}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600">Allowed failed / INC</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {assignedProgram.allowed_failed} / {assignedProgram.allowed_incomplete}
                </span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-600">Allowed dropped subjects</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {assignedProgram.allowed_dropped}
                </span>
              </div>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Scale: 1.00 is best, 3.00 is passing, 5.00 is failing. Submission timestamps are evaluated in
              Asia/Manila time.
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Select a scholar to inspect assigned program thresholds.</p>
        )}
      </aside>
    </div>
  );
};
