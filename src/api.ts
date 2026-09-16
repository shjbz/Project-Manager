import type {
  CompanySettings,
  TeamMember,
  Client,
  Project,
  Task,
  FollowUp,
  Activity,
  DashboardStats,
} from './types';
import { localDb } from './localDb';
import { INITIAL_COMPANY_SETTINGS } from './initialData';

const TOKEN_KEY = 'company_auth_token';
const API_BASE = (((import.meta as any).env?.VITE_API_BASE_URL as string) || '').replace(/\/+$/, '');

// Static hosting mode detector (e.g. Hostinger Vite static deployment where no Express backend is running)
let isStaticMode: boolean | null = null;

export function isRunningInStaticMode(): boolean {
  return isStaticMode === true;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function checkBackendAvailable(): Promise<boolean> {
  if (isStaticMode !== null) return !isStaticMode;
  try {
    const res = await fetch(`${API_BASE}/api/auth/status`, { credentials: 'include' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || res.status === 404 || contentType.includes('text/html')) {
      isStaticMode = true;
      return false;
    }
    const data = await res.json();
    if (typeof data?.isPasswordSet !== 'boolean') {
      isStaticMode = true;
      return false;
    }
    isStaticMode = false;
    return true;
  } catch {
    isStaticMode = true;
    return false;
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err: any) {
    isStaticMode = true;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (res.status === 404 || contentType.includes('text/html')) {
    isStaticMode = true;
    throw new Error('NOT_FOUND_STATIC_MODE');
  }

  if (res.status === 401) {
    clearStoredToken();
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // --- Auth ---
  async getAuthStatus(): Promise<{
    isPasswordSet: boolean;
    company_name: string;
    logo_url?: string;
    company_logo?: string;
    tagline?: string;
  }> {
    const hasBackend = await checkBackendAvailable();
    if (!hasBackend) {
      return localDb.getAuthStatus();
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/status`, { credentials: 'include' });
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 || contentType.includes('text/html')) {
        isStaticMode = true;
        return localDb.getAuthStatus();
      }
      if (res.ok) {
        return await res.json();
      }
    } catch {
      isStaticMode = true;
      return localDb.getAuthStatus();
    }
    return localDb.getAuthStatus();
  },

  async setupInitialPassword(password: string): Promise<{ success: boolean; token: string; company: CompanySettings }> {
    const hasBackend = await checkBackendAvailable();
    if (!hasBackend) {
      return localDb.setupInitialPassword(password);
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 || contentType.includes('text/html')) {
        isStaticMode = true;
        return localDb.setupInitialPassword(password);
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to configure password' }));
        throw new Error(err.error || 'Failed to configure password');
      }
      const data = await res.json();
      if (data.token) {
        setStoredToken(data.token);
      }
      return data;
    } catch (err: any) {
      if (isStaticMode || err.message === 'NOT_FOUND_STATIC_MODE' || err.name === 'TypeError') {
        isStaticMode = true;
        return localDb.setupInitialPassword(password);
      }
      throw err;
    }
  },

  async login(password: string): Promise<{ success: boolean; token: string; company: CompanySettings }> {
    const hasBackend = await checkBackendAvailable();
    if (!hasBackend) {
      return localDb.login(password);
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 || contentType.includes('text/html')) {
        isStaticMode = true;
        return localDb.login(password);
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(err.error || 'Login failed');
      }
      const data = await res.json();
      if (data.token) {
        setStoredToken(data.token);
      }
      return data;
    } catch (err: any) {
      if (isStaticMode || err.message === 'NOT_FOUND_STATIC_MODE' || err.name === 'TypeError') {
        isStaticMode = true;
        return localDb.login(password);
      }
      throw err;
    }
  },

  async checkSession(): Promise<{ authenticated: boolean; isPasswordSet?: boolean; company: CompanySettings }> {
    const hasBackend = await checkBackendAvailable();
    if (!hasBackend) {
      const res = await localDb.checkSession();
      return {
        authenticated: res.authenticated,
        isPasswordSet: res.isPasswordSet,
        company: res.company || INITIAL_COMPANY_SETTINGS,
      };
    }
    try {
      return await apiFetch(`${API_BASE}/api/auth/session`);
    } catch (e: any) {
      if (isStaticMode || e.message === 'NOT_FOUND_STATIC_MODE') {
        const res = await localDb.checkSession();
        return {
          authenticated: res.authenticated,
          isPasswordSet: res.isPasswordSet,
          company: res.company || INITIAL_COMPANY_SETTINGS,
        };
      }
      throw e;
    }
  },

  async checkAuth(): Promise<{ authenticated: boolean; isPasswordSet?: boolean; company?: CompanySettings }> {
    try {
      const res = await this.checkSession();
      return { authenticated: res.authenticated, isPasswordSet: res.isPasswordSet, company: res.company };
    } catch {
      return { authenticated: false };
    }
  },

  async logout(): Promise<{ success: boolean }> {
    if (isStaticMode) {
      clearStoredToken();
      return localDb.logout();
    }
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    } finally {
      clearStoredToken();
    }
    return { success: true };
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (isStaticMode) {
      return localDb.changePassword(currentPassword, newPassword);
    }
    try {
      return await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    } catch (err: any) {
      if (isStaticMode) {
        return localDb.changePassword(currentPassword, newPassword);
      }
      throw err;
    }
  },

  // --- Company Settings ---
  async getPublicCompany(): Promise<{
    company_name: string;
    logo_url?: string;
    company_logo?: string;
    tagline?: string;
    isPasswordSet?: boolean;
  }> {
    if (isStaticMode) {
      const comp = await localDb.getCompany();
      const status = await localDb.getAuthStatus();
      return {
        company_name: comp.company_name,
        company_logo: comp.company_logo,
        logo_url: comp.logo_url,
        tagline: comp.tagline,
        isPasswordSet: status.isPasswordSet,
      };
    }
    try {
      const res = await fetch(`${API_BASE}/api/company/public`);
      const contentType = res.headers.get('content-type') || '';
      if (res.status === 404 || contentType.includes('text/html')) {
        isStaticMode = true;
        return this.getPublicCompany();
      }
      if (res.ok) {
        return await res.json();
      }
    } catch {
      isStaticMode = true;
      return this.getPublicCompany();
    }
    return { company_name: 'Falcon Engineering & Construction', isPasswordSet: false };
  },

  async getCompany(): Promise<CompanySettings> {
    if (isStaticMode) {
      return localDb.getCompany();
    }
    try {
      return await apiFetch('/api/company');
    } catch (err: any) {
      if (isStaticMode) return localDb.getCompany();
      throw err;
    }
  },

  async updateCompany(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    if (isStaticMode) {
      return localDb.updateCompany(settings);
    }
    try {
      return await apiFetch('/api/company', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.updateCompany(settings);
      throw err;
    }
  },

  // --- Dashboard ---
  async getDashboard(): Promise<any> {
    if (isStaticMode) {
      return localDb.getDashboard();
    }
    try {
      return await apiFetch('/api/dashboard');
    } catch (err: any) {
      if (isStaticMode) return localDb.getDashboard();
      throw err;
    }
  },

  // --- Projects ---
  async getProjects(params: any = {}): Promise<Project[]> {
    if (isStaticMode) {
      let projs = await localDb.getProjects();
      if (params.search) {
        const q = params.search.toLowerCase();
        projs = projs.filter(
          (p) =>
            p.project_name.toLowerCase().includes(q) ||
            p.location?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
      }
      if (params.status) projs = projs.filter((p) => p.status === params.status);
      if (params.priority) projs = projs.filter((p) => p.priority === params.priority);
      return projs;
    }
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.set(key, String(val));
      });
      return await apiFetch(`/api/projects?${query.toString()}`);
    } catch (err: any) {
      if (isStaticMode) return this.getProjects(params);
      throw err;
    }
  },

  async getProject(id: string): Promise<Project> {
    if (isStaticMode) {
      const p = await localDb.getProjectById(id);
      if (!p) throw new Error('Project not found');
      return p;
    }
    try {
      return await apiFetch(`/api/projects/${id}`);
    } catch (err: any) {
      if (isStaticMode) return this.getProject(id);
      throw err;
    }
  },

  async createProject(data: any): Promise<Project> {
    if (isStaticMode) {
      return localDb.createProject(data);
    }
    try {
      return await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.createProject(data);
      throw err;
    }
  },

  async updateProject(id: string, data: any): Promise<Project> {
    if (isStaticMode) {
      return localDb.updateProject(id, data);
    }
    try {
      return await apiFetch(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.updateProject(id, data);
      throw err;
    }
  },

  async deleteProject(id: string): Promise<{ success: boolean }> {
    if (isStaticMode) {
      return localDb.deleteProject(id);
    }
    try {
      return await apiFetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.deleteProject(id);
      throw err;
    }
  },

  async archiveProject(id: string): Promise<Project> {
    if (isStaticMode) {
      return localDb.archiveProject(id);
    }
    try {
      return await apiFetch(`/api/projects/${id}/archive`, {
        method: 'POST',
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.archiveProject(id);
      throw err;
    }
  },

  async restoreProject(id: string): Promise<Project> {
    if (isStaticMode) {
      return localDb.restoreProject(id);
    }
    try {
      return await apiFetch(`/api/projects/${id}/restore`, {
        method: 'POST',
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.restoreProject(id);
      throw err;
    }
  },

  // --- Clients ---
  async getClients(): Promise<Client[]> {
    if (isStaticMode) {
      return localDb.getClients();
    }
    try {
      return await apiFetch('/api/clients');
    } catch (err: any) {
      if (isStaticMode) return localDb.getClients();
      throw err;
    }
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    if (isStaticMode) {
      return localDb.createClient(data);
    }
    try {
      return await apiFetch('/api/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.createClient(data);
      throw err;
    }
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    if (isStaticMode) {
      return localDb.updateClient(id, data);
    }
    try {
      return await apiFetch(`/api/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.updateClient(id, data);
      throw err;
    }
  },

  async deleteClient(id: string): Promise<{ success: boolean }> {
    if (isStaticMode) {
      return localDb.deleteClient(id);
    }
    try {
      return await apiFetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.deleteClient(id);
      throw err;
    }
  },

  // --- Team Members ---
  async getTeam(): Promise<TeamMember[]> {
    if (isStaticMode) {
      return localDb.getTeam();
    }
    try {
      return await apiFetch('/api/team');
    } catch (err: any) {
      if (isStaticMode) return localDb.getTeam();
      throw err;
    }
  },

  async createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
    if (isStaticMode) {
      return localDb.createTeamMember(data);
    }
    try {
      return await apiFetch('/api/team', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.createTeamMember(data);
      throw err;
    }
  },

  async updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
    if (isStaticMode) {
      return localDb.updateTeamMember(id, data);
    }
    try {
      return await apiFetch(`/api/team/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.updateTeamMember(id, data);
      throw err;
    }
  },

  async deleteTeamMember(id: string, reassignTo?: string): Promise<{ success: boolean }> {
    if (isStaticMode) {
      return localDb.deleteTeamMember(id, reassignTo);
    }
    try {
      return await apiFetch(`/api/team/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ reassignTo }),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.deleteTeamMember(id, reassignTo);
      throw err;
    }
  },

  // --- Tasks ---
  async createTask(data: Partial<Task>): Promise<Task> {
    if (isStaticMode) {
      return localDb.createTask(data);
    }
    try {
      return await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.createTask(data);
      throw err;
    }
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    if (isStaticMode) {
      return localDb.updateTask(id, data);
    }
    try {
      return await apiFetch(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.updateTask(id, data);
      throw err;
    }
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    if (isStaticMode) {
      return localDb.deleteTask(id);
    }
    try {
      return await apiFetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.deleteTask(id);
      throw err;
    }
  },

  // --- Follow-ups ---
  async createFollowUp(data: Partial<FollowUp>): Promise<FollowUp> {
    if (isStaticMode) {
      return localDb.createFollowUp(data);
    }
    try {
      return await apiFetch('/api/followups', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.createFollowUp(data);
      throw err;
    }
  },

  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    if (isStaticMode) {
      return localDb.updateFollowUp(id, data);
    }
    try {
      return await apiFetch(`/api/followups/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.updateFollowUp(id, data);
      throw err;
    }
  },

  async deleteFollowUp(id: string): Promise<{ success: boolean }> {
    if (isStaticMode) {
      return localDb.deleteFollowUp(id);
    }
    try {
      return await apiFetch(`/api/followups/${id}`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.deleteFollowUp(id);
      throw err;
    }
  },

  // --- Activities / Updates ---
  async createActivity(data: Partial<Activity>): Promise<Activity> {
    if (isStaticMode) {
      return localDb.createActivity(data);
    }
    try {
      return await apiFetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.createActivity(data);
      throw err;
    }
  },

  // --- Backup & Restore ---
  async exportDatabase(): Promise<any> {
    if (isStaticMode) {
      return localDb.exportBackup();
    }
    try {
      return await apiFetch('/api/backup');
    } catch (err: any) {
      if (isStaticMode) return localDb.exportBackup();
      throw err;
    }
  },

  async importDatabase(data: any): Promise<{ success: boolean; message: string }> {
    if (isStaticMode) {
      return localDb.importBackup(data);
    }
    try {
      return await apiFetch('/api/backup/restore', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.importBackup(data);
      throw err;
    }
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    if (isStaticMode) {
      return localDb.resetDatabase();
    }
    try {
      return await apiFetch('/api/backup/reset', {
        method: 'POST',
      });
    } catch (err: any) {
      if (isStaticMode) return localDb.resetDatabase();
      throw err;
    }
  },

  async restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    return this.importDatabase(data);
  },

  async getDbStatus(): Promise<{
    engine: 'mongodb' | 'file' | 'browser_local';
    uriConfigured: boolean;
    connected: boolean;
    databaseName: string | null;
    error: string | null;
    whitelistHint?: string;
  }> {
    if (isStaticMode) {
      return {
        engine: 'browser_local',
        uriConfigured: false,
        connected: true,
        databaseName: 'browser_localStorage',
        error: null,
      };
    }
    try {
      const res = await fetch(`${API_BASE}/api/db/status`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && !contentType.includes('text/html')) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return {
      engine: 'file',
      uriConfigured: false,
      connected: true,
      databaseName: 'local_file_db',
      error: null,
    };
  },
};
