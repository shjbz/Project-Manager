import type {
  CompanySettings,
  TeamMember,
  Client,
  Project,
  Task,
  FollowUp,
  Activity,
  DashboardStats,
  HealthStatus,
} from './types';
import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_TEAM_MEMBERS,
  INITIAL_CLIENTS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_FOLLOW_UPS,
  INITIAL_ACTIVITIES,
} from './initialData';

const DB_KEY = 'falcon_workspace_v1';
const SESSION_KEY = 'falcon_session_token';

interface LocalDatabaseSchema {
  settings: CompanySettings & {
    password_hash?: string;
    salt?: string;
    is_password_set?: boolean;
  };
  team_members: TeamMember[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  follow_ups: FollowUp[];
  activities: Activity[];
}

// In-browser SHA-256 password hash using Web Crypto API
async function sha256(str: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Simple fallback
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return String(Math.abs(hash));
}

export class LocalDbService {
  private getDb(): LocalDatabaseSchema {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to parse local database:', e);
    }

    // Default initialization
    const initialDb: LocalDatabaseSchema = {
      settings: { ...INITIAL_COMPANY_SETTINGS },
      team_members: [...INITIAL_TEAM_MEMBERS],
      clients: [...INITIAL_CLIENTS],
      projects: [...INITIAL_PROJECTS],
      tasks: [...INITIAL_TASKS],
      follow_ups: [...INITIAL_FOLLOW_UPS],
      activities: [...INITIAL_ACTIVITIES],
    };
    this.saveDb(initialDb);
    return initialDb;
  }

