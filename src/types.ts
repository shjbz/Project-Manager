export type Priority = 'urgent' | 'high' | 'standard' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

// Project Status is strictly manually selected by the user
export type ProjectStatus =
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

/**
 * Normalizes any project status to the 4 strictly manual options.
 */
export function normalizeProjectStatus(rawStatus?: string): ProjectStatus {
  if (rawStatus === 'on_hold') return 'on_hold';
  if (rawStatus === 'completed') return 'completed';
  if (rawStatus === 'cancelled') return 'cancelled';
  return 'active';
}

// Automated Operational / Progress Situation (separated from Project Status)
export type AutomatedStatus = 'on_track' | 'in_progress' | 'need_attention';

export interface AutomatedStatusResult {
  status: AutomatedStatus;
  label: 'On track' | 'Work in Progress' | 'Need attention';
  sublabel: 'Everything Done' | 'Tasks/Follow-up Pending' | 'Overdue Task/Followup';
  badgeText: string;
  color: 'green' | 'orange' | 'red';
  isOverdue: boolean;
  overdueTasksCount: number;
  overdueFollowUpsCount: number;
  pendingTasksCount: number;
  pendingFollowUpsCount: number;
  reasons: string[];
}

/**
 * Automatically computes project situation/health based on the operational state:
 * - On track (Everything Done): No overdue tasks/follow-ups AND all tasks/follow-ups completed (or none pending).
 * - Work in Progress (Tasks/Follow-up Pending): Has pending tasks or follow-ups, none overdue.
 * - Need attention (Overdue Task/Followup): Has overdue tasks or overdue follow-ups, or past completion target.
 */
export function getAutomatedProjectStatus(project: {
  status?: string;
  expected_completion_date?: string;
  is_overdue?: boolean;
  tasks?: Array<{ status: string; due_date?: string; title?: string }>;
  follow_ups?: Array<{ status?: string; follow_up_date?: string; notes?: string }>;
  next_task?: { status?: string; due_date?: string; title?: string } | null;
  next_follow_up?: { status?: string; follow_up_date?: string; notes?: string } | null;
}): AutomatedStatusResult {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tasks = project.tasks || [];
  const followUps = project.follow_ups || [];

  // 1. Overdue checks
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'completed' && t.due_date && t.due_date < todayStr
  );
  if (
    project.next_task &&
    project.next_task.status !== 'completed' &&
    project.next_task.due_date &&
    project.next_task.due_date < todayStr &&
    !overdueTasks.some((t) => t.title === project.next_task?.title)
  ) {
    overdueTasks.push(project.next_task as any);
  }

  const overdueFollowUps = followUps.filter(
    (f) => f.status !== 'completed' && f.follow_up_date && f.follow_up_date < todayStr
  );
  if (
    project.next_follow_up &&
    project.next_follow_up.status !== 'completed' &&
    project.next_follow_up.follow_up_date &&
    project.next_follow_up.follow_up_date < todayStr &&
    !overdueFollowUps.some((f) => f.follow_up_date === project.next_follow_up?.follow_up_date)
  ) {
    overdueFollowUps.push(project.next_follow_up as any);
  }

  const isProjectPastDate = Boolean(
    project.expected_completion_date &&
    project.expected_completion_date < todayStr &&
    project.status !== 'completed' &&
    project.status !== 'cancelled'
  );

  const hasOverdue =
    overdueTasks.length > 0 ||
    overdueFollowUps.length > 0 ||
    isProjectPastDate ||
    Boolean(project.is_overdue);

  // 2. Pending checks (not overdue)
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  if (
    project.next_task &&
    project.next_task.status !== 'completed' &&
    !pendingTasks.some((t) => t.title === project.next_task?.title)
  ) {
    pendingTasks.push(project.next_task as any);
  }

  const pendingFollowUps = followUps.filter((f) => f.status !== 'completed');
  if (
    project.next_follow_up &&
    project.next_follow_up.status !== 'completed' &&
    !pendingFollowUps.some((f) => f.follow_up_date === project.next_follow_up?.follow_up_date)
  ) {
    pendingFollowUps.push(project.next_follow_up as any);
  }

  // Need attention: Overdue items
  if (hasOverdue) {
    const reasons: string[] = [];
    if (overdueTasks.length > 0) {
      reasons.push(`${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} overdue`);
    }
    if (overdueFollowUps.length > 0) {
      reasons.push(`${overdueFollowUps.length} follow-up${overdueFollowUps.length > 1 ? 's' : ''} overdue`);
    }
    if (isProjectPastDate) {
      reasons.push('Project deadline exceeded');
    }
    return {
      status: 'need_attention',
      label: 'Need attention',
      sublabel: 'Overdue Task/Followup',
      badgeText: 'Need attention (Overdue Task/Followup)',
      color: 'red',
      isOverdue: true,
      overdueTasksCount: overdueTasks.length,
      overdueFollowUpsCount: overdueFollowUps.length,
      pendingTasksCount: pendingTasks.length,
      pendingFollowUpsCount: pendingFollowUps.length,
      reasons: reasons.length > 0 ? reasons : ['Overdue task or follow-up requires action'],
    };
  }

  // Work in Progress: Tasks or follow-up pending, none overdue
  if (pendingTasks.length > 0 || pendingFollowUps.length > 0) {
    const activeReasons: string[] = [];
    if (pendingTasks.length > 0) {
      activeReasons.push(`${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} pending`);
    }
    if (pendingFollowUps.length > 0) {
      activeReasons.push(`${pendingFollowUps.length} follow-up${pendingFollowUps.length > 1 ? 's' : ''} scheduled`);
    }
    return {
      status: 'in_progress',
      label: 'Work in Progress',
      sublabel: 'Tasks/Follow-up Pending',
      badgeText: 'Work in Progress (Tasks/Follow-up Pending)',
      color: 'orange',
      isOverdue: false,
      overdueTasksCount: 0,
      overdueFollowUpsCount: 0,
      pendingTasksCount: pendingTasks.length,
      pendingFollowUpsCount: pendingFollowUps.length,
      reasons: activeReasons,
    };
  }

  // On track: Everything Done
  return {
    status: 'on_track',
    label: 'On track',
    sublabel: 'Everything Done',
    badgeText: 'On track (Everything Done)',
    color: 'green',
    isOverdue: false,
    overdueTasksCount: 0,
    overdueFollowUpsCount: 0,
    pendingTasksCount: 0,
    pendingFollowUpsCount: 0,
    reasons: ['Everything is done', 'All tasks and follow-ups up to date'],
  };
}

