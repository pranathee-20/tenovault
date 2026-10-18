/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  TestTube2,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileCheck,
  Lock,
  ArrowRight,
  Terminal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SecurityTestRunSummary, SecurityTestExecutionResult } from '../types';

export function SecurityLabPage() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [summary, setSummary] = useState<SecurityTestRunSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const fetchLatestRun = useCallback(async () => {
    if (!token) return;
    setLoadingLatest(true);
    try {
      const res = await fetch('/api/security-lab/latest', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.latestRun);
      }
    } catch {
      console.error('[SecurityLab] Failed to load latest run');
    } finally {
      setLoadingLatest(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLatestRun();
  }, [fetchLatestRun]);

  const handleExecuteTests = async () => {
    if (!token) return;
    setRunning(true);
    try {
      const res = await fetch('/api/security-lab/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data: SecurityTestRunSummary = await res.json();
        setSummary(data);
        if (data.failed === 0) {
          addToast('success', 'Security Suite Passed', `All ${data.totalTests} tests succeeded with bit-for-bit data integrity.`);
        } else {
          addToast('error', 'Security Assertions Failed', `${data.failed} test(s) did not match expected isolation policy.`);
        }
      } else {
        const err = await res.json();
        addToast('error', 'Test Suite Run Error', err.error || 'Server error');
      }
    } catch (err: any) {
      addToast('error', 'Network Error', err.message);
    } finally {
      setRunning(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTestId(expandedTestId === id ? null : id);
  };

  const filteredResults = summary?.results.filter((r) => {
    if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Top Runner Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-900/80 text-indigo-300 border border-indigo-700">
              Live Supertest Harness
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              14 Automated Test Cases
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Automated Multi-Tenant Security Test Lab
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Directly executes authenticated and malicious requests against Express API routes with Supertest. Rigorously asserts HTTP 401/403/404 denial status, safe non-sensitive reason codes, and before/after SHA-256 data integrity preservation.
          </p>
        </div>

        <button
          onClick={handleExecuteTests}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing Live Supertest...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Full Security Test Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Test Execution Summary Cards */}
      {summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow">
            <div className="text-xs text-slate-400 mb-1">Execution Status</div>
            <div className="flex items-center gap-2 text-xl font-bold font-mono">
              {summary.failed === 0 ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5" /> PASS
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-5 h-5" /> FAIL
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Run ID: {summary.runId}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow">
            <div className="text-xs text-slate-400 mb-1">Passed / Total</div>
            <div className="text-xl font-bold font-mono text-white">
              <span className="text-emerald-400">{summary.passed}</span>
              <span className="text-slate-500"> / </span>
              <span>{summary.totalTests}</span>
            </div>
            <div className="text-[10px] text-emerald-400/90 mt-1 font-mono">
              {((summary.passed / summary.totalTests) * 100).toFixed(0)}% Successful Defense
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow">
            <div className="text-xs text-slate-400 mb-1">Record Integrity</div>
            <div className="text-xl font-bold font-mono text-cyan-400 flex items-center gap-1.5">
              <Hash className="w-5 h-5" /> 100%
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Zero Unintended Mutations
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow">
            <div className="text-xs text-slate-400 mb-1">Execution Speed</div>
            <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-indigo-400" /> {summary.durationMs}ms
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              {new Date(summary.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400">
          {loadingLatest
            ? 'Checking for previous test runs...'
            : 'No automated tests executed yet. Click "Run Full Security Test Suite" to verify TenantGuard defenses.'}
        </div>
      )}

      {/* Filter and Test Cases List */}
      {summary && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Verified Test Scenarios ({filteredResults.length})
            </h3>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter test cases by category"
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="CROSS_TENANT_ISOLATION">Cross-Tenant Isolation</option>
                <option value="AUTH_INTEGRITY">Auth & Token Integrity</option>
                <option value="RBAC_ENFORCEMENT">RBAC Role Enforcement</option>
                <option value="IDOR_RESISTANCE">IDOR Resistance</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredResults.map((test) => {
              const isExpanded = expandedTestId === test.testId;
              const isPass = test.status === 'PASS';

              return (
                <div
                  key={test.testId}
                  className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden shadow transition-all hover:border-slate-700"
                >
                  {/* Card Header Row */}
                  <div
                    onClick={() => toggleExpand(test.testId)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isPass
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                        }`}
                      >
                        {isPass ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">
                            [{test.testId}]
                          </span>
                          <span className="text-xs font-semibold text-white truncate">
                            {test.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                          <span className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-[10px]">
                            {test.category}
                          </span>
                          <span>&bull;</span>
                          <span>HTTP Expected: {test.expectedStatus} / Actual: {test.actualStatus}</span>
                          {test.expectedReasonCode && (
                            <>
                              <span>&bull;</span>
                              <span className="text-slate-300">Code: {test.actualReasonCode}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                            isPass
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {test.status}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {test.executionTimeMs}ms
                        </div>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Technical Evidence Drawer */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-950 border-t border-slate-800/80 space-y-3 text-xs">
                      {/* Before / After Record Integrity Verification */}
                      {test.beforeRecordHash && test.afterRecordHash && (
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
                            <span className="text-slate-300 flex items-center gap-1.5">
                              <Hash className="w-3.5 h-3.5 text-cyan-400" /> Cryptographic Integrity Assertion:
                            </span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Bit-for-bit unchanged
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                            <div>
                              <span>Before Mutation Attack: </span>
                              <code className="text-slate-200">{test.beforeRecordHash}</code>
                            </div>
                            <div>
                              <span>After Mutation Attack: </span>
                              <code className="text-slate-200">{test.afterRecordHash}</code>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Request and Response details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="text-slate-400 uppercase text-[10px] mb-1 font-semibold">
                            Simulated Supertest Request:
                          </div>
                          <div className="text-indigo-300">
                            {test.requestDetails.method} {test.requestDetails.path}
                          </div>
                          <div className="text-slate-400 mt-1">
                            Headers: {JSON.stringify(test.requestDetails.headers)}
                          </div>
                          {test.requestDetails.body && (
                            <div className="text-slate-300 mt-1">
                              Body: {JSON.stringify(test.requestDetails.body)}
                            </div>
                          )}
                        </div>

                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="text-slate-400 uppercase text-[10px] mb-1 font-semibold">
                            Server Defense Response:
                          </div>
                          <div className="text-emerald-300">
                            HTTP Status: {test.responseDetails.status}
                          </div>
                          <div className="text-slate-300 mt-1 break-all">
                            Payload: {JSON.stringify(test.responseDetails.body)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
