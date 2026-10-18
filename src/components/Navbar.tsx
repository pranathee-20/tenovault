/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, Database, UserCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface NavbarProps {
  currentTab: string;
  onRefresh?: () => void;
}

export function Navbar({ currentTab, onRefresh }: NavbarProps) {
  const { user, tenant, switchUser } = useAuth();
  const { addToast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'overview':
        return { title: 'Security Posture & Isolation Overview', subtitle: 'Real-time telemetry, authorization metrics, and tenant boundary status' };
      case 'documents':
        return { title: 'Workspace Documents', subtitle: 'Strictly partitioned document records scoped to current authenticated tenant' };
      case 'audit':
        return { title: 'TenantTrace Audit Events', subtitle: 'Structured, append-only security decision ledger with safe non-sensitive reason codes' };
      case 'security-lab':
        return { title: 'Security Test Lab', subtitle: 'Automated Supertest execution suite validating multitenant authorization defenses' };
      case 'simulator':
        return { title: 'Controlled Attack Simulator', subtitle: 'Interactive verification of cross-tenant IDOR, spoofing, and privilege escalation resistance' };
      case 'anomalies':
        return { title: 'Suspicious Activity & Anomaly Detection', subtitle: 'Deterministic heuristic detection rules flagging anomalous authorization denial patterns' };
      case 'api-coverage':
        return { title: 'API Routes & Security Coverage', subtitle: 'Live verification status connecting every API endpoint to executed security tests' };
      case 'settings':
        return { title: 'Settings & PostgreSQL Defense-in-Depth', subtitle: 'Tenant configurations, Row-Level Security (RLS) SQL policies, and session controls' };
      default:
        return { title: 'Security Workspace Portal', subtitle: 'TenantGuard protected workspace' };
    }
  };

  const { title, subtitle } = getPageTitle(currentTab);

  const handleResetDemoData = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/system/reset-demo', { method: 'POST' });
      if (res.ok) {
        addToast('success', 'Seed Data Restored', 'Restored pristine synthetic tenants, documents, and audit logs.');
        if (onRefresh) onRefresh();
      } else {
        addToast('error', 'Reset Failed', 'Unable to reset demo dataset.');
      }
    } catch {
      addToast('error', 'Reset Failed', 'Network error during reset.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleQuickRoleSwitch = async (role: 'admin' | 'editor' | 'viewer') => {
    if (!tenant) return;
    const isAcme = tenant.id === 'tenant-acme-corp';
    let targetEmail = '';
    if (isAcme) {
      if (role === 'admin') targetEmail = 'alice@acme.test';
      if (role === 'editor') targetEmail = 'bob@acme.test';
      if (role === 'viewer') targetEmail = 'charlie@acme.test';
    } else {
      if (role === 'admin') targetEmail = 'diana@bluenova.test';
      if (role === 'editor') targetEmail = 'evan@bluenova.test';
      if (role === 'viewer') targetEmail = 'fiona@bluenova.test';
    }

    try {
      await switchUser(targetEmail);
      addToast('info', 'Switched Persona', `Active session updated to ${targetEmail} (${role.toUpperCase()})`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      addToast('error', 'Switch Failed', err.message);
    }
  };

  return (
    <header className="h-16 bg-slate-900/60 border-b border-slate-800/80 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {title}
        </h1>
        <p className="text-[11px] text-slate-400 truncate max-w-xl">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Role Switcher Pill */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-xs">
          <span className="text-[10px] uppercase font-mono text-slate-400 px-2 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-cyan-400" /> Persona:
          </span>
          {(['admin', 'editor', 'viewer'] as const).map((r) => {
            const isCurrent = user?.role === r;
            return (
              <button
                key={r}
                onClick={() => handleQuickRoleSwitch(r)}
                className={`px-2 py-1 rounded text-[11px] font-medium capitalize transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Database Adapter Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>Demo Adapter</span>
          <span className="text-slate-400">|</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> PG RLS DDL Ready
          </span>
        </div>

        {/* Reset Demo State Button */}
        <button
          onClick={handleResetDemoData}
          disabled={isResetting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          title="Restore seed data to pristine initial state"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
}
