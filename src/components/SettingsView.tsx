import React, { useState, useEffect, useRef } from 'react';
import {
  KeyRound,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Building2,
  Image as ImageIcon,
  Trash2,
  Save,
} from 'lucide-react';
import { api } from '../api';
import type { CompanySettings } from '../types';

interface SettingsViewProps {
  onRefreshAllData: () => Promise<void>;
  company?: Partial<CompanySettings> | null;
  onCompanyUpdated?: (company: CompanySettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onRefreshAllData,
  company,
  onCompanyUpdated,
}) => {
  // Company Branding state
  const [companyName, setCompanyName] = useState(company?.company_name || '');
  const [companyLogo, setCompanyLogo] = useState(company?.logo_url || company?.company_logo || '');
  const [tagline, setTagline] = useState(company?.tagline || '');
  const [companyAddress, setCompanyAddress] = useState(company?.company_address || '');
  const [companyPhone, setCompanyPhone] = useState(company?.company_phone || '');
  const [companyEmail, setCompanyEmail] = useState(company?.company_email || '');
  const [brandMsg, setBrandMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [brandLoading, setBrandLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync when company prop updates
  useEffect(() => {
    if (company) {
      setCompanyName(company.company_name || '');
      setCompanyLogo(company.logo_url || company.company_logo || '');
      setTagline(company.tagline || '');
      setCompanyAddress(company.company_address || '');
      setCompanyPhone(company.company_phone || '');
      setCompanyEmail(company.company_email || '');
    }
  }, [company]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Import / Export state
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetting, setResetting] = useState(false);

  // Database engine & MongoDB status
  const [dbStatus, setDbStatus] = useState<{
    engine: 'mongodb' | 'file' | 'browser_local';
    uriConfigured: boolean;
    connected: boolean;
    databaseName: string | null;
    error: string | null;
    whitelistHint?: string;
  } | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  const fetchDbStatus = async () => {
    setDbLoading(true);
    try {
      const status = await api.getDbStatus();
      setDbStatus(status);
    } catch {
      // ignore
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBrandMsg({ type: 'error', text: 'Please select a valid image file (PNG, JPG, SVG, WebP)' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBrandMsg({ type: 'error', text: 'Image file size must be less than 5MB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyLogo(reader.result);
        setBrandMsg(null);
      }
    };
    reader.onerror = () => {
      setBrandMsg({ type: 'error', text: 'Failed to read image file' });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBrandSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setBrandMsg({ type: 'error', text: 'Company name is required' });
      return;
    }

    setBrandLoading(true);
    setBrandMsg(null);
    try {
      const updated = await api.updateCompany({
        company_name: companyName.trim(),
        company_logo: companyLogo.trim() || undefined,
        logo_url: companyLogo.trim() || undefined,
        tagline: tagline.trim() || undefined,
        company_address: companyAddress.trim(),
        company_phone: companyPhone.trim(),
        company_email: companyEmail.trim(),
      });

      if (onCompanyUpdated) {
        onCompanyUpdated(updated);
      }
      await onRefreshAllData();
      setBrandMsg({
        type: 'success',
        text: 'Company branding and settings successfully updated! New name & logo are active on sidebar and login.',
      });
    } catch (err: any) {
      setBrandMsg({ type: 'error', text: err.message || 'Failed to update company settings' });
    } finally {
      setBrandLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 4 characters long' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: res.message || 'Password successfully updated' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await api.exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `archvibe_pm_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export data: ' + err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await api.importDatabase(json);
      setImportMsg({ type: 'success', text: 'Company database successfully restored!' });
      await onRefreshAllData();
    } catch (err: any) {
      setImportMsg({ type: 'error', text: 'Failed to import backup: ' + err.message });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleResetToDemo = async () => {
    if (!confirm('Reset all company data back to the clean demonstration seed state? Any modifications will be replaced.')) {
      return;
    }

    setResetting(true);
    try {
      await api.resetDatabase();
      await onRefreshAllData();
      alert('Database successfully reset to initial demo state.');
    } catch (err: any) {
      alert('Reset failed: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div id="settings-view-container" className="max-w-4xl space-y-8 pb-16">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-5">
        <div className="text-[11px] uppercase tracking-widest font-bold text-zinc-400">
          System Administration
        </div>
        <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mt-0.5">Workspace Settings</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Configure company identity, branding logo, access security, and persistent backups.
        </p>
      </div>

      {/* Section 1: Company Identity & Branding */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Company Identity & Branding</h2>
            <p className="text-xs text-zinc-500">
              Customize company name, logo, and tagline. These immediately reflect on the login screen and sidebar navigation.
            </p>
          </div>
        </div>

        {brandMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
              brandMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {brandMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{brandMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveBrandSettings} className="space-y-5 pt-1 text-xs">
          {/* Logo Upload & Preview Area */}
          <div>
            <label className="block font-semibold text-zinc-700 mb-2">Company Logo</label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden p-1 shrink-0 shadow-2xs">
                {companyLogo ? (
                  <img
                    src={companyLogo}
                    alt="Company Logo Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-zinc-400" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    id="company-logo-file-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Image</span>
                  </button>

                  {companyLogo && (
                    <button
                      type="button"
                      onClick={() => setCompanyLogo('')}
                      className="px-2.5 py-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer flex items-center gap-1"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-zinc-400">
                  PNG, JPG, WebP, or SVG. Maximum file size 5MB.
                </div>
              </div>
            </div>

            {/* Optional URL input */}
            <div className="mt-3">
              <span className="text-[11px] text-zinc-500 font-medium block mb-1">
                Or enter image URL directly:
              </span>
              <input
                id="settings-company-logo-url-input"
                type="text"
                value={companyLogo.startsWith('data:') ? '' : companyLogo}
                onChange={(e) => setCompanyLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full max-w-md px-3 py-1.5 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 text-xs"
              />
            </div>
          </div>

          {/* Company Name & Tagline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Company Name *</label>
              <input
                id="settings-company-name-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Falcon Engineering & Construction"
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Tagline / Subtitle</label>
              <input
                id="settings-company-tagline-input"
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Centralized Workspace & Operations Command"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Company Email</label>
              <input
                id="settings-company-email-input"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="contact@example.com"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Company Phone</label>
              <input
                id="settings-company-phone-input"
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="+880 1711-000000"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Office Address</label>
              <input
                id="settings-company-address-input"
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="City, Country"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          <button
            id="settings-save-branding-btn"
            type="submit"
            disabled={brandLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold shadow transition cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{brandLoading ? 'Saving Branding...' : 'Save Company Branding'}</span>
          </button>
        </form>
      </div>

      {/* Section 2: Shared Password Change (Spec #44) */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Change Company Access Password</h2>
            <p className="text-xs text-zinc-500">
              Update the shared single password used by all team members to unlock the workspace.
            </p>
          </div>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {passwordMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md pt-2 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Current Password</label>
            <input
              id="settings-current-password-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter existing password"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">New Password</label>
            <input
              id="settings-new-password-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 4 characters"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Confirm New Password</label>
            <input
              id="settings-confirm-password-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            />
          </div>

          <button
            id="settings-update-password-btn"
            type="submit"
            disabled={passwordLoading}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold shadow transition cursor-pointer disabled:opacity-50"
          >
            {passwordLoading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Section 2: Data Export & Backup (Spec #45) */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Export Company Data Backup</h2>
            <p className="text-xs text-zinc-500">
              Download a complete, offline JSON archive of all projects, clients, staff, tasks, and histories.
            </p>
          </div>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed max-w-2xl">
          Creates a snapshot containing all company database records. You can store this backup on local drives or import it into any instance of Company Project Management.
        </p>

        <button
          id="settings-export-backup-btn"
          onClick={handleExportData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
        >
          <FileJson className="w-4 h-4" />
          <span>Download JSON Backup</span>
        </button>
      </div>

      {/* Section 3: Data Import & Restoration (Spec #46) */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Restore Backup Archive</h2>
            <p className="text-xs text-zinc-500">
              Restore previous project records and histories from a JSON file.
            </p>
          </div>
        </div>

        {importMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
              importMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {importMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{importMsg.text}</span>
          </div>
        )}

        <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 text-center max-w-lg hover:border-zinc-400 transition cursor-pointer relative bg-zinc-50/50">
          <input
            id="settings-file-upload-input"
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={importing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <div className="text-xs font-semibold text-zinc-800">
            {importing ? 'Processing backup file...' : 'Click or Drag & Drop JSON backup file here'}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Accepts standard .json archives</div>
        </div>
      </div>

      {/* Database Engine & MongoDB Storage Info */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              dbStatus?.connected && dbStatus?.engine === 'mongodb'
                ? 'bg-emerald-100 text-emerald-700'
                : dbStatus?.uriConfigured && !dbStatus?.connected
                ? 'bg-amber-100 text-amber-700'
                : 'bg-zinc-100 text-zinc-800'
            }`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900">Database Engine & Storage</h2>
                {dbStatus && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    dbStatus.connected && dbStatus.engine === 'mongodb'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : dbStatus.uriConfigured && !dbStatus.connected
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {dbStatus.connected && dbStatus.engine === 'mongodb'
                      ? 'MongoDB Atlas Connected'
                      : dbStatus.uriConfigured && !dbStatus.connected
                      ? 'MongoDB URI Configured (Connecting...)'
                      : dbStatus.engine === 'browser_local'
                      ? 'Browser Storage'
                      : 'Local File Engine'}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                Persistence configuration for all project, client, task, staff, and company records.
              </p>
            </div>
          </div>
          <button
            id="settings-refresh-db-btn"
            onClick={fetchDbStatus}
            disabled={dbLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-lg border border-zinc-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? 'animate-spin' : ''}`} />
            <span>{dbLoading ? 'Checking...' : 'Check Connection'}</span>
          </button>
        </div>

        {dbStatus?.connected && dbStatus?.engine === 'mongodb' && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1.5 text-emerald-900">
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Connected to MongoDB database: <span className="font-mono font-bold">{dbStatus.databaseName || 'falcon_db'}</span>
            </div>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              All projects, clients, tasks, team members, activities, and settings are saved and updated live in your MongoDB cluster.
            </p>
          </div>
        )}

        {dbStatus?.uriConfigured && !dbStatus?.connected && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2 text-amber-900">
            <div className="font-semibold flex items-center gap-1.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              MongoDB Atlas connection pending or requires IP whitelisting
            </div>
            {dbStatus.error && (
              <p className="font-mono text-[11px] bg-amber-100/70 p-2 rounded text-amber-950 break-all">
                {dbStatus.error}
              </p>
            )}
            <div className="text-[11px] leading-relaxed space-y-1 text-amber-800">
              <p className="font-semibold">Troubleshooting MongoDB Atlas:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Go to <strong>MongoDB Atlas</strong> &rarr; <strong>Network Access</strong> &rarr; <strong>IP Access List</strong>.</li>
                <li>Add your server IP: <span className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded text-amber-900">82.180.143.163</span> (or temporarily allow <span className="font-mono">0.0.0.0/0</span>).</li>
                <li>Ensure your MongoDB Database User has <strong>readWriteAnyDatabase</strong> or read/write privileges.</li>
              </ul>
            </div>
          </div>
        )}

        {!dbStatus?.uriConfigured && dbStatus?.engine !== 'browser_local' && (
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs space-y-1.5 text-zinc-700">
            <p className="font-semibold text-zinc-900">Current Storage: Server Local Database (`data/db.json`)</p>
            <p className="text-zinc-600 text-[11px] leading-relaxed">
              To store all company records directly in <strong>MongoDB Atlas</strong>, set the <span className="font-mono font-semibold text-zinc-900">MONGODB_URI</span> environment variable in your server configuration or hosting panel (e.g. <span className="font-mono text-zinc-800">mongodb+srv://user:pass@cluster0.mongodb.net/falcon_db</span>). The server will automatically connect and sync all collections!
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100 text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Collections</div>
            <div className="text-xs font-bold text-zinc-800 mt-0.5">7 Collections</div>
          </div>
          <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100 text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Projects & Tasks</div>
            <div className="text-xs font-bold text-zinc-800 mt-0.5">Auto-Synced</div>
          </div>
          <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100 text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Data Backups</div>
            <div className="text-xs font-bold text-zinc-800 mt-0.5">JSON & Mongo</div>
          </div>
          <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100 text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Whitelisted IP</div>
            <div className="text-xs font-mono font-bold text-zinc-800 mt-0.5">82.180.143.163</div>
          </div>
        </div>
      </div>

      {/* Section 4: Demo Reset Utility */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">Restore Demonstration Data</h2>
            <p className="text-xs text-zinc-500">
              Reset database to initial sample projects (Gulshan Residence, Banani Corporate Office, etc.).
            </p>
          </div>
          <button
            id="settings-reset-demo-btn"
            onClick={handleResetToDemo}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-lg border border-zinc-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset to Demo Seed'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
