/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  FileText,
  Activity,
  TestTube2,
  Crosshair,
  AlertTriangle,
  BookOpen,
  Settings,
  LogOut,
  Building2,
  Lock,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const { user, tenant, logout, switchUser } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'documents', label: 'Workspace Documents', icon: FileText, badge: 'Protected' },
    ...(user?.role === 'admin'
      ? [
          { id: 'audit', label: 'TenantTrace Audit', icon: Activity, badge: 'Live' },
          { id: 'anomalies', label: 'Suspicious Activity', icon: AlertTriangle }
        ]
      : []),
    { id: 'security-lab', label: 'Security Test Lab', icon: TestTube2, highlight: true },
    { id: 'simulator', label: 'Attack Simulator', icon: Crosshair },
    { id: 'api-coverage', label: 'API & Test Coverage', icon: BookOpen },
    { id: 'settings', label: 'Settings & RLS Defense', icon: Settings }
  ];

  const handleToggleTenant = async () => {
    if (!tenant) return;
    if (tenant.id === 'tenant-acme-corp') {
      await switchUser('diana@bluenova.test'); // Switch to BlueNova Admin
    } else {
      await switchUser('alice@acme.test'); // Switch to Acme Admin
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      case 'editor':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-white flex items-center gap-1.5 text-base">
              TENOVAULT
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                v1.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Lock className="w-3 h-3 text-cyan-400" /> TenantGuard Active
            </div>
          </div>
        </div>
      </div>

      {/* Active Tenant Box */}
      <div className="p-3 mx-3 my-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="flex items-center gap-1 font-mono uppercase tracking-wider text-[10px]">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Active Tenant
          </span>
          <button
            onClick={handleToggleTenant}
            className="flex items-center gap-1 text-[10px] text-indigo-300 hover:text-indigo-200 transition-colors font-medium cursor-pointer"
            title="Fast switch between Acme and BlueNova tenants"
          >
            <ArrowRightLeft className="w-2.5 h-2.5" /> Switch
          </button>
        </div>
        <div className="font-semibold text-slate-100 truncate text-sm">
          {tenant?.name || 'Loading Tenant...'}
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400 font-mono">
          <span className="truncate max-w-[130px]" title={tenant?.id}>
            {tenant?.id}
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Isolated
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50'
                      : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer Profile & Session */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-indigo-700 flex items-center justify-center text-white font-bold text-xs uppercase shadow-inner">
              {user?.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-200 truncate">{user?.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium ${getRoleBadgeColor(
                    user?.role
                  )}`}
                >
                  {user?.role}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                  {user?.department.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            title="Sign out of current tenant session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
