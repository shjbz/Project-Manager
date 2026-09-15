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

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

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
  // Auth
  async login(password: string): Promise<{ success: boolean; token: string; company: CompanySettings }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    if (data.token) {
      setStoredToken(data.token);
    }
    return data;
  },

  async checkSession(): Promise<{ authenticated: boolean; company: CompanySettings }> {
    return apiFetch('/api/auth/session');
  },

  async checkAuth(): Promise<{ authenticated: boolean; company?: CompanySettings }> {
    try {
      const res = await this.checkSession();
      return { authenticated: res.authenticated, company: res.company };
    } catch {
      return { authenticated: false };
    }
  },

  async logout(): Promise<{ success: boolean }> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      clearStoredToken();
    }
    return { success: true };
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return apiFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Company Settings
  async getPublicCompany(): Promise<{ company_name: string; logo_url?: string; company_logo?: string; tagline?: string }> {
    try {
      const res = await fetch('/api/company/public');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return { company_name: 'Studio Archvibe & Associates' };
  },

  async getCompany(): Promise<CompanySettings> {
    return apiFetch('/api/company');
  },

  async updateCompany(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    return apiFetch('/api/company', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  // Dashboard
  async getDashboard(): Promise<{
    stats: DashboardStats;
    followUpsRequiringAttention: (FollowUp & {
      project_name: string;
      client_name: string;
      is_overdue: boolean;
      is_today: boolean;
    })[];
    upcomingTasks: (Task & { project_name: string })[];
    overdueItems: Array<{
      id: string;
      type: 'task' | 'follow_up';
      project_id: string;
      project_name: string;
      title: string;
      due_date: string;
      assigned_member?: TeamMember;
    }>;
    teamWorkload: Array<{
      id: string;
      name: string;
      designation: string;
      totalProjects: number;
      activeProjects: number;
      urgentProjects: number;
      followUpPending: number;
      overdueProjects: number;
    }>;
  }> {
    return apiFetch('/api/dashboard');
  },

  // Projects
  async getProjects(params: {
    search?: string;
    priority?: string;
    status?: string;
    leadId?: string;
    clientId?: string;
    projectType?: string;
    dueDate?: string;
    sortBy?: string;
  } = {}): Promise<Project[]> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val) query.set(key, val);
    });
    return apiFetch(`/api/projects?${query.toString()}`);
  },

  async getProject(id: string): Promise<Project> {
    return apiFetch(`/api/projects/${id}`);
  },

  async createProject(data: any): Promise<Project> {
    return apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProject(id: string, data: any): Promise<Project> {
    return apiFetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },

  // Clients
  async getClients(): Promise<Client[]> {
    return apiFetch('/api/clients');
  },

  async createClient(data: Partial<Client>): Promise<Client> {
    return apiFetch('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    return apiFetch(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteClient(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  },

  // Team
  async getTeam(): Promise<TeamMember[]> {
    return apiFetch('/api/team');
  },

  async createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
    return apiFetch('/api/team', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
    return apiFetch(`/api/team/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTeamMember(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/team/${id}`, {
      method: 'DELETE',
    });
  },

  // Tasks
  async createTask(data: Partial<Task>): Promise<Task> {
    return apiFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return apiFetch(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  // Follow-ups
  async createFollowUp(data: Partial<FollowUp>): Promise<FollowUp> {
    return apiFetch('/api/followups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateFollowUp(id: string, data: Partial<FollowUp>): Promise<FollowUp> {
    return apiFetch(`/api/followups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteFollowUp(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/api/followups/${id}`, {
      method: 'DELETE',
    });
  },

  // Activity / Updates
  async createActivity(data: Partial<Activity>): Promise<Activity> {
    return apiFetch('/api/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Backup
  async getBackupUrl(): Promise<string> {
    return '/api/backup';
  },

  async exportDatabase(): Promise<any> {
    return apiFetch('/api/backup');
  },

  async importDatabase(data: any): Promise<{ success: boolean; message: string }> {
    return apiFetch('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    return apiFetch('/api/backup/reset', {
      method: 'POST',
    });
  },

  async restoreBackup(data: any): Promise<{ success: boolean; message: string }> {
    return this.importDatabase(data);
  },
};
