/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Eye,
  Activity,
  Layers,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SuspiciousActivityAlert, AuditEvent } from '../types';

interface SuspiciousActivityPageProps {
  onInspectAuditId: (auditId: string) => void;
}

export function SuspiciousActivityPage({ onInspectAuditId }: SuspiciousActivityPageProps) {
  const { tenant, token } = useAuth();
  const { addToast } = useToast();

  const [alerts, setAlerts] = useState<SuspiciousActivityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/anomalies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch {
      console.error('[SuspiciousActivity] Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDismiss = async (alertId: string) => {
    try {
      const res = await fetch('/api/anomalies/dismiss', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ alertId })
      });
      if (res.ok) {
        addToast('info', 'Alert Acknowledged', 'Alert has been marked as reviewed by security admin.');
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (err: any) {
      addToast('error', 'Dismiss Error', err.message);
    }
  };

  const getSeverityBadge = (s: string) => {
    switch (s) {
      case 'CRITICAL':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'HIGH':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      default:
        return 'bg-amber-950 text-amber-300 border-amber-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              Heuristic Anomaly Detector
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Deterministic Rules v2.4
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Suspicious Activity & Anomaly Detection
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Continuous background evaluation of recent TenantTrace audit events. Flags repeated denials, sequential resource-ID guessing, cross-tenant breach probes, and role overreach.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
          <span className="text-amber-400 font-semibold block">SIMULATED DETECTIONS</span>
          <span>Deterministic demo rules active</span>
        </div>
      </div>

      {/* Rules Overview Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" /> Rule 1: High Frequency Denials
          </div>
          <p className="text-[11px] text-slate-400">
            Triggers when &ge;2 authorization rejections occur in a short time frame, indicating scanning or brute-force probing.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 text-orange-400" /> Rule 2: Sequential ID Enumeration
          </div>
          <p className="text-[11px] text-slate-400">
            Triggers when consecutive requests attempt to guess pattern-based resource identifiers (doc-001, doc-002).
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" /> Rule 3: Role Overreach Attempt
          </div>
          <p className="text-[11px] text-slate-400">
            Flags restricted mutation attempts by lower-privileged roles (e.g. Viewer attempting to write or delete).
          </p>
        </div>
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          Scanning audit logs for anomalous patterns...
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Suspicious Activity Detected</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All recent workspace operations adhere to valid tenant boundaries and role privileges. Use the Attack Simulator to trigger a test detection.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${getSeverityBadge(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                        {alert.ruleId}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        SIMULATED DETECTION
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{alert.title}</h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors shrink-0 cursor-pointer"
                >
                  Acknowledge
                </button>
              </div>

              {/* Forensic Details */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Actor Account:</span>
                  <span className="text-slate-200">{alert.actorEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span>Detected At:</span>
                  <span className="text-slate-200">{new Date(alert.triggerTimestamp).toUTCString()}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>Related Audit IDs:</span>
                  <div className="flex items-center gap-1.5">
                    {alert.relatedAuditIds.slice(0, 3).map((id) => (
                      <button
                        key={id}
                        onClick={() => onInspectAuditId(id)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-mono cursor-pointer"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recommended Response */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200 space-y-1">
                <span className="font-semibold text-amber-300 block font-mono text-[11px] uppercase">
                  Recommended Incident Response Action:
                </span>
                <p className="leading-relaxed">{alert.recommendedAction}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
