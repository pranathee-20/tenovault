/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  Database,
  Building2,
  Shield,
  User,
  KeyRound,
  LogOut,
  RefreshCw,
  FileCode2,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Layers,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function SettingsPage() {
  const { user, tenant, token, logout } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'general' | 'rls'>('general');
  const [copiedSql, setCopiedSql] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const postgresRlsDdl = `-- ============================================================================
-- TENOVAULT PostgreSQL Multi-Tenant Database Schema with Row-Level Security (RLS)
-- Defense-in-Depth Layer 2 (Works in synergy with Layer 1 TenantGuard Middleware)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    classification VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    content_snippet TEXT NOT NULL,
    full_content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 integrity hash
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Events Table (TenantTrace append-only ledger)
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(32) NOT NULL,
    action VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    decision VARCHAR(16) NOT NULL,
    safe_detail TEXT NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

-- Dynamic Tenant Isolation Policy for Documents
CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''))
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

-- Tenant Isolation for Audit Logs (Reviewer read only)
CREATE POLICY tenant_isolation_audit_select ON audit_events
    FOR SELECT
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_audit_insert ON audit_events
    FOR INSERT
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), ''));

CREATE POLICY tenant_isolation_audit_no_update ON audit_events
    FOR UPDATE USING (false);

CREATE POLICY tenant_isolation_audit_no_delete ON audit_events
    FOR DELETE USING (false);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(postgresRlsDdl);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    addToast('success', 'Copied', 'PostgreSQL RLS Schema copied to clipboard.');
  };

  const handleDownloadSql = () => {
    const blob = new Blob([postgresRlsDdl], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenovault-postgres-rls-schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDemoData = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/system/reset-demo', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        addToast('success', 'Seed Data Restored', 'Synthetic tenants, users, documents, and audit events restored.');
      } else {
        const errData = await res.json().catch(() => ({}));
        addToast('error', 'Reset Failed', errData.error || 'Only administrators can reset demo data.');
      }
    } catch {
      addToast('error', 'Reset Failed', 'Network error.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tenant & User Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('rls')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'rls'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4 text-cyan-400" />
          <span>PostgreSQL Defense-in-Depth (RLS)</span>
        </button>
      </div>

      {activeTab === 'general' ? (
        <div className="space-y-6">
          {/* Active Tenant Card */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Authorized Tenant Workspace</h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {tenant?.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Organization Name:</span>
                <span className="text-slate-100 font-bold text-sm font-sans">{tenant?.name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Compliance Level:</span>
                <span className="text-emerald-400 font-semibold">{tenant?.complianceLevel}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Isolation Architecture:</span>
                <span className="text-cyan-400 font-semibold">Row-Level Security + TenantGuard</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Provisioned Tier:</span>
                <span className="text-slate-200 capitalize">{tenant?.tier} Enterprise</span>
              </div>
            </div>
          </div>

          {/* User Profile & Role Permissions */}
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Authenticated User Profile</h3>
              </div>
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                {user?.role}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Full Name:</span>
                <span className="text-slate-100 font-semibold font-sans">{user?.name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Email:</span>
                <span className="text-slate-100 font-semibold">{user?.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Department:</span>
                <span className="text-slate-100 font-semibold font-sans">{user?.department}</span>
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="text-[11px] uppercase font-mono text-slate-400 font-semibold">
                Active Role Permissions Matrix ({user?.role?.toUpperCase()}):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span>Read Docs:</span>
                  <span className="text-emerald-400">ALLOWED</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span>Write / Edit:</span>
                  <span className={user?.role === 'viewer' ? 'text-rose-400' : 'text-emerald-400'}>
                    {user?.role === 'viewer' ? 'DENIED' : 'ALLOWED'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span>Delete Docs:</span>
                  <span className={user?.role === 'admin' ? 'text-emerald-400' : 'text-rose-400'}>
                    {user?.role === 'admin' ? 'ALLOWED' : 'DENIED'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span>Cross-Tenant:</span>
                  <span className="text-rose-400 font-bold">NEVER</span>
                </div>
              </div>
            </div>

            {/* Security Guarantee Note */}
            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/50 text-[11px] text-indigo-300 font-mono flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Zero Client Elevation: Client-side UI cannot alter trusted server-side tenant ID or elevate role. All operations strictly verified on server.
              </span>
            </div>
          </div>

          {/* Session Actions */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div>
              <div className="text-xs font-semibold text-white">Reset Demo Environment</div>
              <div className="text-[11px] text-slate-400">Restore all synthetic records to clean seed state</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetDemoData}
                disabled={isResetting}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Reset Seed</span>
              </button>
              <button
                onClick={() => logout()}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* PostgreSQL Defense-in-Depth Tab */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Dual Layer Security Architecture
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> DDL & Policies Formatted
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  PostgreSQL Native Row-Level Security (RLS)
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  In a production PostgreSQL deployment, TenantGuard operates as <strong>Layer 1</strong> (Express authorization middleware), while PostgreSQL Row-Level Security operates as <strong>Layer 2</strong> (database engine kernel isolation).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                </button>
                <button
                  onClick={handleDownloadSql}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white transition-colors cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download DDL</span>
                </button>
              </div>
            </div>

            {/* Architecture Explainer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" /> Layer 1: TenantGuard Middleware
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Extracts verified JWT claims, resolves trusted server-side user record, checks RBAC permissions, and scopes every application query.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-[11px]">
                  <Database className="w-3.5 h-3.5 text-cyan-400" /> Layer 2: PostgreSQL Kernel RLS
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  PostgreSQL enforces policies via <code className="text-cyan-300">current_setting('app.current_tenant_id')</code>. Even if a bug existed in application SQL, PostgreSQL kernel refuses to return foreign rows.
                </p>
              </div>
            </div>

            {/* SQL Code Viewer */}
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{postgresRlsDdl}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
