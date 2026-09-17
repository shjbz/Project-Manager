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

const TOKEN_KEY = 'company_auth_token';
const API_BASE = (((import.meta as any).env?.VITE_API_BASE_URL as string) || '').replace(/\/+$/, '');

export function isRunningInStaticMode(): boolean {
  return false;
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
    throw new Error(
      `Unable to reach server API at ${endpoint}. Please verify your Hostinger MySQL server is running. (${err?.message || err})`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if (res.status === 404 || contentType.includes('text/html')) {
    throw new Error(
      `API endpoint ${endpoint} not found (404). Please ensure backend routing to Hostinger MySQL is configured.`
    );
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
  async checkAuth(): Promise<{ authenticated: boolean; company?: CompanySettings }> {
    const token = getStoredToken();
    if (!token) return { authenticated: false };
    try {
      const company = await this.getCompanySettings();
      return { authenticated: true, company };
    } catch {
      return { authenticated: false };
    }
  },

  async getAuthStatus(): Promise<{
    isPasswordSet: boolean;
    company_name: string;
    logo_url?: string;
    company_logo?: string;
    tagline?: string;
  }> {
    return await apiFetch('/api/auth/status');
  },

  async setupInitialPassword(password: string): Promise<{ success: boolean; token: string; company: CompanySettings }> {
    const res = await apiFetch<{ success: boolean; token: string; company: CompanySettings }>('/api/auth/setup-password', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async login(password: string): Promise<{ success: boolean; token: string; company: CompanySettings }> {
    const res = await apiFetch<{ success: boolean; token: string; company: CompanySettings }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    return res;
  },

  async logout(): Promise<{ success: boolean }> {
    clearStoredToken();
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    return { success: true };
  },

  // --- Company Settings ---
  async getCompanySettings(): Promise<CompanySettings> {
    return await apiFetch('/api/company');
  },

  async getCompany(): Promise<CompanySettings> {
    return this.getCompanySettings();
  },

  async updateCompany(updates: Partial<CompanySettings>): Promise<CompanySettings> {
    return await apiFetch('/api/company', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return await apiFetch('/api/company/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // --- Dashboard ---
  async getDashboard(): Promise<{
    stats: DashboardStats;
    followUpsRequiringAttention: FollowUp[];
    upcomingTasks: Task[];
    overdueItems: any[];
    teamWorkload: any[];
  }> {
    const res = await apiFetch<any>('/api/dashboard');
    if (res && res.stats) {
      return res;
    }
    return {
      stats: res || ({} as any),
      followUpsRequiringAttention: [],
      upcomingTasks: [],
      overdueItems: [],
      teamWorkload: [],
    };
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const data = await this.getDashboard();
    return data.stats;
  },

  // --- Projects ---
  async getProjects(filters: {
    status?: string;
    priority?: string;
    leadId?: string;
    clientId?: string;
    search?: string;
  } = {}): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.priority && filters.priority !== 'all') params.set('priority', filters.priority);
    if (filters.leadId && filters.leadId !== 'all') params.set('leadId', filters.leadId);
    if (filters.clientId && filters.clientId !== 'all') params.set('clientId', filters.clientId);
    if (filters.search) params.set('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiFetch(`/api/projects${query}`);
  },

  async getArchivedProjects(): Promise<Project[]> {
    return await apiFetch('/api/projects/archived');
  },

  async getProject(id: string): Promise<Project> {
    return await apiFetch(`/api/projects/${id}`);
  },

  async createProject(data: Partial<Project>): Promise<Project> {
    return await apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    return await apiFetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return await apiFetch(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },

  async archiveProject(id: string): Promise<Project> {
    return await apiFetch(`/api/projects/${id}/archive`, {
      method: 'PUT',
    });
  },

  async unarchiveProject(id: string): Promise<Project> {
    return await apiFetch(`/api/projects/${id}/unarchive`, {
      method: 'PUT',
    });
  },

  async restoreProject(id: string): Promise<Project> {
    return this.unarchiveProject(id);
  },

  // --- Clients ---
  async getClients(): Promise<Client[]> {
    return await apiFetch('/api/clients');
  },

  async getClient(id: string): Promise<Client> {
    return await apiFetch(`/api/clients/${id}`);
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    return await apiFetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return await apiFetch(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClient(id: string): Promise<{ success: boolean }> {
    return await apiFetch(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Team Members ---
  async getTeam(): Promise<TeamMember[]> {
    return await apiFetch('/api/team');
  },

  async createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
    return await apiFetch('/api/team', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
    return await apiFetch(`/api/team/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTeamMember(id: string, reassignTo?: string): Promise<{ success: boolean }> {
    return await apiFetch(`/api/team/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reassignTo }),
    });
  },

  // --- Tasks ---
  async createTask(data: Partial<Task>): Promise<Task> {
    return await apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return await apiFetch(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    return await apiFetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Follow-ups ---
  async createFollowUp(data: Partial<FollowUp>): Promise<FollowUp> {
    return await apiFetch('/api/followups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    return await apiFetch(`/api/followups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteFollowUp(id: string): Promise<{ success: boolean }> {
    return await apiFetch(`/api/followups/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Activities / Updates ---
  async createActivity(data: Partial<Activity>): Promise<Activity> {
    return await apiFetch('/api/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // --- Backup & Restore ---
  async exportDatabase(): Promise<any> {
    return await apiFetch('/api/backup');
  },

  async importDatabase(data: any): Promise<{ success: boolean; message: string }> {
    return await apiFetch('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    return await apiFetch('/api/backup/reset', {
      method: 'POST',
    });
  },

  async restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    return this.importDatabase(data);
  },

  async getDbStatus(): Promise<{
    engine: 'mysql' | 'file';
    connected: boolean;
    database: string;
    user: string;
    host: string;
    port: number;
    error: string | null;
    whitelistHint?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/api/db/status`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return {
      engine: 'mysql',
      connected: false,
      database: 'u345742528_manage_falcon',
      user: 'u345742528_shuzaul',
      host: 'localhost',
      port: 3306,
      error: 'Cannot reach backend server',
      whitelistHint: '82.180.143.163',
    };
  },
};