/**
 * Project Status is strictly manually selected by the user.
 * Returns the normalized manual project status.
 */
export function getEffectiveProjectStatus(project: { status: string }): ProjectStatus {
  return normalizeProjectStatus(project.status);
}

export type HealthStatus = 'on_track' | 'follow_up_needed' | 'at_risk' | 'overdue' | 'completed';

export type ProjectType =
  | 'Architecture'
  | 'Interior'
  | 'Construction'
  | 'Development'
  | 'Renovation'
  | 'Commercial'
  | 'Residential'
  | 'Other';

export interface CompanySettings {
  id: string;
  company_name: string;
  company_logo?: string;
  logo_url?: string;
  tagline?: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  currency_symbol?: string;
  is_password_set?: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  avatar?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Computed stats when queried
  activeProjectsCount?: number;
  urgentProjectsCount?: number;
  followUpPendingCount?: number;
  overdueProjectsCount?: number;
  totalProjectsCount?: number;
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  // Computed stats
  projectCount?: number;
  projects?: Array<{
    id: string;
    project_name: string;
    project_type: string;
    status: ProjectStatus;
    priority: Priority;
  }>;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  assigned_to?: string; // TeamMember id
  priority: Priority;
  due_date: string; // YYYY-MM-DD
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  // Hydrated
  assigned_member?: TeamMember;
  project_name?: string;
}

export type FollowUpMethod =
  | 'Phone'
  | 'In-Person'
  | 'WhatsApp'
  | 'Email'
  | 'Meeting'
  | 'Site Visit'
  | 'Other';

export interface FollowUp {
  id: string;
  project_id: string;
  follow_up_date: string; // YYYY-MM-DD
  method: FollowUpMethod;
  notes: string;
  created_by?: string; // TeamMember id
  status?: 'pending' | 'completed';
  created_at: string;
  // Hydrated
  creator_member?: TeamMember;
  project_name?: string;
  client_name?: string;
}

export type ActivityType =
  | 'General Update'
  | 'Client Communication'
  | 'Meeting'
  | 'Site Visit'
  | 'Design'
  | 'Drawing'
  | 'BOQ'
  | 'Construction'
  | 'Payment'
  | 'Material'
  | 'Approval'
  | 'Status Changed'
  | 'Priority Changed'
  | 'Team Changed'
  | 'Other';

export interface Activity {
  id: string;
  project_id: string;
  team_member_id?: string; // person who performed the activity
  activity_type: ActivityType;
  description: string;
  activity_date: string; // YYYY-MM-DD
  created_at: string;
  // Hydrated
  team_member?: TeamMember;
}

export interface GanttSegment {
  id: string;
  name?: string; // e.g. "Phase 1", "Sprint 1", "Site Execution"
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  progress?: number; // 0 - 100
  notes?: string;
  bar_label?: string; // custom text to display inside the solid bar (leave empty for clean solid bar with no text)
}

export interface GanttTask {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string; // TeamMember id
  priority: Priority;
  status: TaskStatus;
  color?: string; // e.g. 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet'
  custom_bar_label?: string; // optional task-level custom bar label
  segments: GanttSegment[];
  created_at?: string;
  updated_at?: string;
  // Hydrated
  assigned_member?: TeamMember;
}

export interface GanttChart {
  id: string;
  project_id: string;
  project_name?: string;
  title: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  notes?: string;
  tasks: GanttTask[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  project_name: string;
  project_type: ProjectType | string;
  location: string;
  description?: string;
  client_id: string;
  project_lead_id: string;
  team_member_ids: string[];
  priority: Priority;
  status: ProjectStatus;
  start_date: string; // YYYY-MM-DD
  expected_completion_date?: string; // YYYY-MM-DD
  actual_completion_date?: string; // YYYY-MM-DD
  is_archived?: boolean;
  archived_at?: string;
  created_at: string;
  updated_at: string;

  // Hydrated references
  client?: Client;
  project_lead?: TeamMember;
  team_members?: TeamMember[];
  tasks?: Task[];
  follow_ups?: FollowUp[];
  activities?: Activity[];

  // Computed snapshot indicators
  last_follow_up?: FollowUp;
  next_follow_up?: FollowUp;
  next_task?: Task;
  health_status?: HealthStatus;
  is_overdue?: boolean;
}

export interface DashboardStats {
  activeProjects: number;
  followUpPending: number;
  dueSoon: number;
  overdue: number;
  urgentProjects: number;
  completedThisMonth: number;
  totalProjects: number;
  statusBreakdown: {
    onTrack: number;
    followUpNeeded: number;
    atRisk: number;
    overdue: number;
    completed: number;
  };
}
