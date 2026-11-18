import React, { useState } from 'react';

type SectionKey = 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6';

export const AnalysisAndDesignView: React.FC = () => {
  const [section, setSection] = useState<SectionKey>('a1');

  const tabs: Array<{ id: SectionKey; label: string }> = [
    { id: 'a1', label: 'A1 Investigation' },
    { id: 'a2', label: 'A2 Stakeholders' },
    { id: 'a3', label: 'A3 Requirements & Rules' },
    { id: 'a4', label: 'A4 UML Use Cases' },
    { id: 'a5', label: 'A5 Use Case Specs & ERD' },
    { id: 'a6', label: 'A6 Traceability' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Part I: Systems Analysis &amp; Design Baseline
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Requirements baseline, UML use case model, detailed specifications, ERD, and traceability matrix.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-md">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSection(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  section === t.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* A1 Investigation & Planning */}
        {section === 'a1' && (
          <div className="pt-6 space-y-6 text-sm text-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Problem Statement</h3>
              <p className="leading-relaxed">
                The Scholarship Office administers Excellence Scholar and Access Scholar grants using disconnected
                spreadsheets, email attachments, and paper grade records. This manual workflow causes duplicate
                semester submissions, unverified grade inputs, inconsistent policy evaluation across grant tiers,
                missed deadlines, and delayed renewal decisions while leaving scholars without reliable visibility
                into whether submissions were received, verified, or returned for correction.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Problem, Cause, and Effect Matrix
              </h3>
              <div className="border border-slate-200 rounded-md overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">ID</th>
                      <th className="px-4 py-2.5 font-medium">Problem</th>
                      <th className="px-4 py-2.5 font-medium">Root Cause</th>
                      <th className="px-4 py-2.5 font-medium">Operational Effect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-4 py-2.5 font-mono">P01</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">Duplicate semester entries</td>
                      <td className="px-4 py-2.5">Manual spreadsheet rows lack composite uniqueness keys.</td>
                      <td className="px-4 py-2.5">Conflicting GWA records delay renewal sign-off.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono">P02</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">Unverified grade evaluations</td>
                      <td className="px-4 py-2.5">No enforced gate between email attachments and spreadsheet formulas.</td>
                      <td className="px-4 py-2.5">Renewals risk being approved on unverified claims.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono">P03</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">Inconsistent policy application</td>
                      <td className="px-4 py-2.5">Thresholds are copied manually rather than read from program rules.</td>
                      <td className="px-4 py-2.5">Access vs. Excellence dropped/GWA rules are misapplied.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-mono">P04</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">Opaque submission status</td>
                      <td className="px-4 py-2.5">Scholars have no self-service view of verification or return reasons.</td>
                      <td className="px-4 py-2.5">Repeated follow-up emails and missed correction windows.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Scope &amp; Exclusions</h3>
                <ul className="list-disc pl-5 text-xs space-y-1.5 leading-relaxed">
                  <li>
                    <strong>In Scope:</strong> Role-based authentication (Scholar, Scholarship Staff), scholar-program
                    assignment, semester grade summary submission with unique term enforcement, evidence
                    verification/return workflow, policy-driven compliance evaluation, staff renewal decisions,
                    cohort dashboard/search, and immutable audit logging.
                  </li>
                  <li>
                    <strong>Exclusions:</strong> Modifying official Registrar grades, disbursing stipend payments,
                    live Registrar SIS API integration, SMS gateways, machine learning models, and multi-tier
                    policy exception appeals.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Development Tasks &amp; Risks</h3>
                <ul className="list-disc pl-5 text-xs space-y-1.5 leading-relaxed">
                  <li>
                    <strong>Tasks:</strong> (1) Schema, unique constraints &amp; RLS/RBAC auth; (2) Scholar assignment
                    &amp; grade submission validation; (3) Verification, return/resubmit &amp; policy compliance engine;
                    (4) Dashboard, audit history &amp; TC01–TC10 verification.
                  </li>
                  <li>
                    <strong>Risk 1 — Client-only access hiding:</strong> Mitigated by enforcing role &amp; ownership
                    checks in Express API middleware and Supabase RLS policies.
                  </li>
                  <li>
                    <strong>Risk 2 — Timezone boundary drift:</strong> Mitigated by explicitly storing ISO-8601
                    timestamps and evaluating deadlines in Asia/Manila (+08:00).
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* A2 Stakeholders & Elicitation */}
        {section === 'a2' && (
          <div className="pt-6 space-y-6 text-sm text-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                Stakeholders vs. System Actors
              </h3>
              <div className="border border-slate-200 rounded-md overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Stakeholder</th>
                      <th className="px-4 py-2.5 font-medium">System Actor?</th>
                      <th className="px-4 py-2.5 font-medium">Role &amp; Interest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">Scholar (Student Grantee)</td>
                      <td className="px-4 py-2.5 font-medium text-emerald-700">Yes — Primary Actor</td>
                      <td className="px-4 py-2.5">Submits semester grades, tracks verification, corrects returned entries.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">Scholarship Staff</td>
                      <td className="px-4 py-2.5 font-medium text-emerald-700">Yes — Primary Actor</td>
                      <td className="px-4 py-2.5">Registers scholars, verifies evidence, evaluates compliance, decides renewal.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">University Registrar</td>
                      <td className="px-4 py-2.5 text-slate-600">No — External Source</td>
                      <td className="px-4 py-2.5">Remains authoritative source of official grades; issues document references.</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-slate-900">Scholarship Committee / Finance</td>
                      <td className="px-4 py-2.5 text-slate-600">No — Downstream Consumer</td>
                      <td className="px-4 py-2.5">Relies on compliance reports and approved renewal rosters for grant continuity.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Open-Ended Elicitation Questions</h3>
              <ol className="list-decimal pl-5 text-xs space-y-2 leading-relaxed">
                <li>
                  <strong>Verification:</strong> What exact supporting grade-document reference must staff inspect
                  before marking a submission Verified, and what reasons most commonly trigger a return?
                </li>
                <li>
                  <strong>Deadlines:</strong> How should submissions received at the exact deadline minute in
                  Asia/Manila time be treated compared to submissions arriving one minute afterward?
                </li>
                <li>
                  <strong>Policy Exceptions:</strong> When a scholar fails a criterion, should compliance evaluation
                  automatically revoke their award or flag the record as With Deficiency while leaving final renewal
                  authority to staff?
                </li>
                <li>
                  <strong>Access Control:</strong> Which student attributes and audit logs must be strictly isolated
                  per scholar versus visible across the Scholarship Office cohort?
                </li>
                <li>
                  <strong>Corrections:</strong> When a submission is returned for missing or mismatched evidence, how
                  should prior verification notes and resubmission timestamps be preserved?
                </li>
                <li>
                  <strong>Reports &amp; Monitoring:</strong> Which semester-level summary counts and filters do staff
                  need on the dashboard to prioritize pending verifications before renewal sign-off?
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* A3 Requirements & Business Rules */}
        {section === 'a3' && (
          <div className="pt-6 space-y-6 text-xs text-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Functional Requirements (FR01–FR10)</h3>
              <div className="border border-slate-200 rounded-md overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-medium w-20">ID</th>
                      <th className="px-3 py-2 font-medium">Testable Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      ['FR01', 'Authenticate users and enforce backend role isolation so Scholars read only their own records and Staff manage all records.'],
                      ['FR02', 'Allow Staff to register scholars and assign one of the persisted policy records (Excellence Scholar or Access Scholar).'],
                      ['FR03', 'Allow Scholars to submit AY, semester, GWA (1.00–5.00), nonnegative units/counts, and grade-document reference with timestamp.'],
                      ['FR04', 'Reject duplicate (scholar, academic_year, semester) submissions with HTTP 409 and clear validation errors.'],
                      ['FR05', 'Allow Staff to mark submitted evidence Verified or Returned with a mandatory return reason.'],
                      ['FR06', 'Allow Scholars to correct and resubmit Returned records, resetting verification status to Pending Verification.'],
                      ['FR07', 'Block compliance evaluation and renewal approval until verification_status equals Verified.'],
                      ['FR08', 'Evaluate verified submissions dynamically against the assigned persisted program thresholds and list specific deficiency reasons.'],
                      ['FR09', 'Allow Staff to record Approved or Held renewal decisions, blocking approval when compliance is With Deficiency.'],
                      ['FR10', 'Provide semester dashboard counters, search/filtering by ID/name/program/compliance, and immutable actor-timestamped audit logs.'],
                    ].map(([id, desc]) => (
                      <tr key={id}>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-900">{id}</td>
                        <td className="px-3 py-2">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Non-Functional Requirements (NFR01–NFR04)</h3>
                <ul className="space-y-2 border border-slate-200 rounded-md p-4">
                  <li><strong>NFR01 Security:</strong> 100% of unauthorized cross-scholar reads or staff actions return HTTP 403/401 server-side; zero secrets in client bundles.</li>
                  <li><strong>NFR02 Persistence:</strong> Committed submissions, decisions, and audit logs survive page reloads and server restarts via SQLite WAL / PostgreSQL.</li>
                  <li><strong>NFR03 Performance:</strong> Dashboard queries and compliance evaluations complete in under 300ms for cohort datasets.</li>
                  <li><strong>NFR04 Auditability:</strong> Every verification, resubmission, evaluation, and renewal change records actor, role, prior state, new state, and ISO timestamp.</li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">Business Rules (BR01–BR06)</h3>
                <ul className="space-y-2 border border-slate-200 rounded-md p-4">
                  <li><strong>BR01 Scale &amp; Bounds:</strong> GWA 1.00 is best, 3.00 passing, 5.00 failing; valid input 1.00–5.00 inclusive; counts/units are integers ≥ 0.</li>
                  <li><strong>BR02 Duplicate Prevention:</strong> At most one active submission per (scholar_code, academic_year, semester).</li>
                  <li><strong>BR03 Verification Gate:</strong> Unverified or Returned submissions cannot be evaluated for compliance or approved for renewal.</li>
                  <li><strong>BR04 Dynamic Policy Lookup:</strong> Evaluation reads thresholds from persisted scholarship_programs records (e.g. Access allows 1 drop; Excellence allows 0).</li>
                  <li><strong>BR05 Asia/Manila Deadline:</strong> Submissions at or before 2026-11-06 17:00 +08:00 are on time; any submission after is late (With Deficiency).</li>
                  <li><strong>BR06 Renewal Authority &amp; Separation:</strong> Only Staff decide Approved or Held; deficient records cannot be Approved; With Deficiency does not auto-revoke award_status.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* A4 UML Use Case Diagram */}
        {section === 'a4' && (
          <div className="pt-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                UML Use Case Diagram (System Boundary, 2 Actors, 8 Use Cases, Include &amp; Extend)
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Authentication is modeled as a precondition across all use cases. Dashed arrows point from base to
                included use case (&lt;&lt;include&gt;&gt;) and from extending use case to base (&lt;&lt;extend&gt;&gt;).
              </p>

              <div className="border border-slate-200 rounded-md bg-slate-50 p-4 overflow-x-auto">
                <svg viewBox="0 0 920 560" className="w-full min-w-[760px] h-auto" role="img" aria-label="UML Use Case Diagram">
                  <defs>
                    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
                    </marker>
                  </defs>

                  {/* System Boundary */}
                  <rect x="190" y="20" width="540" height="520" rx="8" fill="#ffffff" stroke="#334155" strokeWidth="1.5" />
                  <text x="460" y="45" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f172a">
                    AcadGrant Scholarship Monitoring System
                  </text>

                  {/* Scholar Actor (Left) */}
                  <circle cx="80" cy="180" r="16" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                  <line x1="80" y1="196" x2="80" y2="245" stroke="#1e3a8a" strokeWidth="2" />
                  <line x1="55" y1="215" x2="105" y2="215" stroke="#1e3a8a" strokeWidth="2" />
                  <line x1="80" y1="245" x2="60" y2="280" stroke="#1e3a8a" strokeWidth="2" />
                  <line x1="80" y1="245" x2="100" y2="280" stroke="#1e3a8a" strokeWidth="2" />
                  <text x="80" y="302" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e3a8a">Scholar</text>

                  {/* Staff Actor (Right) */}
                  <circle cx="840" cy="240" r="16" fill="none" stroke="#0f172a" strokeWidth="2" />
                  <line x1="840" y1="256" x2="840" y2="305" stroke="#0f172a" strokeWidth="2" />
                  <line x1="815" y1="275" x2="865" y2="275" stroke="#0f172a" strokeWidth="2" />
                  <line x1="840" y1="305" x2="820" y2="340" stroke="#0f172a" strokeWidth="2" />
                  <line x1="840" y1="305" x2="860" y2="340" stroke="#0f172a" strokeWidth="2" />
                  <text x="840" y="362" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0f172a">Scholarship Staff</text>

                  {/* Use Cases */}
                  {/* UC01 Submit Grades */}
                  <ellipse cx="320" cy="95" rx="95" ry="24" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
                  <text x="320" y="99" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">UC01: Submit Grades</text>

                  {/* UC02 Resubmit Returned Record */}
                  <ellipse cx="320" cy="185" rx="105" ry="24" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
                  <text x="320" y="189" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">UC02: Correct &amp; Resubmit</text>

                  {/* UC03 View Own Status & History */}
                  <ellipse cx="320" cy="275" rx="105" ry="24" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.5" />
                  <text x="320" y="279" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">UC03: View Submission Status</text>

                  {/* UC07 Log Audit Event (Included) */}
                  <ellipse cx="460" cy="495" rx="105" ry="24" fill="#f8fafc" stroke="#475569" strokeWidth="1.5" />
                  <text x="460" y="499" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">UC07: Record Audit Event</text>

                  {/* UC04 Verify Grade Evidence */}
                  <ellipse cx="595" cy="120" rx="105" ry="24" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                  <text x="595" y="124" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">UC04: Verify Evidence</text>

                  {/* UC05 Evaluate Policy Compliance */}
                  <ellipse cx="595" cy="220" rx="110" ry="24" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                  <text x="595" y="224" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">UC05: Evaluate Compliance</text>

                  {/* UC06 Decide Scholarship Renewal */}
                  <ellipse cx="595" cy="325" rx="110" ry="24" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                  <text x="595" y="329" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">UC06: Decide Renewal</text>

                  {/* UC08 Manage Scholars & Policies */}
                  <ellipse cx="595" cy="410" rx="112" ry="24" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.5" />
                  <text x="595" y="414" textAnchor="middle" fontSize="11" fontWeight="600" fill="#0f172a">UC08: Manage Scholars/Policies</text>

                  {/* Actor Associations */}
                  <line x1="108" y1="195" x2="228" y2="102" stroke="#1e3a8a" strokeWidth="1.3" />
                  <line x1="108" y1="215" x2="215" y2="188" stroke="#1e3a8a" strokeWidth="1.3" />
                  <line x1="108" y1="235" x2="220" y2="270" stroke="#1e3a8a" strokeWidth="1.3" />

                  <line x1="812" y1="245" x2="698" y2="128" stroke="#0f172a" strokeWidth="1.3" />
                  <line x1="812" y1="265" x2="705" y2="224" stroke="#0f172a" strokeWidth="1.3" />
                  <line x1="812" y1="290" x2="705" y2="325" stroke="#0f172a" strokeWidth="1.3" />
                  <line x1="812" y1="315" x2="703" y2="405" stroke="#0f172a" strokeWidth="1.3" />

                  {/* Extend: UC02 --<<extend>>--> UC04 (Extending to Base) */}
                  <line x1="415" y1="175" x2="508" y2="136" stroke="#334155" strokeWidth="1.2" strokeDasharray="5,4" markerEnd="url(#arrow)" />
                  <text x="456" y="145" textAnchor="middle" fontSize="10" fill="#334155">&lt;&lt;extend&gt;&gt;</text>

                  {/* Include 1: UC05 --<<include>>--> UC04? Better: UC06 --<<include>>--> UC07 & UC05 --<<include>>--> UC07 */}
                  <line x1="550" y1="242" x2="470" y2="470" stroke="#334155" strokeWidth="1.2" strokeDasharray="5,4" markerEnd="url(#arrow)" />
                  <text x="480" y="365" textAnchor="middle" fontSize="10" fill="#334155">&lt;&lt;include&gt;&gt;</text>

                  <line x1="575" y1="348" x2="485" y2="472" stroke="#334155" strokeWidth="1.2" strokeDasharray="5,4" markerEnd="url(#arrow)" />
                  <text x="556" y="438" textAnchor="middle" fontSize="10" fill="#334155">&lt;&lt;include&gt;&gt;</text>
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="border border-slate-200 rounded-md p-3.5">
                <p className="font-semibold text-slate-900 mb-1">Include 1: Evaluate Compliance → Record Audit Event</p>
                <p className="text-slate-600">Every compliance evaluation mandatorily persists an immutable audit log entry with actor, rule outcomes, and timestamp.</p>
              </div>
              <div className="border border-slate-200 rounded-md p-3.5">
                <p className="font-semibold text-slate-900 mb-1">Include 2: Decide Renewal → Record Audit Event</p>
                <p className="text-slate-600">Every Approved or Held decision mandatorily records an audit log entry and decision notes for governance traceability.</p>
              </div>
              <div className="border border-slate-200 rounded-md p-3.5">
                <p className="font-semibold text-slate-900 mb-1">Extend: Correct &amp; Resubmit → Verify Evidence</p>
                <p className="text-slate-600">Conditionally triggers only at the extension point when Staff mark evidence Returned, enabling Scholar correction and resubmission.</p>
              </div>
            </div>
          </div>
        )}

        {/* A5 Detailed Use Cases & ERD */}
        {section === 'a5' && (
          <div className="pt-6 space-y-6 text-xs text-slate-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-md p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900">UC01: Submit Grades</h3>
                <p><strong>Primary Actor:</strong> Scholar</p>
                <p><strong>Trigger:</strong> Scholar selects Submit Grades for an enrolled Academic Year and Semester.</p>
                <p><strong>Preconditions:</strong> User is authenticated with role Scholar and has an assigned scholarship program.</p>
                <p><strong>Main Flow:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Scholar selects Academic Year and Semester.</li>
                  <li>Scholar inputs GWA, enrolled units, failed, incomplete, and dropped counts plus grade-document reference.</li>
                  <li>System validates ranges (GWA 1.00–5.00, nonnegative integer counts) and checks composite uniqueness.</li>
                  <li>System persists submission with timestamp, sets verification_status = Pending Verification, and logs audit event.</li>
                </ol>
                <p><strong>Alternative / Exception Flows:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><em>Alt 1 (Duplicate Term):</em> Existing (scholar, AY, semester) record found → System rejects with HTTP 409.</li>
                  <li><em>Exc 1 (Invalid Input):</em> GWA outside 1.00–5.00 or negative integer → System rejects with HTTP 400 field error.</li>
                </ul>
                <p><strong>Postcondition:</strong> Semester submission is persisted and queued for Staff verification.</p>
                <p><strong>Links:</strong> FR03, FR04, FR10 · BR01, BR02</p>
              </div>

              <div className="border border-slate-200 rounded-md p-4 space-y-2">
                <h3 className="text-sm font-bold text-slate-900">UC05: Evaluate Compliance</h3>
                <p><strong>Primary Actor:</strong> Scholarship Staff</p>
                <p><strong>Trigger:</strong> Staff clicks Evaluate Compliance on a scholar’s semester submission.</p>
                <p><strong>Preconditions:</strong> User is authenticated as Scholarship Staff; submission exists.</p>
                <p><strong>Main Flow:</strong></p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>System verifies submission verification_status equals Verified.</li>
                  <li>System loads thresholds dynamically from the scholar’s persisted scholarship_programs row.</li>
                  <li>System evaluates GWA, units, failed, incomplete, dropped counts, evidence presence, and Asia/Manila deadline.</li>
                  <li>System sets compliance_status (Compliant or With Deficiency), saves itemized reasons, and logs UC07 audit event.</li>
                </ol>
                <p><strong>Alternative / Exception Flows:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><em>Exc 1 (Unverified Gate):</em> verification_status is Pending Verification or Returned → Blocked with HTTP 400.</li>
                  <li><em>Exc 2 (Unauthorized Role):</em> Scholar calls evaluate endpoint → Blocked with HTTP 403.</li>
                </ul>
                <p><strong>Postcondition:</strong> Compliance result and reasons are persisted; award_status remains unchanged until renewal decision.</p>
                <p><strong>Links:</strong> FR01, FR07, FR08, FR10 · BR03, BR04, BR05, BR06</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Entity Relationship Diagram (ERD)</h3>
              <div className="border border-slate-200 rounded-md bg-slate-50 p-4 overflow-x-auto">
                <svg viewBox="0 0 920 340" className="w-full min-w-[760px] h-auto" role="img" aria-label="Entity Relationship Diagram">
                  {/* Entities */}
                  {/* scholarship_programs */}
                  <rect x="20" y="30" width="210" height="150" rx="4" fill="#fff" stroke="#334155" strokeWidth="1.5" />
                  <rect x="20" y="30" width="210" height="28" rx="4" fill="#0f172a" />
                  <text x="125" y="48" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">scholarship_programs</text>
                  <text x="30" y="75" fontSize="10" fontFamily="monospace" fill="#0f172a">PK id (TEXT)</text>
                  <text x="30" y="92" fontSize="10" fontFamily="monospace" fill="#334155">   name, max_gwa, min_units</text>
                  <text x="30" y="109" fontSize="10" fontFamily="monospace" fill="#334155">   allowed_failed, allowed_inc</text>
                  <text x="30" y="126" fontSize="10" fontFamily="monospace" fill="#334155">   allowed_dropped</text>
                  <text x="30" y="143" fontSize="10" fontFamily="monospace" fill="#334155">   required_evidence, deadline</text>

                  {/* user_profiles */}
                  <rect x="20" y="210" width="210" height="105" rx="4" fill="#fff" stroke="#334155" strokeWidth="1.5" />
                  <rect x="20" y="210" width="210" height="28" rx="4" fill="#0f172a" />
                  <text x="125" y="228" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">user_profiles</text>
                  <text x="30" y="255" fontSize="10" fontFamily="monospace" fill="#0f172a">PK id (UUID)</text>
                  <text x="30" y="272" fontSize="10" fontFamily="monospace" fill="#334155">   email, full_name, role</text>
                  <text x="30" y="289" fontSize="10" fontFamily="monospace" fill="#334155">FK scholar_code</text>

                  {/* scholar_assignments */}
                  <rect x="300" y="80" width="220" height="150" rx="4" fill="#fff" stroke="#1e3a8a" strokeWidth="1.5" />
                  <rect x="300" y="80" width="220" height="28" rx="4" fill="#1e3a8a" />
                  <text x="410" y="98" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">scholar_assignments</text>
                  <text x="310" y="125" fontSize="10" fontFamily="monospace" fill="#0f172a">PK scholar_code (TEXT)</text>
                  <text x="310" y="142" fontSize="10" fontFamily="monospace" fill="#334155">UQ student_number, email</text>
                  <text x="310" y="159" fontSize="10" fontFamily="monospace" fill="#334155">   full_name, award_status</text>
                  <text x="310" y="176" fontSize="10" fontFamily="monospace" fill="#1e3a8a">FK program_id → programs.id</text>
                  <text x="310" y="193" fontSize="10" fontFamily="monospace" fill="#1e3a8a">FK profile_id → profiles.id</text>

                  {/* semester_submissions */}
                  <rect x="590" y="20" width="300" height="190" rx="4" fill="#fff" stroke="#1e3a8a" strokeWidth="1.5" />
                  <rect x="590" y="20" width="300" height="28" rx="4" fill="#1e3a8a" />
                  <text x="740" y="38" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">semester_submissions</text>
                  <text x="600" y="65" fontSize="10" fontFamily="monospace" fill="#0f172a">PK id (UUID/TEXT)</text>
                  <text x="600" y="82" fontSize="10" fontFamily="monospace" fill="#1e3a8a">FK scholar_code (UQ w/ AY, sem)</text>
                  <text x="600" y="99" fontSize="10" fontFamily="monospace" fill="#334155">   academic_year, semester</text>
                  <text x="600" y="116" fontSize="10" fontFamily="monospace" fill="#334155">   gwa, enrolled_units, failed/inc/drop</text>
                  <text x="600" y="133" fontSize="10" fontFamily="monospace" fill="#334155">   evidence_ref, submitted_at</text>
                  <text x="600" y="150" fontSize="10" fontFamily="monospace" fill="#334155">   verification_status, compliance_status</text>
                  <text x="600" y="167" fontSize="10" fontFamily="monospace" fill="#334155">   renewal_decision, decision_notes</text>

                  {/* audit_logs */}
                  <rect x="590" y="235" width="300" height="90" rx="4" fill="#fff" stroke="#334155" strokeWidth="1.5" />
                  <rect x="590" y="235" width="300" height="26" rx="4" fill="#0f172a" />
                  <text x="740" y="252" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">audit_logs</text>
                  <text x="600" y="278" fontSize="10" fontFamily="monospace" fill="#0f172a">PK id · FK submission_id</text>
                  <text x="600" y="295" fontSize="10" fontFamily="monospace" fill="#334155">   actor_name, actor_role, action_type</text>
                  <text x="600" y="312" fontSize="10" fontFamily="monospace" fill="#334155">   previous_state, new_state, created_at</text>

                  {/* Relationships */}
                  <line x1="230" y1="115" x2="300" y2="115" stroke="#334155" strokeWidth="1.5" />
                  <text x="242" y="108" fontSize="10" fontWeight="700" fill="#334155">1</text>
                  <text x="282" y="108" fontSize="10" fontWeight="700" fill="#334155">N</text>

                  <line x1="230" y1="255" x2="300" y2="200" stroke="#334155" strokeWidth="1.5" />
                  <text x="238" y="242" fontSize="10" fontWeight="700" fill="#334155">1</text>
                  <text x="282" y="218" fontSize="10" fontWeight="700" fill="#334155">1</text>

                  <line x1="520" y1="130" x2="590" y2="100" stroke="#334155" strokeWidth="1.5" />
                  <text x="530" y="120" fontSize="10" fontWeight="700" fill="#334155">1</text>
                  <text x="572" y="96" fontSize="10" fontWeight="700" fill="#334155">N</text>

                  <line x1="740" y1="210" x2="740" y2="235" stroke="#334155" strokeWidth="1.5" />
                  <text x="748" y="222" fontSize="10" fontWeight="700" fill="#334155">1 : N</text>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* A6 Traceability Matrix */}
        {section === 'a6' && (
          <div className="pt-6 space-y-6 text-xs text-slate-700">
            <div className="border border-slate-200 rounded-md overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">FR ID</th>
                    <th className="px-3 py-2.5 font-medium">Actor</th>
                    <th className="px-3 py-2.5 font-medium">Use Case</th>
                    <th className="px-3 py-2.5 font-medium">Business Rule</th>
                    <th className="px-3 py-2.5 font-medium">Implemented Screen / Endpoint</th>
                    <th className="px-3 py-2.5 font-medium">Test &amp; Expected Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">FR01</td>
                    <td className="px-3 py-2.5">Scholar, Staff</td>
                    <td className="px-3 py-2.5">UC03, UC04</td>
                    <td className="px-3 py-2.5 font-mono">BR06</td>
                    <td className="px-3 py-2.5 font-mono">LoginView + requireAuth/requireStaff + RLS</td>
                    <td className="px-3 py-2.5"><strong>TC08:</strong> Scholar read of B02 &amp; verify B06 return HTTP 403.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">FR03</td>
                    <td className="px-3 py-2.5">Scholar</td>
                    <td className="px-3 py-2.5">UC01</td>
                    <td className="px-3 py-2.5 font-mono">BR01, BR02</td>
                    <td className="px-3 py-2.5 font-mono">ScholarSubmissionForm + POST /api/submissions</td>
                    <td className="px-3 py-2.5"><strong>TC07:</strong> Duplicate term rejected (409); GWA 0.50 &amp; negative count rejected (400).</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">FR05</td>
                    <td className="px-3 py-2.5">Scholarship Staff</td>
                    <td className="px-3 py-2.5">UC04, UC02</td>
                    <td className="px-3 py-2.5 font-mono">BR03</td>
                    <td className="px-3 py-2.5 font-mono">SubmissionDrawer + POST /verify + PUT /resubmit</td>
                    <td className="px-3 py-2.5"><strong>TC09:</strong> Returned record corrected &amp; resubmitted returns to Pending Verification with audit log.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">FR08</td>
                    <td className="px-3 py-2.5">Scholarship Staff</td>
                    <td className="px-3 py-2.5">UC05</td>
                    <td className="px-3 py-2.5 font-mono">BR04, BR05</td>
                    <td className="px-3 py-2.5 font-mono">SubmissionDrawer + POST /evaluate</td>
                    <td className="px-3 py-2.5"><strong>TC01–TC05:</strong> Exact boundary checks, program variation, and Asia/Manila lateness detected.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 rounded-md border border-slate-200 bg-slate-50">
              <p className="font-semibold text-slate-900 mb-1">
                Planned Requirement Deferred / Excluded from MVP Build
              </p>
              <p className="text-slate-600 leading-relaxed">
                <strong>Planned FR-EXT (Automated Registrar SIS API Sync &amp; SMS Deadline Alerts):</strong> Intentionally
                deferred per examination scope exclusions. Official Registrar grades remain external; scholars supply
                a Registrar grade-document reference for manual staff verification.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
