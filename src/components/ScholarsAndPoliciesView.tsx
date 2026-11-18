import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import type { AuthUser, ScholarAssignment, ScholarshipProgram } from '../types';
import { formatManilaTimestamp } from './SubmissionDrawer';

interface ScholarsAndPoliciesViewProps {
  user: AuthUser;
  scholars: ScholarAssignment[];
  programs: ScholarshipProgram[];
  onRefresh: () => Promise<void>;
}

export const ScholarsAndPoliciesView: React.FC<ScholarsAndPoliciesViewProps> = ({
  user,
  scholars,
  programs,
  onRefresh,
}) => {
  const [scholarCode, setScholarCode] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [programId, setProgramId] = useState('PROG-EXC');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRegisterScholar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await api.createScholar({
        scholar_code: scholarCode,
        student_number: studentNumber,
        full_name: fullName,
        email,
        program_id: programId,
      });
      setMessage(`Registered scholar ${res.scholar.scholar_code} (${res.scholar.full_name}) under ${res.scholar.program_name}.`);
      setScholarCode('');
      setStudentNumber('');
      setFullName('');
      setEmail('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register scholar.');
    } finally {
      setBusy(false);
    }
  };

  const handleProgramReassign = async (code: string, nextProgramId: string) => {
    setError(null);
    setMessage(null);
    try {
      const res = await api.updateScholarProgram(code, nextProgramId);
      setMessage(`Updated ${code} assignment to ${res.scholar.program_name}.`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign program.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="p-3.5 rounded-md border border-red-200 bg-red-50 text-xs text-red-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div role="status" className="p-3.5 rounded-md border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {/* Persisted Policy Records */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Persisted Scholarship Policy Thresholds</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluation reads thresholds directly from these persisted database records (Asia/Manila deadline).
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Program ID</th>
                <th className="px-4 py-3 font-medium">Program Name</th>
                <th className="px-4 py-3 font-medium text-right">Max GWA</th>
                <th className="px-4 py-3 font-medium text-right">Min Units</th>
                <th className="px-4 py-3 font-medium text-right">Failed</th>
                <th className="px-4 py-3 font-medium text-right">INC</th>
                <th className="px-4 py-3 font-medium text-right">Dropped</th>
                <th className="px-4 py-3 font-medium">Deadline (Asia/Manila)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {programs.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-600">{p.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-900">
                    {p.max_gwa.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-900">{p.min_units}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-900">
                    {p.allowed_failed}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-900">
                    {p.allowed_incomplete}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-900">
                    {p.allowed_dropped}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-700">
                    {formatManilaTimestamp(p.deadline_iso)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {user.role === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Register Scholar Form */}
          <section className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Register Synthetic Scholar</h3>
            <p className="text-xs text-slate-500 mb-4">
              Assign a scholar to either the Excellence Scholar or Access Scholar policy record.
            </p>
            <form onSubmit={handleRegisterScholar} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Scholar ID</label>
                <input
                  type="text"
                  required
                  value={scholarCode}
                  onChange={(e) => setScholarCode(e.target.value)}
                  placeholder="e.g. B07"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Student Number</label>
                <input
                  type="text"
                  required
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="e.g. 2026-00107"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Patricia Soriano"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="b07@acadgrant.edu"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Policy</label>
                <select
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-60"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>{busy ? 'Registering...' : 'Register & Assign Policy'}</span>
              </button>
            </form>
          </section>

          {/* Assigned Scholars Table */}
          <section className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Assigned Scholars ({scholars.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Scholar ID</th>
                    <th className="px-4 py-3 font-medium">Student No.</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Assigned Program</th>
                    <th className="px-4 py-3 font-medium">Award Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {scholars.map((s) => (
                    <tr key={s.scholar_code} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">{s.scholar_code}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-600">{s.student_number}</td>
                      <td className="px-4 py-3 text-slate-900">
                        <div className="font-medium">{s.full_name}</div>
                        <div className="text-slate-500">{s.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Program for ${s.scholar_code}`}
                          value={s.program_id}
                          onChange={(e) => handleProgramReassign(s.scholar_code, e.target.value)}
                          className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-800"
                        >
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.award_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
