import React, { useState } from 'react';
import { CheckCircle2, Download, Play, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import type { AuthUser } from '../types';

interface FunctionalTestsViewProps {
  user: AuthUser;
  onDataChanged: () => Promise<void>;
}

interface TestResultRow {
  testId: string;
  name: string;
  inputOrAction: string;
  expectedResult: string;
  actualResult: string;
  passed: boolean;
  evidenceRef: string;
}

const BASELINE_TEST_CASES: Array<Omit<TestResultRow, 'actualResult' | 'passed'>> = [
  {
    testId: 'TC01',
    name: 'Valid boundary (B01)',
    inputOrAction: 'Evaluate record B01 (Excellence, GWA 2.00, 18 units, at exact deadline)',
    expectedResult: 'Compliant at exact GWA and deadline boundaries.',
    evidenceRef: 'Record B01',
  },
  {
    testId: 'TC02',
    name: 'GWA above limit (B02)',
    inputOrAction: 'Evaluate record B02 (Excellence, GWA 2.01 vs 2.00 max)',
    expectedResult: 'With Deficiency citing GWA threshold exceeded.',
    evidenceRef: 'Record B02',
  },
  {
    testId: 'TC03',
    name: 'Program variation (B03)',
    inputOrAction: 'Evaluate record B03 (Access Scholar, 1 dropped subject)',
    expectedResult: 'Compliant because Access Scholar permits 1 dropped subject.',
    evidenceRef: 'Record B03',
  },
  {
    testId: 'TC04',
    name: 'Multiple deficiencies (B04)',
    inputOrAction: 'Evaluate record B04 (Access Scholar, 14 units, 1 INC)',
    expectedResult: 'With Deficiency identifying both insufficient units and incomplete grade.',
    evidenceRef: 'Record B04',
  },
  {
    testId: 'TC05',
    name: 'Failure and lateness (B05)',
    inputOrAction: 'Evaluate record B05 (Excellence, 1 failed subject, 1 minute late)',
    expectedResult: 'With Deficiency identifying failing subject and late submission.',
    evidenceRef: 'Record B05',
  },
  {
    testId: 'TC06',
    name: 'Verification gate (B06)',
    inputOrAction: 'Attempt evaluation and renewal approval for Pending record B06',
    expectedResult: 'Both blocked until evidence is verified and compliance evaluated.',
    evidenceRef: 'Record B06',
  },
  {
    testId: 'TC07',
    name: 'Duplicate & invalid input',
    inputOrAction: 'Submit duplicate AY 2026-2027 Sem 1, GWA 0.50, and negative count',
    expectedResult: 'Rejected with HTTP 409 / 400 and clear error message.',
    evidenceRef: 'Validation & Unique Key',
  },
  {
    testId: 'TC08',
    name: 'Role isolation',
    inputOrAction: 'Scholar requests another scholar submission and verification endpoint',
    expectedResult: 'Backend denies access with HTTP 403 Forbidden.',
    evidenceRef: 'Backend RBAC Middleware',
  },
  {
    testId: 'TC09',
    name: 'Persistence & correction',
    inputOrAction: 'Return B06, correct and resubmit, re-query after persistence',
    expectedResult: 'Status returns to Pending Verification with preserved history.',
    evidenceRef: 'SQLite + Audit Log',
  },
  {
    testId: 'TC10',
    name: 'Renewal authority',
    inputOrAction: 'Staff approve compliant B01, hold deficient B02; scholar cannot decide',
    expectedResult: 'B01 Approved, deficient approval blocked, B02 Held, scholar HTTP 403.',
    evidenceRef: 'Renewal Gate',
  },
];

export const FunctionalTestsView: React.FC<FunctionalTestsViewProps> = ({ user, onDataChanged }) => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResultRow[] | null>(null);
  const [executedAt, setExecutedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probeOutput, setProbeOutput] = useState<string | null>(null);

  const handleRunSuite = async () => {
    setError(null);
    setRunning(true);
    try {
      const res = await api.runTestSuite();
      setResults(res.results);
      setExecutedAt(res.executedAt);
      await onDataChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to execute test suite.');
    } finally {
      setRunning(false);
    }
  };

  const handleResetSeed = async () => {
    setError(null);
    setRunning(true);
    try {
      await api.resetSeedData();
      await onDataChanged();
      setProbeOutput('Seed records B01–B06 restored to baseline state.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset seed data.');
    } finally {
      setRunning(false);
    }
  };

  const handleRoleIsolationProbe = async () => {
    setProbeOutput(null);
    const targetSubId = user.scholarCode === 'B02' ? 'sub-b01-2026-1' : 'sub-b02-2026-1';
    const readRes = await fetch(`/api/submissions/${targetSubId}`, { credentials: 'include' });
    const readJson = await readRes.json().catch(() => ({}));
    const verifyRes = await fetch('/api/submissions/sub-b06-2026-1/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'Verified', reason: 'Direct API probe' }),
    });
    const verifyJson = await verifyRes.json().catch(() => ({}));

    setProbeOutput(
      `Role: ${user.role} (${user.accountCode || user.email}) | GET /api/submissions/${targetSubId} -> HTTP ${readRes.status} (${JSON.stringify(readJson)}) | POST /api/submissions/sub-b06-2026-1/verify -> HTTP ${verifyRes.status} (${JSON.stringify(verifyJson)})`
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Mandatory Functional Tests (TC01–TC10)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Executes live HTTP verification checks against the running backend API and seeded B01–B06 records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/api/export/submission-zip"
              download="SAD_Exam_Section_B_StudentID.zip"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Submission ZIP</span>
            </a>

            <button
              type="button"
              onClick={handleRoleIsolationProbe}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-md transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Probe Backend Access Control</span>
            </button>

            {user.role === 'staff' && (
              <>
                <button
                  type="button"
                  disabled={running}
                  onClick={handleResetSeed}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Baseline Seed</span>
                </button>
                <button
                  type="button"
                  disabled={running}
                  onClick={handleRunSuite}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-800 hover:bg-blue-900 text-white rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{running ? 'Executing TC01–TC10...' : 'Run Live Verification Suite'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-4 p-3 rounded-md border border-red-200 bg-red-50 text-xs text-red-800">
            {error}
          </div>
        )}

        {probeOutput && (
          <div className="mt-4 p-3.5 rounded-md border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 break-all">
            {probeOutput}
          </div>
        )}

        {results && executedAt && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
            <span>
              Suite Summary:{' '}
              <strong className="text-emerald-700 font-semibold">
                {results.filter((r) => r.passed).length} / {results.length} Passed
              </strong>
            </span>
            <span className="font-mono tabular-nums">Executed: {executedAt}</span>
          </div>
        )}

        <div className="mt-5 border border-slate-200 rounded-md overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-3 py-2.5 font-medium w-16">Test ID</th>
                <th className="px-3 py-2.5 font-medium">Input / Action</th>
                <th className="px-3 py-2.5 font-medium">Expected Result</th>
                <th className="px-3 py-2.5 font-medium">Actual Result</th>
                <th className="px-3 py-2.5 font-medium w-24">Status</th>
                <th className="px-3 py-2.5 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(results ||
                BASELINE_TEST_CASES.map((tc) => ({
                  ...tc,
                  actualResult: user.role === 'staff' ? 'Click "Run Live Verification Suite" to execute' : 'Sign in as Staff to run full suite',
                  passed: false,
                }))
              ).map((row) => (
                <tr key={row.testId} className="hover:bg-slate-50">
                  <td className="px-3 py-3 font-mono font-semibold text-slate-900">{row.testId}</td>
                  <td className="px-3 py-3 text-slate-800">{row.inputOrAction}</td>
                  <td className="px-3 py-3 text-slate-600">{row.expectedResult}</td>
                  <td className="px-3 py-3 font-mono text-slate-700">{row.actualResult}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {!results ? (
                      <span className="text-slate-500">Not Run</span>
                    ) : row.passed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        FAIL
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{row.evidenceRef}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
