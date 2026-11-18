import React, { useEffect, useState } from 'react';
import { ArrowRight, GraduationCap, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { api } from '../lib/api';
import { probeSupabaseSchema, type SupabaseSchemaProbeResult } from '../lib/supabase';
import type { AuthUser, SyntheticAccountOption } from '../types';

interface LoginViewProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onAuthenticated }) => {
  const [accounts, setAccounts] = useState<SyntheticAccountOption[]>([]);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [programId, setProgramId] = useState('PROG-EXC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseSchemaProbeResult | null>(null);

  useEffect(() => {
    api
      .getSyntheticAccounts()
      .then((res) => setAccounts(res.accounts))
      .catch(() => {});
    probeSupabaseSchema().then(setSupabaseStatus).catch(() => {});
  }, []);

  const handleSyntheticSignIn = async (accountCode: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.syntheticLogin(accountCode);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with synthetic account.');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        onAuthenticated(res.user);
      } else {
        const res = await api.register({ email, password, fullName, programId });
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <GraduationCap className="w-5 h-5 text-blue-800" aria-hidden="true" />
            <span className="font-display font-bold text-lg tracking-tight text-slate-900">
              AcadGrant Compliance
            </span>
          </div>
          <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
            Office of Scholarship Administration · AY 2026–2027
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: System Overview & Synthetic Test Accounts */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800 mb-2">
                Student Scholarship Monitoring &amp; Academic Compliance System
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance mb-3">
                Verify academic evidence, evaluate grant policies, and govern renewals.
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Scholars submit semester academic summaries and grade-document references. Scholarship Staff
                verify supporting evidence, run policy checks against Excellence Scholar and Access Scholar
                thresholds, and record auditable renewal decisions without altering official Registrar grades.
              </p>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Synthetic Test Accounts (Seeded Baseline)
                  </h2>
                  <span className="text-xs text-slate-500">Select a role to start an authenticated session</span>
                </div>

                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md overflow-hidden">
                  {accounts.map((acc) => (
                    <button
                      key={acc.accountCode}
                      type="button"
                      disabled={loading}
                      onClick={() => handleSyntheticSignIn(acc.accountCode)}
                      className="w-full text-left px-4 py-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:opacity-60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          {acc.role === 'staff' ? (
                            <ShieldCheck className="w-4 h-4 text-blue-800 shrink-0" aria-hidden="true" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                          )}
                          <span className="truncate">{acc.fullName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                          <span>{acc.accountCode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{acc.role === 'staff' ? 'Scholarship Staff' : 'Scholar'}</span>
                          {acc.programName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-sans">{acc.programName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-800 whitespace-nowrap shrink-0">
                        Sign in
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                  {accounts.length === 0 && (
                    <div className="px-4 py-6 text-xs text-slate-500 text-center">
                      Loading seeded accounts...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {supabaseStatus && (
              <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
                <span className="font-medium text-slate-700">Database Persistence: </span>
                {supabaseStatus.message}
              </div>
            )}
          </section>

          {/* Right Column: Standard Email & Password Form */}
          <section className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-md mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    mode === 'login'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Account Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    mode === 'register'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Scholar
                </button>
              </div>

              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                {mode === 'login' ? 'Sign in with credentials' : 'Create synthetic scholar account'}
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                {mode === 'login'
                  ? 'Authenticate to access your role-scoped scholarship workspace.'
                  : 'Register a new scholar record assigned to an active scholarship program.'}
              </p>

              {error && (
                <div
                  role="alert"
                  className="mb-4 p-3 rounded-md border border-red-200 bg-red-50 text-xs text-red-800"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label htmlFor="reg-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Andrea Lim"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Institutional Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@acadgrant.edu"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                  />
                </div>

                {mode === 'register' && (
                  <div>
                    <label htmlFor="reg-program" className="block text-xs font-medium text-slate-700 mb-1.5">
                      Scholarship Program
                    </label>
                    <select
                      id="reg-program"
                      value={programId}
                      onChange={(e) => setProgramId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-700"
                    >
                      <option value="PROG-EXC">Excellence Scholar (Max GWA 2.00)</option>
                      <option value="PROG-ACC">Access Scholar (Max GWA 2.50)</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Lock className="w-4 h-4" aria-hidden="true" />
                  <span>{mode === 'login' ? 'Sign In' : 'Create Scholar Account'}</span>
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
              Access control is enforced server-side via signed HttpOnly session cookies and database role checks.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
