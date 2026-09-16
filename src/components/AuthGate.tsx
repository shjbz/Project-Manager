import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ArrowRight, ShieldAlert, Building2, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import type { CompanySettings } from '../types';

interface AuthGateProps {
  onSuccess?: (company?: CompanySettings) => void;
  onAuthenticated?: () => void;
  initialCompany?: Partial<CompanySettings> | null;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess, onAuthenticated, initialCompany }) => {
  const [mode, setMode] = useState<'checking' | 'setup' | 'login'>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [companyInfo, setCompanyInfo] = useState<{
    company_name: string;
    logo_url?: string;
    company_logo?: string;
    tagline?: string;
  }>({
    company_name: initialCompany?.company_name || 'Falcon Engineering & Construction',
    logo_url: initialCompany?.logo_url || initialCompany?.company_logo,
    company_logo: initialCompany?.company_logo || initialCompany?.logo_url,
    tagline: initialCompany?.tagline || 'Centralized Workspace & Operations Command',
  });

  useEffect(() => {
    let isMounted = true;

    api.getAuthStatus().then((status) => {
      if (!isMounted) return;
      if (status.company_name) {
        setCompanyInfo({
          company_name: status.company_name,
          logo_url: status.logo_url || status.company_logo,
          company_logo: status.company_logo || status.logo_url,
          tagline: status.tagline || 'Centralized Workspace & Operations Command',
        });
      }

      if (!status.isPasswordSet) {
        setMode('setup');
      } else {
        setMode('login');
      }
    }).catch(() => {
      if (isMounted) {
        setMode('login');
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPw = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanPw) {
      setError('Please enter a master password');
      return;
    }
    if (cleanPw.length < 4) {
      setError('Master password must be at least 4 characters long');
      return;
    }
    if (cleanPw !== cleanConfirm) {
      setError('Passwords do not match. Please check both fields.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.setupInitialPassword(cleanPw);
      if (typeof onSuccess === 'function') {
        onSuccess(res.company);
      }
      if (typeof onAuthenticated === 'function') {
        onAuthenticated();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize company password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPw = password.trim();

    if (!cleanPw) {
      setError('Please enter the company password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.login(cleanPw);
      if (typeof onSuccess === 'function') {
        onSuccess(res.company);
      }
      if (typeof onAuthenticated === 'function') {
        onAuthenticated();
      }
    } catch (err: any) {
      // If server indicates needsSetup, switch mode
      if (err.message && err.message.toLowerCase().includes('not yet configured')) {
        setMode('setup');
        setError('No password has been configured yet. Please set your master password below.');
      } else {
        setError(err.message || 'Incorrect company password');
      }
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = companyInfo.logo_url || companyInfo.company_logo;

  if (mode === 'checking') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs">
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-5 py-4 rounded-xl shadow-lg">
          <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
          <span>Verifying security status...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="auth-gate-container"
      className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-zinc-800 selection:text-white"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-zinc-100 relative">
        {/* Company Identity */}
        <div className="flex flex-col items-center text-center space-y-3 mb-7">
          {logoSrc ? (
            <div className="w-16 h-16 rounded-xl bg-zinc-800/80 border border-zinc-700 p-1 flex items-center justify-center shadow-lg overflow-hidden">
              <img
                src={logoSrc}
                alt={companyInfo.company_name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-inner">
              <Building2 className="w-7 h-7 stroke-[1.5]" />
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold text-zinc-400">
              {companyInfo.company_name}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mt-1">
              {mode === 'setup' ? 'Set Master Workspace Password' : 'Workspace Access'}
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">
              {mode === 'setup'
                ? 'Welcome to Falcon Engineering & Construction! Please initialize your master workspace password to get started.'
                : companyInfo.tagline || 'Centralized Workspace & Operations Command'}
            </p>
          </div>
        </div>

        {/* Setup Password Form */}
        {mode === 'setup' && (
          <form onSubmit={handleSetupPassword} className="space-y-4">
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                First-time setup: Choose a secure password (minimum 4 characters) to protect your projects, client records, and team activities.
              </span>
            </div>

            <div>
              <label
                htmlFor="setup-password-input"
                className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-2"
              >
                Create Master Password
              </label>
              <div className="relative">
                <input
                  id="setup-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min. 4 characters)"
                  autoFocus
                  required
                  className="w-full bg-zinc-950/80 border border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 rounded-lg px-4 py-3 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="setup-confirm-password-input"
                className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-2"
              >
                Confirm Master Password
              </label>
              <div className="relative">
                <input
                  id="setup-confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password to confirm"
                  required
                  className="w-full bg-zinc-950/80 border border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 rounded-lg px-4 py-3 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  tabIndex={-1}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                id="auth-error-message"
                className="flex items-center gap-2 p-3 text-xs bg-rose-950/50 border border-rose-800/80 text-rose-300 rounded-lg"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="set-password-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm py-3 px-4 rounded-lg transition disabled:opacity-50 cursor-pointer shadow-md mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save Password & Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Standard Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="company-password-input"
                className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-2"
              >
                Company Master Password
              </label>
              <div className="relative">
                <input
                  id="company-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter company password"
                  autoFocus
                  required
                  className="w-full bg-zinc-950/80 border border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 rounded-lg px-4 py-3 pr-10 text-sm text-white placeholder-zinc-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                id="auth-error-message"
                className="flex items-center gap-2 p-3 text-xs bg-rose-950/50 border border-rose-800/80 text-rose-300 rounded-lg"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="enter-workspace-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm py-3 px-4 rounded-lg transition disabled:opacity-50 cursor-pointer shadow"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Workspace Security Footer */}
        <div className="mt-8 pt-5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted Session Storage</span>
          </div>
          <span>Production Ready</span>
        </div>
      </div>
    </div>
  );
};
