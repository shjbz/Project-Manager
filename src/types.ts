export type Priority = 'urgent' | 'standard' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type ProjectStatus =
  | 'active'
  | 'follow_up_pending'
  | 'at_risk'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

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
