import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, ShieldAlert, Building2 } from 'lucide-react';
import { api } from '../api';
import type { CompanySettings } from '../types';

interface AuthGateProps {
  onSuccess?: (company?: CompanySettings) => void;
  onAuthenticated?: () => void;
  initialCompany?: Partial<CompanySettings> | null;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onSuccess, onAuthenticated, initialCompany }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{
    company_name: string;
    logo_url?: string;
    company_logo?: string;
    tagline?: string;
  }>({
    company_name: initialCompany?.company_name || 'Studio Archvibe & Associates',
    logo_url: initialCompany?.logo_url || initialCompany?.company_logo,
    company_logo: initialCompany?.company_logo || initialCompany?.logo_url,
    tagline: initialCompany?.tagline || 'Centralized Workspace & Operations Command',
  });

  useEffect(() => {
    let isMounted = true;
    api.getPublicCompany().then((data) => {
      if (isMounted && data) {
        setCompanyInfo({
          company_name: data.company_name || 'Studio Archvibe & Associates',
          logo_url: data.logo_url || data.company_logo,
          company_logo: data.company_logo || data.logo_url,
          tagline: data.tagline || 'Centralized Workspace & Operations Command',
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the company password');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(password.trim());
      if (typeof onSuccess === 'function') {
        onSuccess(res.company);
      }
      if (typeof onAuthenticated === 'function') {
        onAuthenticated();
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect company password');
    } finally {
      setLoading(false);
    }
  };

  const logoSrc = companyInfo.logo_url || companyInfo.company_logo;

  return (
    <div
      id="auth-gate-container"
      className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-zinc-800 selection:text-white"
    >
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-2xl text-zinc-100 relative">
        {/* Company Identity */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          {logoSrc ? (
            <div className="w-16 h-16 rounded-xl bg-zinc-800/80 border border-zinc-700 p-1 flex items-center justify-center shadow-lg overflow-hidden">
              <img
                src={logoSrc}
                alt={companyInfo.company_name}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 shadow-inner">
              <Building2 className="w-7 h-7 stroke-[1.5]" />
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-widest font-semibold text-zinc-400">
              {companyInfo.company_name}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mt-1">
              Company Project Management
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {companyInfo.tagline || 'Centralized Workspace & Operations Command'}
            </p>
          </div>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="company-password-input"
              className="block text-xs uppercase tracking-wider font-semibold text-zinc-300 mb-2"
            >
              Company Password
            </label>
            <div className="relative">
              <input
                id="company-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                className="w-full bg-zinc-950/80 border border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition"
              />
              <Lock className="w-4 h-4 text-zinc-500 absolute right-3.5 top-3.5" />
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

        {/* Hint for workspace access */}
        <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-500">
            Initial company workspace password:{' '}
            <code className="text-zinc-300 font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-[11px]">
              company2026
            </code>
          </p>
        </div>
      </div>
    </div>
  );
};
