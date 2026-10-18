/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileCode,
  Download,
  ExternalLink,
  ShieldCheck,
  Lock,
  Layers,
  X,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiRouteCoverage } from '../types';

export function ApiCoveragePage() {
  const { token } = useAuth();
  const { addToast } = useToast();

  const [coverage, setCoverage] = useState<ApiRouteCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenApiModal, setShowOpenApiModal] = useState(false);
  const [openApiJson, setOpenApiJson] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const fetchCoverage = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/security-lab/coverage', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCoverage(data.coverageMatrix || []);
      }

      // Fetch OpenAPI spec
      const specRes = await fetch('/api/docs/openapi.json');
      if (specRes.ok) {
        const spec = await specRes.json();
        setOpenApiJson(JSON.stringify(spec, null, 2));
      }
    } catch {
      console.error('[ApiCoverage] Failed to load coverage');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  const handleCopySpec = () => {
    navigator.clipboard.writeText(openApiJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('success', 'Copied', 'OpenAPI 3.0 JSON specification copied to clipboard.');
  };

  const handleDownloadSpec = () => {
    const blob = new Blob([openApiJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenovault-openapi-spec.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMethodBadge = (m: string) => {
    switch (m) {
      case 'GET':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'POST':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'PUT':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'DELETE':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700">
              Contract & Verification Matrix
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              OpenAPI 3.0 Standard
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            API Endpoints & Security Test Coverage
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Routes are verified through executed backend test assertions. We do not claim an endpoint is protected merely because middleware is mounted—live Supertest tests must assert access control behavior and record integrity.
          </p>
        </div>

        <button
          onClick={() => setShowOpenApiModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-slate-700 transition-colors shadow-sm shrink-0 cursor-pointer"
        >
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span>View OpenAPI 3.0 Spec</span>
        </button>
      </div>

      {/* Coverage Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Evaluating API test coverage...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase font-mono text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Method & Route</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Required Role</th>
                  <th className="py-3 px-4">TenantGuard Security Enforcement</th>
                  <th className="py-3 px-4 text-right">Test Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {coverage.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-mono">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getMethodBadge(
                            c.method
                          )}`}
                        >
                          {c.method}
                        </span>
                        <span className="text-slate-100 font-semibold">{c.path}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs max-w-xs leading-snug">
                      {c.description}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {c.requiredRole}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {c.tenantGuardSteps.map((step, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-900/60"
                          >
                            {step}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {c.testStatus === 'PASS' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED PASS
                        </span>
                      ) : c.testStatus === 'FAIL' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          <XCircle className="w-3.5 h-3.5" /> FAILED ASSERTION
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          <HelpCircle className="w-3.5 h-3.5" /> NOT RUN YET
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OPENAPI MODAL */}
      {showOpenApiModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">OpenAPI 3.0 Specification</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySpec}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={handleDownloadSpec}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Spec</span>
                </button>
                <button
                  onClick={() => setShowOpenApiModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-[11px] text-slate-300">
              <pre className="whitespace-pre-wrap">{openApiJson}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
