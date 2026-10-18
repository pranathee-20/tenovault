/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AuditEventsPage } from './pages/AuditEventsPage';
import { SecurityLabPage } from './pages/SecurityLabPage';
import { AttackSimulatorPage } from './pages/AttackSimulatorPage';
import { SuspiciousActivityPage } from './pages/SuspiciousActivityPage';
import { ApiCoveragePage } from './pages/ApiCoveragePage';
import { SettingsPage } from './pages/SettingsPage';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { AuditEvent } from './types';

function AuthenticatedWorkspace() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [selectedAuditForDetail, setSelectedAuditForDetail] = useState<AuditEvent | null>(null);

  const handleOpenAuditDetail = (event: AuditEvent) => {
    setSelectedAuditForDetail(event);
    setCurrentTab('audit');
  };

  const handleInspectAuditId = async (auditId: string) => {
    // Switch to audit tab and let user inspect
    setCurrentTab('audit');
  };

  const renderActiveTabContent = () => {
    switch (currentTab) {
      case 'overview':
        return (
          <OverviewPage
            onNavigateTab={setCurrentTab}
            onOpenAuditDetail={handleOpenAuditDetail}
          />
        );
      case 'documents':
        return <DocumentsPage />;
      case 'audit':
        return (
          <AuditEventsPage
            selectedEventForDetail={selectedAuditForDetail}
            onClearSelectedEvent={() => setSelectedAuditForDetail(null)}
          />
        );
      case 'security-lab':
        return <SecurityLabPage />;
      case 'simulator':
        return <AttackSimulatorPage onInspectAudit={handleOpenAuditDetail} />;
      case 'anomalies':
        return <SuspiciousActivityPage onInspectAuditId={handleInspectAuditId} />;
      case 'api-coverage':
        return <ApiCoveragePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <OverviewPage
            onNavigateTab={setCurrentTab}
            onOpenAuditDetail={handleOpenAuditDetail}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Dark Navy / Slate Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar currentTab={currentTab} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/90 relative">
          <div className="max-w-7xl mx-auto">{renderActiveTabContent()}</div>
        </main>
      </div>
    </div>
  );
}

function MainAppShell() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <span>Verifying TenantGuard Session Credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedWorkspace />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainAppShell />
      </AuthProvider>
    </ToastProvider>
  );
}