  private saveDb(db: LocalDatabaseSchema) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to persist local database to localStorage:', e);
    }
  }

  // --- Auth ---
  async getAuthStatus(): Promise<{
    isPasswordSet: boolean;
    company_name: string;
    company_logo?: string;
    tagline?: string;
  }> {
    const db = this.getDb();
    return {
      isPasswordSet: Boolean(db.settings.is_password_set && db.settings.password_hash),
      company_name: db.settings.company_name || 'Falcon Engineering & Construction',
      company_logo: db.settings.company_logo,
      tagline: db.settings.tagline,
    };
  }

  async setupInitialPassword(password: string): Promise<{ success: boolean; token: string; company: CompanySettings }> {
    const db = this.getDb();
    const hash = await sha256(password);
    db.settings.password_hash = hash;
    db.settings.is_password_set = true;
    db.settings.updated_at = new Date().toISOString();
    this.saveDb(db);

    const token = 'local_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, token);

    return {
      success: true,
      token,
      company: db.settings,
    };
  }

  async login(password: string): Promise<{ success: boolean; token: string; company: CompanySettings }> {
    const db = this.getDb();
    if (!db.settings.password_hash) {
      throw new Error('Workspace password has not been initialized yet.');
    }
    const hash = await sha256(password);
    if (hash !== db.settings.password_hash) {
      throw new Error('Invalid workspace password.');
    }

    const token = 'local_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, token);

    return {
      success: true,
      token,
      company: db.settings,
    };
  }

  async checkSession(): Promise<{ authenticated: boolean; isPasswordSet?: boolean; company?: CompanySettings }> {
    const db = this.getDb();
    const token = localStorage.getItem(SESSION_KEY);
    const isPasswordSet = Boolean(db.settings.is_password_set && db.settings.password_hash);

    if (!token) {
      return { authenticated: false, isPasswordSet, company: db.settings };
    }

    return {
      authenticated: true,
      isPasswordSet,
      company: db.settings,
    };
  }

  async logout(): Promise<{ success: boolean }> {
    localStorage.removeItem(SESSION_KEY);
    return { success: true };
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const db = this.getDb();
    const currentHash = await sha256(currentPassword);
    if (currentHash !== db.settings.password_hash) {
      throw new Error('Current password does not match.');
    }
    db.settings.password_hash = await sha256(newPassword);
    db.settings.updated_at = new Date().toISOString();
    this.saveDb(db);
    return { success: true, message: 'Password updated successfully' };
  }

  // --- Company Settings ---
  async getCompany(): Promise<CompanySettings> {
    const db = this.getDb();
    const { password_hash, salt, ...safe } = db.settings;
    return safe;
  }

  async updateCompany(updates: Partial<CompanySettings>): Promise<CompanySettings> {
    const db = this.getDb();
    db.settings = {
      ...db.settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.saveDb(db);
    const { password_hash, salt, ...safe } = db.settings;
    return safe;
  }

  // --- Projects ---
  async getProjects(): Promise<Project[]> {
    const db = this.getDb();
    const today = new Date().toISOString().split('T')[0];

    return db.projects.map((p) => this.hydrateProject(p, db, today));
  }

  async getProjectById(id: string): Promise<Project | null> {
    const db = this.getDb();
    const p = db.projects.find((proj) => proj.id === id);
    if (!p) return null;
    const today = new Date().toISOString().split('T')[0];
    return this.hydrateProject(p, db, today);
  }

  private hydrateProject(p: Project, db: LocalDatabaseSchema, today: string): Project {
    const lead = db.team_members.find((tm) => tm.id === p.project_lead_id);
    const client = db.clients.find((c) => c.id === p.client_id);
    const members = db.team_members.filter((tm) => p.team_member_ids?.includes(tm.id));
    const tasks = db.tasks
      .filter((t) => t.project_id === p.id)
      .map((t) => ({
        ...t,
        assigned_member: db.team_members.find((tm) => tm.id === t.assigned_to),
      }));
    const followUps = db.follow_ups
      .filter((fu) => fu.project_id === p.id)
      .map((fu) => ({
        ...fu,
        creator_member: db.team_members.find((tm) => tm.id === fu.created_by),
        client_name: client?.name,
      }));
    const activities = db.activities
      .filter((a) => a.project_id === p.id)
      .map((a) => ({
        ...a,
        team_member: db.team_members.find((tm) => tm.id === a.team_member_id),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Compute health
    let health: HealthStatus = 'on_track';
    if (p.status === 'completed') {
      health = 'completed';
    } else if (p.expected_completion_date && p.expected_completion_date < today) {
      health = 'overdue';
    } else if (p.status === 'at_risk') {
      health = 'at_risk';
    } else if (
      p.status === 'follow_up_pending' ||
      followUps.some((f) => f.status === 'pending' && f.follow_up_date <= today)
    ) {
      health = 'follow_up_needed';
    }

    return {
      ...p,
      client,
      project_lead: lead,
      team_members: members,
      tasks,
      follow_ups: followUps,
      activities,
      health_status: health,
    };
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const db = this.getDb();
    const id = 'proj-' + Date.now();
    const newProj: Project = {
      id,
      project_name: data.project_name || 'Untitled Project',
      project_type: data.project_type || 'Architecture',
      location: data.location || '',
      description: data.description || '',
      client_id: data.client_id || '',
      project_lead_id: data.project_lead_id || '',
      team_member_ids: data.team_member_ids || [],
      priority: data.priority || 'standard',
      status: data.status || 'active',
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      expected_completion_date: data.expected_completion_date || '',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.projects.unshift(newProj);

    // Create activity
    db.activities.unshift({
      id: 'act-' + Date.now(),
      project_id: id,
      team_member_id: newProj.project_lead_id,
      activity_type: 'General Update',
      description: `Project "${newProj.project_name}" was created.`,
      activity_date: newProj.start_date,
      created_at: new Date().toISOString(),
    });

    this.saveDb(db);
    return this.hydrateProject(newProj, db, new Date().toISOString().split('T')[0]);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const db = this.getDb();
    const index = db.projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Project not found');

    const prev = db.projects[index];
    const updated = {
      ...prev,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    db.projects[index] = updated;

    // Log status / priority changes
    if (updates.status && updates.status !== prev.status) {
      db.activities.unshift({
        id: 'act-' + Date.now(),
        project_id: id,
        team_member_id: updated.project_lead_id,
        activity_type: 'Status Changed',
        description: `Project status changed from ${prev.status} to ${updates.status}.`,
        activity_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      });
    }

    this.saveDb(db);
    return this.hydrateProject(updated, db, new Date().toISOString().split('T')[0]);
  }

  async deleteProject(id: string): Promise<{ success: boolean }> {
    const db = this.getDb();
    db.projects = db.projects.filter((p) => p.id !== id);
    db.tasks = db.tasks.filter((t) => t.project_id !== id);
    db.follow_ups = db.follow_ups.filter((f) => f.project_id !== id);
    db.activities = db.activities.filter((a) => a.project_id !== id);
    this.saveDb(db);
    return { success: true };
  }

  async archiveProject(id: string): Promise<Project> {
    return this.updateProject(id, { is_archived: true, status: 'completed' });
  }

  async restoreProject(id: string): Promise<Project> {
    return this.updateProject(id, { is_archived: false, status: 'active' });
  }

  // --- Clients ---
  async getClients(): Promise<Client[]> {
    const db = this.getDb();
    return db.clients.map((c) => {
      const clientProjects = db.projects.filter((p) => p.client_id === c.id);
      return {
        ...c,
        projectCount: clientProjects.length,
        projects: clientProjects.map((p) => ({
          id: p.id,
          project_name: p.project_name,
          project_type: p.project_type,
          status: p.status,
          priority: p.priority,
        })),
      };
    });
  }

  async createClient(data: Partial<Client>): Promise<Client> {
    const db = this.getDb();
    const id = 'cl-' + Date.now();
    const client: Client = {
      id,
      name: data.name || 'New Client',
      company: data.company || '',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      notes: data.notes || '',
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.clients.unshift(client);
    this.saveDb(db);
    return client;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const db = this.getDb();
    const index = db.clients.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Client not found');
    const updated = {
      ...db.clients[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    db.clients[index] = updated;
    this.saveDb(db);
    return updated;
  }

  async deleteClient(id: string): Promise<{ success: boolean }> {
    const db = this.getDb();
    db.clients = db.clients.filter((c) => c.id !== id);
    // Disassociate projects
    db.projects.forEach((p) => {
      if (p.client_id === id) {
        p.client_id = '';
      }
    });
    this.saveDb(db);
    return { success: true };
  }

  // --- Team Members ---
  async getTeam(): Promise<TeamMember[]> {
    const db = this.getDb();
    return db.team_members.map((m) => {
      const leadProjects = db.projects.filter((p) => p.project_lead_id === m.id && !p.is_archived);
      return {
        ...m,
        totalProjectsCount: leadProjects.length,
        activeProjectsCount: leadProjects.filter((p) => p.status === 'active').length,
        urgentProjectsCount: leadProjects.filter((p) => p.priority === 'urgent').length,
        followUpPendingCount: leadProjects.filter((p) => p.status === 'follow_up_pending').length,
      };
    });
  }

  async createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
    const db = this.getDb();
    const id = 'tm-' + Date.now();
    const member: TeamMember = {
      id,
      name: data.name || 'Staff Member',
      designation: data.designation || 'Specialist',
      email: data.email || '',
      phone: data.phone || '',
      avatar: data.avatar || '',
      notes: data.notes || '',
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.team_members.push(member);
    this.saveDb(db);
    return member;
  }

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const db = this.getDb();
    const index = db.team_members.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('Team member not found');
    const updated = {
      ...db.team_members[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    db.team_members[index] = updated;
    this.saveDb(db);
    return updated;
  }

  async deleteTeamMember(id: string, reassignToId?: string): Promise<{ success: boolean }> {
    const db = this.getDb();
    db.team_members = db.team_members.filter((m) => m.id !== id);

    // Reassign projects if provided
    db.projects.forEach((p) => {
      if (p.project_lead_id === id) {
        p.project_lead_id = reassignToId || '';
      }
      if (p.team_member_ids?.includes(id)) {
        p.team_member_ids = p.team_member_ids.filter((mId) => mId !== id);
        if (reassignToId && !p.team_member_ids.includes(reassignToId)) {
          p.team_member_ids.push(reassignToId);
        }
      }
    });

    this.saveDb(db);
    return { success: true };
  }

  // --- Tasks ---
  async createTask(data: Partial<Task>): Promise<Task> {
    const db = this.getDb();
    const id = 'tsk-' + Date.now();
    const task: Task = {
      id,
      project_id: data.project_id || '',
      title: data.title || 'Untitled Task',
      description: data.description || '',
      assigned_to: data.assigned_to || '',
      priority: data.priority || 'standard',
      due_date: data.due_date || new Date().toISOString().split('T')[0],
      status: data.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.tasks.unshift(task);

    // Create activity
    db.activities.unshift({
      id: 'act-' + Date.now(),
      project_id: task.project_id,
      team_member_id: task.assigned_to,
      activity_type: 'General Update',
      description: `Task "${task.title}" was added.`,
      activity_date: task.due_date,
      created_at: new Date().toISOString(),
    });

    this.saveDb(db);
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const db = this.getDb();
    const index = db.tasks.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Task not found');
    const prev = db.tasks[index];
    const updated = {
      ...prev,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    db.tasks[index] = updated;

    if (updates.status && updates.status !== prev.status) {
      db.activities.unshift({
        id: 'act-' + Date.now(),
        project_id: updated.project_id,
        team_member_id: updated.assigned_to,
        activity_type: 'General Update',
        description: `Task "${updated.title}" marked as ${updates.status}.`,
        activity_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
      });
    }

    this.saveDb(db);
    return updated;
  }

  async deleteTask(id: string): Promise<{ success: boolean }> {
    const db = this.getDb();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    this.saveDb(db);
    return { success: true };
  }

  // --- Follow-ups ---
  async createFollowUp(data: Partial<FollowUp>): Promise<FollowUp> {
    const db = this.getDb();
    const id = 'fu-' + Date.now();
    const fu: FollowUp = {
      id,
      project_id: data.project_id || '',
      follow_up_date: data.follow_up_date || new Date().toISOString().split('T')[0],
      method: data.method || 'Phone',
      notes: data.notes || '',
      created_by: data.created_by || '',
      status: data.status || 'pending',
      created_at: new Date().toISOString(),
    };
    db.follow_ups.unshift(fu);

    db.activities.unshift({
      id: 'act-' + Date.now(),
      project_id: fu.project_id,
      team_member_id: fu.created_by,
      activity_type: 'Client Communication',
      description: `Follow-up scheduled (${fu.method}): ${fu.notes}`,
      activity_date: fu.follow_up_date,
      created_at: new Date().toISOString(),
    });

    this.saveDb(db);
    return fu;
  }

  async updateFollowUp(id: string, updates: Partial<FollowUp>): Promise<FollowUp> {
    const db = this.getDb();
    const index = db.follow_ups.findIndex((f) => f.id === id);
    if (index === -1) throw new Error('Follow-up not found');
    const updated = {
      ...db.follow_ups[index],
      ...updates,
    };
    db.follow_ups[index] = updated;
    this.saveDb(db);
    return updated;
  }

  async deleteFollowUp(id: string): Promise<{ success: boolean }> {
    const db = this.getDb();
    db.follow_ups = db.follow_ups.filter((f) => f.id !== id);
    this.saveDb(db);
    return { success: true };
  }

  // --- Activities ---
  async createActivity(data: Partial<Activity>): Promise<Activity> {
    const db = this.getDb();
    const id = 'act-' + Date.now();
    const act: Activity = {
      id,
      project_id: data.project_id || '',
      team_member_id: data.team_member_id || '',
      activity_type: data.activity_type || 'General Update',
      description: data.description || '',
      activity_date: data.activity_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    db.activities.unshift(act);
    this.saveDb(db);
    return act;
  }

  // --- Dashboard ---
  async getDashboard(): Promise<{
    stats: DashboardStats;
    followUpsRequiringAttention: any[];
    upcomingTasks: any[];
    overdueItems: any[];
    teamWorkload: any[];
  }> {
    const db = this.getDb();
    const today = new Date().toISOString().split('T')[0];
    const activeProjects = db.projects.filter((p) => !p.is_archived && p.status !== 'completed');

    const overdueCount = activeProjects.filter(
      (p) => p.expected_completion_date && p.expected_completion_date < today
    ).length;

    const followUpPendingCount = db.follow_ups.filter(
      (f) => f.status === 'pending' && f.follow_up_date <= today
    ).length;

    const stats: DashboardStats = {
      activeProjects: activeProjects.length,
      followUpPending: followUpPendingCount,
      dueSoon: activeProjects.filter((p) => {
        if (!p.expected_completion_date) return false;
        const diff = (new Date(p.expected_completion_date).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24);
        return diff >= 0 && diff <= 14;
      }).length,
      overdue: overdueCount,
      urgentProjects: activeProjects.filter((p) => p.priority === 'urgent').length,
      completedThisMonth: db.projects.filter((p) => p.status === 'completed').length,
      totalProjects: db.projects.length,
      statusBreakdown: {
        onTrack: activeProjects.filter((p) => p.status === 'active').length,
        followUpNeeded: followUpPendingCount,
        atRisk: activeProjects.filter((p) => p.status === 'at_risk').length,
        overdue: overdueCount,
        completed: db.projects.filter((p) => p.status === 'completed').length,
      },
    };

    const followUpsRequiringAttention = db.follow_ups
      .filter((fu) => fu.status === 'pending')
      .map((fu) => {
        const proj = db.projects.find((p) => p.id === fu.project_id);
        const client = proj ? db.clients.find((c) => c.id === proj.client_id) : null;
        return {
          ...fu,
          project_name: proj?.project_name || 'Project',
          client_name: client?.name || 'Client',
          priority: proj?.priority || 'standard',
        };
      })
      .slice(0, 8);

    const upcomingTasks = db.tasks
      .filter((t) => t.status !== 'completed')
      .map((t) => {
        const proj = db.projects.find((p) => p.id === t.project_id);
        const member = db.team_members.find((m) => m.id === t.assigned_to);
        return {
          ...t,
          project_name: proj?.project_name || 'Project',
          assigned_member: member,
        };
      })
      .slice(0, 8);

    const overdueItems = db.projects
      .filter((p) => !p.is_archived && p.status !== 'completed' && p.expected_completion_date && p.expected_completion_date < today)
      .map((p) => ({
        id: p.id,
        title: p.project_name,
        due_date: p.expected_completion_date,
        type: 'project',
      }));

    const teamWorkload = db.team_members.map((m) => {
      const count = activeProjects.filter((p) => p.project_lead_id === m.id || p.team_member_ids?.includes(m.id)).length;
      return {
        id: m.id,
        name: m.name,
        designation: m.designation,
        activeProjectsCount: count,
      };
    });

    return {
      stats,
      followUpsRequiringAttention,
      upcomingTasks,
      overdueItems,
      teamWorkload,
    };
  }

  // --- Backup & Restore ---
  async exportBackup(): Promise<any> {
    return this.getDb();
  }

  async importBackup(data: any): Promise<{ success: boolean; message: string }> {
    if (!data || !data.settings || !Array.isArray(data.projects)) {
      throw new Error('Invalid backup file format');
    }
    this.saveDb(data);
    return { success: true, message: 'Workspace restored successfully' };
  }

  async resetDatabase(): Promise<{ success: boolean; message: string }> {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(SESSION_KEY);
    this.getDb(); // Re-initialize
    return { success: true, message: 'Workspace database reset to default state' };
  }
}

export const localDb = new LocalDbService();
