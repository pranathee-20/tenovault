/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Crosshair,
  Flame,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Hash,
  Terminal,
  Activity,
  ArrowRight,
  ExternalLink,
  Lock,
  Layers,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuditEvent } from '../types';

interface AttackSimulatorPageProps {
  onInspectAudit: (event: AuditEvent) => void;
}

export function AttackSimulatorPage({ onInspectAudit }: AttackSimulatorPageProps) {
  const { user, tenant, token } = useAuth();
  const { addToast } = useToast();

  const [selectedAttack, setSelectedAttack] = useState('CROSS_TENANT_READ');
  const [customDocId, setCustomDocId] = useState('');
  const [isAttacking, setIsAttacking] = useState(false);
  const [attackResult, setAttackResult] = useState<any>(null);

  const isAcme = tenant?.id === 'tenant-acme-corp';
  const victimTenant = isAcme ? 'BlueNova Systems (tenant-bluenova-sys)' : 'Acme Labs (tenant-acme-corp)';
  const defaultVictimDoc = isAcme ? 'doc-blue-001' : 'doc-acme-001';

  const attackScenarios = [
    {
      id: 'CROSS_TENANT_READ',
      name: 'Cross-Tenant Document Read (IDOR)',
      category: 'Information Disclosure',
      severity: 'CRITICAL',
      description: `Attempt to read ${victimTenant}'s confidential intellectual property using guessed or leaked document IDs.`,
      targetEndpoint: `GET /api/documents/${customDocId || defaultVictimDoc}`
    },
    {
      id: 'CROSS_TENANT_UPDATE',
      name: 'Malicious Cross-Tenant Overwrite',
      category: 'Data Tampering',
      severity: 'CRITICAL',
      description: `Attempt to submit an unauthorized PUT payload to corrupt foreign document records belonging to ${victimTenant}.`,
      targetEndpoint: `PUT /api/documents/${customDocId || (isAcme ? 'doc-blue-002' : 'doc-acme-002')}`
    },
    {
      id: 'CROSS_TENANT_DELETE',
      name: 'Cross-Tenant Document Wipeout',
      category: 'Data Destruction',
      severity: 'CRITICAL',
      description: `Issue a DELETE request against victim tenant's critical compliance records.`,
      targetEndpoint: `DELETE /api/documents/${customDocId || (isAcme ? 'doc-blue-003' : 'doc-acme-003')}`
    },
    {
      id: 'HEADER_SPOOFING',
      name: 'Tenant-ID Header Injection',
      category: 'Context Spoofing',
      severity: 'HIGH',
      description: `Inject an untrusted 'x-tenant-id' header claiming to be ${victimTenant} to bypass application filters.`,
      targetEndpoint: 'GET /api/documents [x-tenant-id injected]'
    },
    {
      id: 'SEQUENTIAL_SCAN',
      name: 'Sequential Resource ID Enumeration',
      category: 'Automated Scraping',
      severity: 'HIGH',
      description: 'Rapidly probe sequential document identifiers (doc-001 through doc-004) to harvest foreign tenant assets.',
      targetEndpoint: 'Batch GET probes across sequential foreign IDs'
    },
    {
      id: 'ROLE_OVERREACH_WRITE',
      name: 'Privilege Escalation / Viewer Mutation',
      category: 'RBAC Bypass',
      severity: 'MEDIUM',
      description: `Simulate a user with read-only Viewer privileges attempting to write a new document.`,
      targetEndpoint: 'POST /api/documents [Viewer JWT]'
    }
  ];

  const handleLaunchAttack = async () => {
    if (!token) return;
    setIsAttacking(true);
    setAttackResult(null);

    try {
      const res = await fetch('/api/simulator/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          attackType: selectedAttack,
          customDocId: customDocId.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAttackResult(data);
        addToast('info', 'Attack Intercepted & Blocked', 'TenantGuard neutralized the simulated breach.');
      } else {
        const err = await res.json();
        addToast('error', 'Simulator Error', err.error || 'Server error');
      }
    } catch (err: any) {
      addToast('error', 'Network Error', err.message);
    } finally {
      setIsAttacking(false);
    }
  };

  const currentScenario = attackScenarios.find((s) => s.id === selectedAttack);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-rose-900/60 text-rose-300 border border-rose-700/60">
              Safe Synthetic Attack Sandbox
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Attacker Tenant: <strong className="text-white">{tenant?.name}</strong>
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Controlled Attack Simulator
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Trigger safe, controlled cross-tenant and privilege attacks against seeded synthetic records. Observe how TenantGuard intercepts the payload server-side, records structured TenantTrace audit evidence, and preserves target data bit-for-bit.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 shrink-0">
          <div className="text-[10px] uppercase text-slate-500">Target Victim Entity:</div>
          <div className="text-rose-300 font-semibold">{victimTenant}</div>
        </div>
      </div>

      {/* Simulator Workspace: Select Attack on left, Results on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Attack Vector Selection (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Select Simulated Attack Vector
          </h3>

          <div className="space-y-2.5">
            {attackScenarios.map((sc) => {
              const isSelected = selectedAttack === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedAttack(sc.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/40 border-rose-600/80 shadow-lg shadow-rose-950/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Flame className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-400' : 'text-slate-500'}`} />
                      {sc.name}
                    </span>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                        sc.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {sc.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">{sc.description}</p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500 truncate">
                    {sc.targetEndpoint}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional Custom Target ID */}
          {(selectedAttack === 'CROSS_TENANT_READ' ||
            selectedAttack === 'CROSS_TENANT_UPDATE' ||
            selectedAttack === 'CROSS_TENANT_DELETE') && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Custom Target Document ID (Optional)
              </label>
              <input
                type="text"
                value={customDocId}
                onChange={(e) => setCustomDocId(e.target.value)}
                placeholder={`e.g., ${defaultVictimDoc}`}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 block">
                Leave blank to automatically target seeded foreign document.
              </span>
            </div>
          )}

          {/* Launch Button */}
          <button
            onClick={handleLaunchAttack}
            disabled={isAttacking}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isAttacking ? (
              <>
                <Terminal className="w-4 h-4 animate-spin" />
                <span>Launching Safe Attack Vector...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-4 h-4" />
                <span>Launch Simulated Attack Vector</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Execution Telemetry & Evidence (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Interception Telemetry & Forensic Evidence
          </h3>

          {attackResult ? (
            <div className="space-y-4">
              {/* Defense Verdict Banner */}
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-900/80 text-emerald-300 border border-emerald-700">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      ATTACK NEUTRALIZED BY TENANTGUARD
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900 text-emerald-200">
                        HTTP {attackResult.responseSummary.status}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-200 mt-0.5">
                      Target record protected. Access safely denied without revealing foreign entity data.
                    </div>
                  </div>
                </div>
              </div>

              {/* Record Integrity Hash Check */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" /> Victim Document Bit-for-Bit Integrity:
                  </span>
                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% UNTOUCHED
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                  <div>
                    <span className="text-slate-500">Target Document: </span>
                    <span className="text-slate-200">{attackResult.targetDocId}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-500">SHA-256 Before: </span>
                    <span className="text-cyan-400">{attackResult.targetRecordIntegrity.beforeHash}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-500">SHA-256 After: </span>
                    <span className="text-cyan-400">{attackResult.targetRecordIntegrity.afterHash}</span>
                  </div>
                </div>
              </div>

              {/* Emitted TenantTrace Audit Event */}
              {attackResult.auditEvent && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" /> Emitted TenantTrace Audit Log:
                    </span>
                    <button
                      onClick={() => onInspectAudit(attackResult.auditEvent)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      Open full detail <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Decision:</span>
                      <span className="text-rose-400 font-bold">{attackResult.auditEvent.decision}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Denial Code:</span>
                      <span className="text-rose-300 font-bold">{attackResult.auditEvent.denialReasonCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Request ID:</span>
                      <span className="text-indigo-400">{attackResult.auditEvent.requestId}</span>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-300 font-sans border-t border-slate-800">
                      {attackResult.auditEvent.safeDetail}
                    </div>
                  </div>
                </div>
              )}

              {/* Wire Level Request / Response JSON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Wire Request Dispatched:
                  </div>
                  <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto text-[10px]">
                    {JSON.stringify(attackResult.requestSummary, null, 2)}
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Wire Defense Response:
                  </div>
                  <pre className="text-rose-300 whitespace-pre-wrap overflow-x-auto text-[10px]">
                    {JSON.stringify(attackResult.responseSummary, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
              <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">Ready for Simulation</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select an attack scenario from the left and click "Launch Simulated Attack Vector" to observe real-time defense.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
