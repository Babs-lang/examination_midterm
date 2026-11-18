import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  FilePlus2,
  FlaskConical,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { AnalysisAndDesignView } from './components/AnalysisAndDesignView';
import { FunctionalTestsView } from './components/FunctionalTestsView';
import { LoginView } from './components/LoginView';
import { ScholarsAndPoliciesView } from './components/ScholarsAndPoliciesView';
import { ScholarSubmissionForm } from './components/ScholarSubmissionForm';
import { formatManilaTimestamp, SubmissionDrawer } from './components/SubmissionDrawer';
import { api } from './lib/api';
import type {
  AuditLogEntry,
  AuthUser,
  DashboardSummary,
  ScholarAssignment,
  ScholarshipProgram,
  SemesterSubmission,
} from './types';

type NavTab = 'dashboard' | 'submit' | 'scholars' | 'audit' | 'analysis' | 'tests';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [semester, setSemester] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [complianceFilter, setComplianceFilter] = useState('ALL');

  // Data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [submissions, setSubmissions] = useState<SemesterSubmission[]>([]);
  const [programs, setPrograms] = useState<ScholarshipProgram[]>([]);
  const [scholars, setScholars] = useState<ScholarAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected submission drawer
  const [selectedSubmission, setSelectedSubmission] = useState<SemesterSubmission | null>(null);

  useEffect(() => {
    api
      .getMe()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const loadWorkspaceData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    setLoadError(null);
    try {
      const [dashRes, subRes, progRes, schRes, audRes] = await Promise.all([
        api.getDashboard(academicYear, semester),
        api.getSubmissions({
          academicYear,
          semester: semester === 0 ? undefined : semester,
          search: searchQuery,
          programId: programFilter,
          complianceStatus: complianceFilter,
        }),
        api.getPrograms(),
        api.getScholars(),
        api.getAuditLogs(),
      ]);

      setSummary(dashRes.summary);
      setSubmissions(subRes.submissions);
      setPrograms(progRes.programs);
      setScholars(schRes.scholars);
      setAuditLogs(audRes.logs);

      setSelectedSubmission((prev) => {
        if (!prev) return null;
        return subRes.submissions.find((s) => s.id === prev.id) || prev;
      });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load workspace records.');
    } finally {
      setDataLoading(false);
    }
  }, [user, academicYear, semester, searchQuery, programFilter, complianceFilter]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    setSelectedSubmission(null);
    setActiveTab('dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return (
      <LoginView
        onAuthenticated={(authedUser) => {
          setUser(authedUser);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'dashboard',
      label: user.role === 'staff' ? 'Dashboard' : 'My Submissions',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'submit',
      label: 'Submit Grades',
      icon: <FilePlus2 className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'scholars',
      label: user.role === 'staff' ? 'Scholars & Policies' : 'Program Policy',
      icon: <Users className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'audit',
      label: 'Audit History',
      icon: <History className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'analysis',
      label: 'Analysis (Part I)',
      icon: <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'tests',
      label: 'Tests (TC01–TC10)',
      icon: <FlaskConical className="w-4 h-4 shrink-0" aria-hidden="true" />,
    },
  ];

  const activeTabTitle = navItems.find((n) => n.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2.5">
          <GraduationCap className="w-5 h-5 text-blue-800 shrink-0" aria-hidden="true" />
          <span className="font-display font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
            AcadGrant
          </span>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-slate-900 truncate">{user.fullName}</p>
            <p className="text-slate-500 mt-0.5">
              {user.role === 'staff' ? 'Scholarship Staff' : `Scholar · ${user.scholarCode}`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Switch Account / Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/35" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-64 bg-white h-full border-r border-slate-200 flex flex-col z-10">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-display font-bold text-base text-slate-900">AcadGrant</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === item.id ? 'bg-blue-50 text-blue-900' : 'text-slate-600'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 px-3 text-xs font-medium text-slate-700 border border-slate-300 rounded-md"
              >
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb on Left, Single Primary Action on Right */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
              <span className="font-medium text-slate-700 whitespace-nowrap">Scholarship Office</span>
              <span aria-hidden="true">/</span>
              <span className="font-mono whitespace-nowrap">
                AY {academicYear} Sem {semester === 0 ? 'All' : semester}
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-slate-900 truncate">{activeTabTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className="px-4 py-2 text-xs font-medium bg-blue-800 hover:bg-blue-900 text-white rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              + Submit Grades
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-6 max-w-[1440px] w-full mx-auto space-y-6">
          {loadError && (
            <div role="alert" className="p-3.5 rounded-md border border-red-200 bg-red-50 text-xs text-red-800">
              {loadError}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <>
              {/* KPI Strip (Full-Width 4-Column Row) */}
              <section aria-label="Semester summary metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-slate-500">
                    {user.role === 'staff' ? 'Total Assigned Scholars' : 'Assigned Grant'}
                  </p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                    {summary ? summary.total_assigned_scholars : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {user.role === 'staff' ? `AY ${academicYear} Sem ${semester || 1}` : scholars[0]?.program_name || 'Active'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-slate-500">Pending Verification</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1.5">
                    {summary ? summary.pending_verification : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Awaiting staff evidence check</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-slate-500">Compliant</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1.5">
                    {summary ? summary.compliant : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Passed all policy thresholds</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <p className="text-xs font-medium text-slate-500">With Deficiency</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-1.5">
                    {summary ? summary.with_deficiency : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Policy check flagged review</p>
                </div>
              </section>

              {/* Search & Filter Toolbar */}
              <section className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Scholar ID (e.g. B01), Student No., or Name..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    aria-label="Academic Year"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white font-mono"
                  >
                    <option value="2026-2027">AY 2026-2027</option>
                    <option value="2027-2028">AY 2027-2028</option>
                  </select>

                  <select
                    aria-label="Semester"
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                    <option value={0}>All Semesters</option>
                  </select>

                  <select
                    aria-label="Filter by Program"
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="ALL">All Programs</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by Compliance"
                    value={complianceFilter}
                    onChange={(e) => setComplianceFilter(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
                  >
                    <option value="ALL">All Compliance</option>
                    <option value="Compliant">Compliant</option>
                    <option value="With Deficiency">With Deficiency</option>
                    <option value="Not Evaluated">Not Evaluated</option>
                  </select>
                </div>
              </section>

              {/* Submissions Table */}
              <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h1 className="text-base font-bold text-slate-900">
                      {user.role === 'staff' ? 'Semester Submissions & Compliance Queue' : 'My Grade Submissions'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select any record to inspect evidence, evaluate policy rules, correct returned items, or record renewal decisions.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {submissions.length} record{submissions.length === 1 ? '' : 's'}
                  </span>
                </div>

                {dataLoading && submissions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">Loading submissions...</div>
                ) : submissions.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <p className="text-sm font-medium text-slate-800">No submissions match the selected filters.</p>
                    <p className="text-xs text-slate-500">
                      Try clearing your search or submit a new semester grade summary.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('submit')}
                      className="px-4 py-2 text-xs font-medium bg-blue-800 text-white rounded-md"
                    >
                      Submit Grades
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="px-4 py-3 font-medium">Scholar</th>
                          <th className="px-4 py-3 font-medium">Program</th>
                          <th className="px-4 py-3 font-medium">Term</th>
                          <th className="px-4 py-3 font-medium text-right">GWA</th>
                          <th className="px-4 py-3 font-medium text-right">Units</th>
                          <th className="px-4 py-3 font-medium text-right">F / I / D</th>
                          <th className="px-4 py-3 font-medium">Verification</th>
                          <th className="px-4 py-3 font-medium">Compliance</th>
                          <th className="px-4 py-3 font-medium">Renewal</th>
                          <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {submissions.map((sub) => (
                          <tr
                            key={sub.id}
                            onClick={() => setSelectedSubmission(sub)}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900">{sub.scholar_name}</div>
                              <div className="font-mono tabular-nums text-slate-500">
                                {sub.scholar_code} · {sub.student_number}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{sub.program_name}</td>
                            <td className="px-4 py-3 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {sub.academic_year} S{sub.semester}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-right font-semibold text-slate-900">
                              {sub.gwa.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-800">
                              {sub.enrolled_units}
                            </td>
                            <td className="px-4 py-3 font-mono tabular-nums text-right text-slate-700">
                              {sub.failed_count} / {sub.incomplete_count} / {sub.dropped_count}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {sub.verification_status === 'Verified' && (
                                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                                  <FileCheck2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  Verified
                                </span>
                              )}
                              {sub.verification_status === 'Pending Verification' && (
                                <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                                  <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  Pending
                                </span>
                              )}
                              {sub.verification_status === 'Returned' && (
                                <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
                                  <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  Returned
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {sub.compliance_status === 'Compliant' && (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  Compliant
                                </span>
                              )}
                              {sub.compliance_status === 'With Deficiency' && (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  With Deficiency
                                </span>
                              )}
                              {sub.compliance_status === 'Not Evaluated' && (
                                <span className="text-slate-500">Not Evaluated</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                              {sub.renewal_decision}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSubmission(sub);
                                }}
                                className="inline-flex items-center gap-1 text-blue-800 hover:text-blue-950 font-medium"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'submit' && (
            <ScholarSubmissionForm
              user={user}
              scholars={scholars}
              programs={programs}
              onSubmitted={async (created) => {
                await loadWorkspaceData();
                setSelectedSubmission(created);
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'scholars' && (
            <ScholarsAndPoliciesView
              user={user}
              scholars={scholars}
              programs={programs}
              onRefresh={loadWorkspaceData}
            />
          )}

          {activeTab === 'audit' && (
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-base font-bold text-slate-900">
                  Verification, Evaluation &amp; Renewal Audit History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Role-scoped immutable activity log with actor, state transitions, and Asia/Manila timestamps.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Timestamp</th>
                      <th className="px-4 py-3 font-medium">Scholar</th>
                      <th className="px-4 py-3 font-medium">Actor</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="px-4 py-3 font-medium">Transition</th>
                      <th className="px-4 py-3 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {formatManilaTimestamp(log.created_at)}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{log.scholar_code}</td>
                        <td className="px-4 py-3 text-slate-800">
                          {log.actor_name} <span className="text-slate-500">({log.actor_role})</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">{log.action_type}</td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                          {log.previous_state} → {log.new_state}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{log.notes}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          No audit log entries recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'analysis' && <AnalysisAndDesignView />}

          {activeTab === 'tests' && (
            <FunctionalTestsView user={user} onDataChanged={loadWorkspaceData} />
          )}
        </main>
      </div>

      {selectedSubmission && (
        <SubmissionDrawer
          submission={selectedSubmission}
          user={user}
          program={programs.find((p) => p.id === selectedSubmission.program_id)}
          onClose={() => setSelectedSubmission(null)}
          onUpdated={async (updated) => {
            setSelectedSubmission(updated);
            await loadWorkspaceData();
          }}
        />
      )}
    </div>
  );
}
