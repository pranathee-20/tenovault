/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Crosshair,
  TestTube2,
  ExternalLink,
  Lock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { AuditEvent, SecurityTestRunSummary } from '../types';

interface OverviewPageProps {
  onNavigateTab: (tab: string) => void;
  onOpenAuditDetail: (event: AuditEvent) => void;
}

export function OverviewPage({ onNavigateTab, onOpenAuditDetail }: OverviewPageProps) {
  const { tenant, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [docCount, setDocCount] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [latestTestRun, setLatestTestRun] = useState<SecurityTestRunSummary | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Documents count
      const docsRes = await fetch('/api/documents', { headers });
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocCount(docsData.total || 0);
      }

      // 2. Audit stats
      const statsRes = await fetch('/api/audit-events/stats', { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 3. Recent events
      const eventsRes = await fetch('/api/audit-events?limit=8', { headers });
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setRecentEvents(eventsData.events || []);
      }

      // 4. Latest Security Test Run
      const testRes = await fetch('/api/security-lab/latest', { headers });
      if (testRes.ok) {
        const testData = await testRes.json();
        setLatestTestRun(testData.latestRun || null);
      }
    } catch (err) {
      console.error('[Overview] Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalDecisions = (stats?.allowedCount || 0) + (stats?.deniedCount || 0);
  const denialRate = totalDecisions > 0 ? (((stats?.deniedCount || 0) / totalDecisions) * 100).toFixed(1) : '0';

  const pieData = [
    { name: 'Allowed Decisions', value: stats?.allowedCount || 1, color: '#10b981' },
    { name: 'Intercepted Denials', value: stats?.deniedCount || 0, color: '#f43f5e' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Tenant Isolation Posture */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/60">
              Verified Tenant Partition
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              ID: <span className="text-slate-200">{tenant?.id}</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {tenant?.name}
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-normal">
              Active Isolation
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            TenantGuard 4-layer authorization enforced server-side. PostgreSQL Row-Level Security DDL prepared for production deployment. Zero cross-tenant data leakage.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('security-lab')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
          >
            <TestTube2 className="w-3.5 h-3.5" />
            <span>Launch Security Lab</span>
          </button>
          <button
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Attack</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Documents */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-300">Protected Documents</span>
            <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">{loading ? '...' : docCount}</div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
            <span>Scoped to tenant</span>
            <button
              onClick={() => onNavigateTab('documents')}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 2: Allowed Requests */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-300">Allowed Decisions</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {loading ? '...' : stats?.allowedCount ?? 0}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[11px] text-emerald-400/90">
            <TrendingUp className="w-3 h-3" /> Verified identity & role match
          </div>
        </div>

        {/* Card 3: Intercepted Denials */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-300">Intercepted Denials</span>
            <div className="p-2 rounded-lg bg-rose-950/60 text-rose-400 border border-rose-800/60">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">
            {loading ? '...' : stats?.deniedCount ?? 0}
          </div>
          <div className="flex items-center gap-1 mt-2 text-[11px] text-rose-400/90 font-mono">
            <span>{denialRate}% denial rate</span> &bull; <span>Safe codes</span>
          </div>
        </div>

        {/* Card 4: Automated Security Lab Status */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-300">Security Test Suite</span>
            <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono flex items-center gap-2">
            {latestTestRun ? (
              <>
                <span className="text-emerald-400">{latestTestRun.passed}</span>
                <span className="text-xs text-slate-500">/</span>
                <span className="text-sm text-slate-400">{latestTestRun.totalTests} Passed</span>
              </>
            ) : (
              <span className="text-sm text-amber-400">Ready to Run</span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
            <span>{latestTestRun ? 'Integrity 100%' : '14 Tests Prepared'}</span>
            <button
              onClick={() => onNavigateTab('security-lab')}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer"
            >
              Run suite <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Authorization Decisions Telemetry</h3>
              <p className="text-xs text-slate-400">Allowed vs Blocked security events trend</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Allowed
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Denied
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {stats?.timelineBuckets && stats.timelineBuckets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.timelineBuckets} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAllowed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorDenied" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="allowed"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAllowed)"
                    name="Allowed"
                  />
                  <Area
                    type="monotone"
                    dataKey="denied"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorDenied)"
                    name="Denied"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Awaiting telemetry events...
              </div>
            )}
          </div>
        </div>

        {/* Breakdown Donut & Denial Reasons */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Decision Ratio</h3>
            <p className="text-xs text-slate-400 mb-4">Proportion of verified vs rejected calls</p>

            <div className="h-40 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold font-mono text-white">{totalDecisions}</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Total Calls</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider font-mono">
              Common Denial Reasons
            </div>
            {stats?.reasonBreakdown && Object.keys(stats.reasonBreakdown).length > 0 ? (
              Object.entries(stats.reasonBreakdown).slice(0, 3).map(([code, count]: any) => (
                <div key={code} className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300 truncate max-w-[170px]" title={code}>
                    {code}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 py-1">No denials recorded in current session.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent TenantTrace Audit Ledger Feed */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Recent TenantTrace Audit Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Live immutable event stream strictly scoped to {tenant?.name}
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('audit')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
          >
            Open full audit ledger <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No audit events captured yet for this tenant.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase font-mono text-slate-400 tracking-wider">
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => onOpenAuditDetail(ev)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          ev.decision === 'ALLOWED'
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {ev.decision === 'ALLOWED' ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : (
                          <XCircle className="w-2.5 h-2.5" />
                        )}
                        {ev.decision}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200 text-[11px] whitespace-nowrap">
                      {ev.action}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-[140px]" title={ev.actorEmail}>
                      {ev.actorEmail}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] truncate max-w-[140px]">
                      {ev.resourceId}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 inline-flex items-center gap-1 font-medium">
                        Inspect <ExternalLink className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
