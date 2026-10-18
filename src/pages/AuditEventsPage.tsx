/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Shield,
  Fingerprint,
  ExternalLink,
  X,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  FileJson,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AuditEvent } from '../types';
import { SearchHighlight } from '../components/SearchHighlight';

interface AuditEventsPageProps {
  selectedEventForDetail?: AuditEvent | null;
  onClearSelectedEvent?: () => void;
}

export function AuditEventsPage({ selectedEventForDetail, onClearSelectedEvent }: AuditEventsPageProps) {
  const { user, tenant, token } = useAuth();
  const { addToast } = useToast();

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [activeModalEvent, setActiveModalEvent] = useState<AuditEvent | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isExporting, setIsExporting] = useState<'csv' | 'json' | null>(null);

  useEffect(() => {
    if (selectedEventForDetail) {
      setActiveModalEvent(selectedEventForDetail);
    }
  }, [selectedEventForDetail]);

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (decisionFilter !== 'ALL') params.append('decision', decisionFilter);
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);
      params.append('limit', '100');

      const res = await fetch(`/api/audit-events?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      } else {
        addToast('error', 'Fetch Failed', 'Unable to retrieve audit timeline');
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to reach audit ledger');
    } finally {
      setLoading(false);
    }
  }, [token, search, decisionFilter, severityFilter, addToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCopyRequestId = (reqId: string) => {
    navigator.clipboard.writeText(reqId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!token) return;
    if (user?.role === 'viewer') {
      addToast(
        'error',
        'Export Forbidden',
        'Viewer role has read-only access. Editor or Admin role required to export audit logs.'
      );
      return;
    }

    setIsExporting(format);
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (search) params.append('search', search);
      if (decisionFilter !== 'ALL') params.append('decision', decisionFilter);
      if (severityFilter !== 'ALL') params.append('severity', severityFilter);

      const res = await fetch(`/api/audit-events/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || 'Server authorization failure during export');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `tenovault-audit-${tenant?.id || 'tenant'}-${timestamp}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast(
        'success',
        `Export Complete (${format.toUpperCase()})`,
        `Downloaded audit records strictly scoped to ${tenant?.name}. Verified zero cross-tenant contamination.`
      );
    } catch (err: any) {
      addToast('error', 'Export Failed', err.message);
    } finally {
      setIsExporting(null);
    }
  };

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'WARNING':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const isViewer = user?.role === 'viewer';

  return (
    <div className="space-y-6">
      {/* Search & Filter Header with Export Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-md">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, request ID, or resource..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Decision Filter */}
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            aria-label="Filter by authorization decision"
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Decisions</option>
            <option value="ALLOWED">ALLOWED Only</option>
            <option value="DENIED">DENIED Only</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by security severity"
            className="bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={() => handleExport('csv')}
            disabled={isViewer || isExporting !== null}
            title={isViewer ? 'Viewer role is read-only. Editor or Admin required to export.' : 'Export scoped audit events as CSV'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isExporting === 'csv' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Export CSV</span>
          </button>

          {/* Export JSON Button */}
          <button
            onClick={() => handleExport('json')}
            disabled={isViewer || isExporting !== null}
            title={isViewer ? 'Viewer role is read-only. Editor or Admin required to export.' : 'Export scoped audit events as JSON'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isExporting === 'json' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Tenant Isolation Boundary Guarantee Notice */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>TenantTrace Boundary Active:</strong> All audit records displayed are cryptographically scoped to{' '}
            <span className="text-white font-semibold">{tenant?.name}</span> ({tenant?.id}). Zero foreign tenant entries can be queried.
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
          Immutable Ledger
        </span>
      </div>

      {/* Events Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Fetching verified TenantTrace audit events...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No audit records matching specified filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] uppercase font-mono text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Decision</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Resource ID</th>
                  <th className="py-3 px-4">Reason / Detail</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {events.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setActiveModalEvent(ev)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      <span className="text-slate-600 ml-1 text-[10px]">
                        .{new Date(ev.timestamp).getMilliseconds().toString().padStart(3, '0')}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
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
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${getSeverityBadge(
                          ev.severity
                        )}`}
                      >
                        {ev.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200 text-[11px] whitespace-nowrap">
                      <SearchHighlight text={ev.action} query={search} />
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-xs">
                      <div className="truncate max-w-[150px]" title={ev.actorEmail}>
                        <SearchHighlight text={ev.actorEmail} query={search} />
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        {ev.actorRole}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] truncate max-w-[130px]">
                      <SearchHighlight text={ev.resourceId} query={search} />
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs truncate max-w-[200px]" title={ev.safeDetail}>
                      {ev.denialReasonCode ? (
                        <span className="text-rose-400 font-mono text-[11px] block truncate">
                          [<SearchHighlight text={ev.denialReasonCode} query={search} />]
                        </span>
                      ) : null}
                      <span className="truncate block">
                        <SearchHighlight text={ev.safeDetail} query={search} />
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[11px] text-indigo-400 group-hover:text-indigo-300 inline-flex items-center gap-1 font-medium">
                        Detail <ExternalLink className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EVENT DETAIL MODAL */}
      {activeModalEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                      activeModalEvent.decision === 'ALLOWED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {activeModalEvent.decision}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${getSeverityBadge(
                      activeModalEvent.severity
                    )}`}
                  >
                    {activeModalEvent.severity}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    <SearchHighlight text={activeModalEvent.action} query={search} />
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">
                  TenantTrace Audit Event Detail
                </h3>
              </div>
              <button
                onClick={() => {
                  setActiveModalEvent(null);
                  if (onClearSelectedEvent) onClearSelectedEvent();
                }}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Core Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800/80 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Timestamp (UTC):</span>
                <span className="text-slate-200">{activeModalEvent.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Request / Correlation ID:</span>
                <span className="text-indigo-400 flex items-center gap-1.5">
                  <SearchHighlight text={activeModalEvent.requestId} query={search} />
                  <button
                    onClick={() => handleCopyRequestId(activeModalEvent.requestId)}
                    className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                    title="Copy Request ID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Authorized Tenant:</span>
                <span className="text-slate-200">{activeModalEvent.tenantId}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Target Foreign Tenant:</span>
                <span className="text-rose-400 font-bold">
                  {activeModalEvent.targetTenantId || '(None - Same Tenant)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Actor Identity:</span>
                <span className="text-slate-200">
                  <SearchHighlight text={activeModalEvent.actorEmail} query={search} />
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Actor Role:</span>
                <span className="text-cyan-400 uppercase">{activeModalEvent.actorRole}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Resource Type & ID:</span>
                <span className="text-slate-200">
                  {activeModalEvent.resourceType}: <SearchHighlight text={activeModalEvent.resourceId} query={search} />
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Safe Reason Code:</span>
                <span className="text-rose-300 font-bold">
                  <SearchHighlight
                    text={activeModalEvent.denialReasonCode || 'SUCCESS_AUTHORIZED'}
                    query={search}
                  />
                </span>
              </div>
            </div>

            {/* Sanitized Detail */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Safe Audit Explanation
              </span>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans">
                <SearchHighlight text={activeModalEvent.safeDetail} query={search} />
              </div>
            </div>

            {/* Network / Client Metadata */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
              <div>IP Address: {activeModalEvent.ipAddress}</div>
              <div className="truncate">User Agent: {activeModalEvent.userAgent}</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setActiveModalEvent(null);
                  if (onClearSelectedEvent) onClearSelectedEvent();
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
