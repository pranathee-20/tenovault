/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Building2,
  UserCheck,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Fingerprint,
  Layers,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function LoginPage() {
  const { login, quickLogin, isLoading } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('alice@acme.test');
  const [password, setPassword] = useState('DemoSafe!2026');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await login(email.trim(), password);
      addToast('success', 'Authenticated', `Signed in as ${email}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
      addToast('error', 'Login Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectDemoAccount = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoSafe!2026');
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await quickLogin(demoEmail);
      addToast('success', 'Demo Persona Activated', `Signed in as ${demoEmail}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Demo sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 mb-4 shadow-xl">
          <ShieldCheck className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
          TENOVAULT
          <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            Portal
          </span>
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Tenant Safe Workspace Portal with TenantGuard & TenantTrace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/80 border border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">Authentication Denied: </span>
                {errorMsg}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.test"
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Demo Pass: <code className="text-slate-300">DemoSafe!2026</code>
                </span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/90 border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Verifying TenantGuard...' : 'Authenticate & Enter Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher Section */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Fingerprint className="w-3.5 h-3.5 text-indigo-400" /> Synthetic Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400">Click to instantly load</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tenant 1: Acme Labs */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-900/40">
                <div className="flex items-center justify-between text-xs font-medium text-indigo-300 mb-2">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Acme Labs Inc.
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">SOC2 Type II</span>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleSelectDemoAccount('alice@acme.test')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-slate-200">Alice Vance</div>
                      <div className="text-[10px] text-slate-400 font-mono">alice@acme.test</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      Admin
                    </span>
                  </button>

                  <button
                    onClick={() => handleSelectDemoAccount('bob@acme.test')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-slate-200">Bob Martin</div>
                      <div className="text-[10px] text-slate-400 font-mono">bob@acme.test</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Editor
                    </span>
                  </button>

                  <button
                    onClick={() => handleSelectDemoAccount('charlie@acme.test')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-slate-200">Charlie Chen</div>
                      <div className="text-[10px] text-slate-400 font-mono">charlie@acme.test</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Viewer
                    </span>
                  </button>
                </div>
              </div>

              {/* Tenant 2: BlueNova Systems */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-900/40">
                <div className="flex items-center justify-between text-xs font-medium text-cyan-300 mb-2">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" /> BlueNova Systems
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">ISO 27001</span>
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleSelectDemoAccount('diana@bluenova.test')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-slate-200">Diana Prince</div>
                      <div className="text-[10px] text-slate-400 font-mono">diana@bluenova.test</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      Admin
                    </span>
                  </button>

                  <button
                    onClick={() => handleSelectDemoAccount('evan@bluenova.test')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-slate-200">Evan Wright</div>
                      <div className="text-[10px] text-slate-400 font-mono">evan@bluenova.test</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Editor
                    </span>
                  </button>

                  <button
                    onClick={() => handleSelectDemoAccount('fiona@bluenova.test')}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-800 text-left text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-slate-200">Fiona Gallagher</div>
                      <div className="text-[10px] text-slate-400 font-mono">fiona@bluenova.test</div>
                    </div>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Viewer
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Security Architecture Guarantees */}
          <div className="mt-5 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="font-medium text-slate-300 flex items-center gap-1 font-mono">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> Non-Negotiable TenantGuard Protocol
            </div>
            <p>
              1. Authenticate Identity &bull; 2. Verify Server-Side Membership &bull; 3. Enforce Role Permissions &bull; 4. Verify Target Resource Tenant Ownership. Deny by default.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
