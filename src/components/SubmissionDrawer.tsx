import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck2,
  RotateCcw,
  ShieldAlert,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api';
import type { AuditLogEntry, AuthUser, SemesterSubmission, ScholarshipProgram } from '../types';

interface SubmissionDrawerProps {
  submission: SemesterSubmission;
  user: AuthUser;
  program?: ScholarshipProgram;
  onClose: () => void;
  onUpdated: (updated: SemesterSubmission) => void;
}

export function formatManilaTimestamp(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return (
    new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dt) + ' PHT'
  );
}

export const SubmissionDrawer: React.FC<SubmissionDrawerProps> = ({
  submission,
  user,
  program,
  onClose,
  onUpdated,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Staff action states
  const [verifyReason, setVerifyReason] = useState('');
  const [decisionNotes, setDecisionNotes] = useState('');

  // Scholar resubmission states
  const [editGwa, setEditGwa] = useState(String(submission.gwa.toFixed(2)));
  const [editUnits, setEditUnits] = useState(String(submission.enrolled_units));
  const [editFailed, setEditFailed] = useState(String(submission.failed_count));
  const [editIncomplete, setEditIncomplete] = useState(String(submission.incomplete_count));
  const [editDropped, setEditDropped] = useState(String(submission.dropped_count));
  const [editEvidence, setEditEvidence] = useState(submission.evidence_ref);
  const [correctionNote, setCorrectionNote] = useState('');

  useEffect(() => {
    setEditGwa(submission.gwa.toFixed(2));
    setEditUnits(String(submission.enrolled_units));
    setEditFailed(String(submission.failed_count));
    setEditIncomplete(String(submission.incomplete_count));
    setEditDropped(String(submission.dropped_count));
    setEditEvidence(submission.evidence_ref);
    setActionError(null);
  }, [submission]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.getAuditLogs(submission.id);
      setAuditLogs(res.logs);
    } catch {
      setAuditLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [submission.id, submission.updated_at]);

  const handleVerify = async (decision: 'Verified' | 'Returned') => {
    setActionError(null);
    setActionMessage(null);
    if (decision === 'Returned' && !verifyReason.trim()) {
      setActionError('Please enter a specific reason before returning this submission for correction.');
      return;
    }
    setActionBusy(true);
    try {
      const res = await api.verifySubmission(submission.id, decision, verifyReason.trim());
      setActionMessage(`Verification status updated to ${decision}.`);
      setVerifyReason('');
      onUpdated(res.submission);
      await loadLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleEvaluate = async () => {
    setActionError(null);
    setActionMessage(null);
    setActionBusy(true);
    try {
      const res = await api.evaluateSubmission(submission.id);
      setActionMessage(`Compliance evaluated: ${res.submission.compliance_status}.`);
      onUpdated(res.submission);
      await loadLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Evaluation failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRenewalDecision = async (decision: 'Approved' | 'Held') => {
    setActionError(null);
    setActionMessage(null);
    setActionBusy(true);
    try {
      const res = await api.recordDecision(submission.id, decision, decisionNotes.trim());
      setActionMessage(`Renewal decision recorded as ${decision}.`);
      setDecisionNotes('');
      onUpdated(res.submission);
      await loadLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Renewal decision rejected.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionMessage(null);
    setActionBusy(true);
    try {
      const res = await api.resubmitSubmission(submission.id, {
        gwa: Number(editGwa),
        enrolled_units: Number(editUnits),
        failed_count: Number(editFailed),
        incomplete_count: Number(editIncomplete),
        dropped_count: Number(editDropped),
        evidence_ref: editEvidence,
        correction_note: correctionNote.trim() || undefined,
      });
      setActionMessage('Corrections submitted. Status returned to Pending Verification.');
      setCorrectionNote('');
      onUpdated(res.submission);
      await loadLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Resubmission failed.');
    } finally {
      setActionBusy(false);
    }
  };

  const canResubmit =
    submission.verification_status === 'Returned' &&
    (user.role === 'staff' || user.scholarCode === submission.scholar_code);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Submission details for ${submission.scholar_code}`}
        className="w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>{submission.scholar_code}</span>
              <span aria-hidden="true">·</span>
              <span>{submission.student_number}</span>
              <span aria-hidden="true">·</span>
              <span>
                AY {submission.academic_year} Sem {submission.semester}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 truncate mt-0.5">
              {submission.scholar_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close submission detail"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {actionError && (
            <div
              role="alert"
              className="p-3.5 rounded-md border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{actionError}</span>
            </div>
          )}

          {actionMessage && (
            <div
              role="status"
              className="p-3.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Separated Lifecycle States (Verification / Compliance / Renewal / Award) */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500 mb-1">Verification</p>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                {submission.verification_status === 'Verified' && (
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                )}
                {submission.verification_status === 'Pending Verification' && (
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                )}
                {submission.verification_status === 'Returned' && (
                  <RotateCcw className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                )}
                <span>{submission.verification_status}</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Compliance</p>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                {submission.compliance_status === 'Compliant' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                )}
                {submission.compliance_status === 'With Deficiency' && (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
                )}
                {submission.compliance_status === 'Not Evaluated' && (
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                )}
                <span>{submission.compliance_status}</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Renewal Decision</p>
              <p className="text-sm font-semibold text-slate-900">{submission.renewal_decision}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-1">Award Status</p>
              <p className="text-sm font-semibold text-slate-900">{submission.award_status}</p>
            </div>
          </section>

          {/* Academic Summary & Program Context */}
          <section className="pb-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Submitted Academic Summary</h3>
              <span className="text-xs text-slate-500">
                Program: <strong className="font-medium text-slate-800">{submission.program_name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-xs text-slate-500">GWA (1.00 best)</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {submission.gwa.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Enrolled Units</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {submission.enrolled_units}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Failed / INC / Dropped</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {submission.failed_count} / {submission.incomplete_count} / {submission.dropped_count}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-slate-500">Grade-Document Reference</p>
                <p className="font-mono text-xs text-slate-900 mt-1 break-all">{submission.evidence_ref}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Submitted Timestamp</p>
                <p className="font-mono tabular-nums text-xs text-slate-800 mt-1">
                  {formatManilaTimestamp(submission.submitted_at)}
                </p>
              </div>
            </div>

            {submission.decision_notes && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <span className="font-medium text-slate-800">Latest Staff / Correction Note: </span>
                {submission.decision_notes}
              </div>
            )}
          </section>

          {/* Staff Verification Controls */}
          {user.role === 'staff' && (
            <section className="pb-6 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">1. Evidence Verification</h3>
                <span className="text-xs text-slate-500">
                  Required before compliance evaluation
                </span>
              </div>

              <div>
                <label htmlFor="verify-reason" className="block text-xs text-slate-600 mb-1">
                  Verification note or return reason (required if returning)
                </label>
                <input
                  id="verify-reason"
                  type="text"
                  value={verifyReason}
                  onChange={(e) => setVerifyReason(e.target.value)}
                  placeholder="e.g. Verified against Registrar PDF or Missing Registrar stamp"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleVerify('Verified')}
                  className="px-4 py-2 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  Mark Evidence Verified
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleVerify('Returned')}
                  className="px-4 py-2 text-xs font-medium bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  Return for Correction
                </button>
              </div>
            </section>
          )}

          {/* Scholar Resubmit Section (Only when Returned) */}
          {canResubmit && (
            <section className="pb-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Correct &amp; Resubmit Returned Grade Summary
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                Resubmitting updates your academic summary and returns the record to Pending Verification.
              </p>

              <form onSubmit={handleResubmit} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">GWA</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.00"
                      max="5.00"
                      required
                      value={editGwa}
                      onChange={(e) => setEditGwa(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Units</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={editUnits}
                      onChange={(e) => setEditUnits(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Failed</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={editFailed}
                      onChange={(e) => setEditFailed(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">INC</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={editIncomplete}
                      onChange={(e) => setEditIncomplete(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Dropped</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={editDropped}
                      onChange={(e) => setEditDropped(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Updated Grade-Document Reference</label>
                  <input
                    type="text"
                    required
                    value={editEvidence}
                    onChange={(e) => setEditEvidence(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Correction Note</label>
                  <input
                    type="text"
                    value={correctionNote}
                    onChange={(e) => setCorrectionNote(e.target.value)}
                    placeholder="Describe what was corrected"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-4 py-2 text-xs font-medium bg-blue-800 hover:bg-blue-900 text-white rounded-md transition-colors disabled:opacity-60"
                >
                  Resubmit Corrected Record
                </button>
              </form>
            </section>
          )}

          {/* Compliance Evaluation & Policy Checks */}
          <section className="pb-6 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  2. Policy Compliance Evaluation
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluated dynamically against persisted {submission.program_name} thresholds
                  {program ? ` (Max GWA ${program.max_gwa.toFixed(2)}, Min ${program.min_units} units)` : ''}.
                </p>
              </div>
              {user.role === 'staff' && (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={handleEvaluate}
                  className="px-4 py-2 text-xs font-medium bg-blue-800 hover:bg-blue-900 text-white rounded-md transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  Evaluate Compliance
                </button>
              )}
            </div>

            {submission.deficiency_reasons.length > 0 && (
              <div className="p-3.5 rounded-md border border-red-200 bg-red-50 space-y-1">
                <p className="text-xs font-semibold text-red-900">Deficiency Reasons</p>
                <ul className="list-disc pl-4 text-xs text-red-800 space-y-0.5">
                  {submission.deficiency_reasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {submission.policy_checks.length > 0 ? (
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Policy Criterion</th>
                      <th className="px-3 py-2 font-medium">Required</th>
                      <th className="px-3 py-2 font-medium">Actual</th>
                      <th className="px-3 py-2 font-medium text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {submission.policy_checks.map((chk) => (
                      <tr key={chk.rule}>
                        <td className="px-3 py-2 font-medium text-slate-800">{chk.rule}</td>
                        <td className="px-3 py-2 font-mono tabular-nums text-slate-600">{chk.expected}</td>
                        <td className="px-3 py-2 font-mono tabular-nums text-slate-800">{chk.actual}</td>
                        <td className="px-3 py-2 text-right">
                          {chk.passed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                              <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                              Fail
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Not yet evaluated. Evidence must be Verified before running compliance evaluation.
              </p>
            )}
          </section>

          {/* Staff Renewal Decision Controls */}
          {user.role === 'staff' && (
            <section className="pb-6 border-b border-slate-200 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">3. Renewal Decision Authority</h3>
                <p className="text-xs text-slate-500">
                  Approval requires Verified evidence and Compliant evaluation. Deficient records may only be Held.
                </p>
              </div>

              <div>
                <label htmlFor="decision-notes" className="block text-xs text-slate-600 mb-1">
                  Renewal Decision Notes
                </label>
                <input
                  id="decision-notes"
                  type="text"
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Enter decision rationale for the permanent audit log"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleRenewalDecision('Approved')}
                  className="px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  Approve Renewal
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => handleRenewalDecision('Held')}
                  className="px-4 py-2 text-xs font-medium bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  Hold Renewal
                </button>
              </div>
            </section>
          )}

          {/* Immutable Audit History */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Audit Trail &amp; Decision History</h3>
            {loadingLogs ? (
              <p className="text-xs text-slate-500">Loading audit history...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No audit entries recorded yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-md divide-y divide-slate-200">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-3.5 py-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{log.action_type}</span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {formatManilaTimestamp(log.created_at)}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      <span className="font-medium text-slate-800">{log.actor_name}</span> ({log.actor_role})
                      {' · '}
                      <span>
                        {log.previous_state} → {log.new_state}
                      </span>
                    </p>
                    {log.notes && <p className="text-slate-700">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
