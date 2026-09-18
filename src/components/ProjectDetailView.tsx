import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CalendarRange,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Building,
  Phone,
  Mail,
  MapPin,
  CalendarCheck,
  CheckSquare,
  History,
  Users,
  Archive,
} from 'lucide-react';
import type { Project, TeamMember, Task, FollowUp } from '../types';
import { PriorityBadge, StatusBadge } from './Badges';
import { ConfirmModal } from './modals/ConfirmModal';

interface ProjectDetailViewProps {
  project: Project;
  team: TeamMember[];
  onBack: () => void;
  onEditProject: () => void;
  onDeleteProject: () => void;
  onArchiveProject?: (projectId: string) => Promise<void>;
  onRestoreProject?: (projectId: string) => Promise<void>;
  onOpenAddTask: () => void;
  onOpenAddFollowUp: () => void;
  onOpenAddUpdate: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onEditFollowUp?: (fu: FollowUp) => void;
  onDeleteFollowUp?: (fuId: string) => Promise<void>;
  onUpdateTaskStatus: (taskId: string, newStatus: Task['status']) => Promise<void>;
  onUpdateFollowUpStatus: (fuId: string, newStatus: FollowUp['status']) => Promise<void>;
  onUpdateProjectQuick: (updates: Partial<Project>) => Promise<void>;
  hasGanttChart?: boolean;
  onViewGanttChart?: () => void;
  onCreateGanttChart?: () => void;
}

type DetailTab = 'overview' | 'tasks' | 'followups' | 'activities' | 'team';

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  team,
  onBack,
  onEditProject,
  onDeleteProject,
  onArchiveProject,
  onRestoreProject,
  onOpenAddTask,
  onOpenAddFollowUp,
  onOpenAddUpdate,
  onEditTask,
  onDeleteTask,
  onEditFollowUp,
  onDeleteFollowUp,
  onUpdateTaskStatus,
  onUpdateFollowUpStatus,
  onUpdateProjectQuick,
  hasGanttChart,
  onViewGanttChart,
  onCreateGanttChart,
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [updating, setUpdating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [followUpToDelete, setFollowUpToDelete] = useState<FollowUp | null>(null);

  const isOverdue = project.is_overdue;
  const otherMembers = (project.team_members || []).filter((m) => m.id !== project.project_lead_id);

  const handleStatusChange = async (newStatus: any) => {
    setUpdating(true);
    try {
      await onUpdateProjectQuick({ status: newStatus });
    } finally {
      setUpdating(false);
    }
  };

  const handlePriorityChange = async (newPriority: any) => {
    setUpdating(true);
    try {
      await onUpdateProjectQuick({ priority: newPriority });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div id="project-detail-view" className="space-y-6 pb-12">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <button
          id="back-to-projects-btn"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        {/* Quick Action Toolbar (Spec #30) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="detail-add-update-btn"
            onClick={onOpenAddUpdate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Add Update</span>
          </button>

          <button
            id="detail-add-followup-btn"
            onClick={onOpenAddFollowUp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Add Follow-up</span>
          </button>

          <button
            id="detail-add-task-btn"
            onClick={onOpenAddTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>

          {hasGanttChart ? (
            <button
              id="detail-view-gantt-btn"
              onClick={onViewGanttChart}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-bold rounded-lg transition cursor-pointer"
              title="View Gantt Chart for this project"
            >
              <CalendarRange className="w-3.5 h-3.5 text-amber-600" />
              <span>View Gantt Chart</span>
            </button>
          ) : (
            <button
              id="detail-create-gantt-btn"
              onClick={onCreateGanttChart}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg transition cursor-pointer"
              title="Create Gantt Chart for this project"
            >
              <CalendarRange className="w-3.5 h-3.5 text-zinc-500" />
              <span>Create Gantt Chart</span>
            </button>
          )}

          <button
            id="detail-archive-project-btn"
            onClick={() => setIsArchiveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-lg transition cursor-pointer"
            title={project.is_archived ? 'Restore Project' : 'Archive Project'}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{project.is_archived ? 'Restore' : 'Archive'}</span>
          </button>

          <button
            id="detail-edit-project-btn"
            onClick={onEditProject}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Project</span>
          </button>

          <button
            id="detail-delete-project-btn"
            onClick={() => setIsDeleteModalOpen(true)}
            title="Delete Project"
            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Title Header Card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PriorityBadge priority={project.priority} size="md" />
              <StatusBadge status={project.status} size="md" />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-rose-100 text-rose-800 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5" /> ATTENTION OVERDUE
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">
              {project.project_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 mt-1 font-medium">
              <span className="text-zinc-700">{project.project_type}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {project.location || 'Location unspecified'}
              </span>
            </div>
          </div>

          {/* Quick Status / Priority Dropdowns */}
          <div className="flex items-center gap-2 text-xs bg-zinc-50 p-2 rounded-lg border border-zinc-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 block px-1">Priority</span>
              <select
                id="quick-priority-select"
                value={project.priority}
                disabled={updating}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="text-xs bg-white border border-zinc-300 rounded px-2 py-1 font-medium text-zinc-800"
              >
                <option value="urgent">Urgent</option>
                <option value="standard">Standard</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="border-l border-zinc-200 pl-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block px-1">Status</span>
              <select
                id="quick-status-select"
                value={project.status}
                disabled={updating}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-xs bg-white border border-zinc-300 rounded px-2 py-1 font-medium text-zinc-800"
              >
                <option value="active">Active</option>
                <option value="follow_up_pending">Follow-up Pending</option>
                <option value="at_risk">At Risk</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3 Major Snapshot Action Panels (Spec #29) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-100">
          {/* Box 1: Client & Lead */}
          <div className="bg-zinc-50/60 rounded-lg p-3.5 border border-zinc-200/70">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Stakeholders
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-zinc-500">Client:</span>{' '}
                <span className="font-semibold text-zinc-900">
                  {project.client?.name || '—'}
                </span>
                {project.client?.company && (
                  <span className="text-zinc-500 block text-[11px] font-medium">
                    {project.client.company}
                  </span>
                )}
              </div>
              <div>
                <span className="text-zinc-500">Project Lead:</span>{' '}
                <span className="font-semibold text-zinc-900">
                  {project.project_lead?.name || '—'}
                </span>
                <span className="text-zinc-500 block text-[11px]">
                  {project.project_lead?.designation || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Current Action / Next Task */}
          <div className="bg-zinc-50/60 rounded-lg p-3.5 border border-zinc-200/70">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
              <span>Current Action</span>
              {project.next_task && (
                <span className="text-[10px] text-zinc-500 font-normal">
                  Due: {project.next_task.due_date}
                </span>
              )}
            </div>
            {project.next_task ? (
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-zinc-900 line-clamp-2">
                  {project.next_task.title}
                </div>
                <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                  <span>Assigned: {project.next_task.assigned_member?.name || 'Unassigned'}</span>
                  <button
                    onClick={() => onUpdateTaskStatus(project.next_task!.id, 'completed')}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic py-1">
                No active pending task.{' '}
                <button
                  onClick={onOpenAddTask}
                  className="text-zinc-900 font-semibold underline not-italic cursor-pointer"
                >
                  Add next task
                </button>
              </div>
            )}
          </div>

          {/* Box 3: Follow-up Management */}
          <div className="bg-zinc-50/60 rounded-lg p-3.5 border border-zinc-200/70">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center justify-between">
              <span>Follow-up Status</span>
              {project.next_follow_up && (
                <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Next: {project.next_follow_up.follow_up_date}
                </span>
              )}
            </div>
            <div className="space-y-1 text-xs">
              <div className="text-zinc-600">
                <span className="text-zinc-400">Last:</span>{' '}
                <span className="font-medium text-zinc-800">
                  {project.last_follow_up?.follow_up_date || 'No record'}
                </span>
                {project.last_follow_up?.method && (
                  <span className="text-[11px] text-zinc-500 ml-1">
                    via {project.last_follow_up.method}
                  </span>
                )}
              </div>
              {project.last_follow_up?.notes && (
                <p className="text-[11px] text-zinc-500 italic line-clamp-1">
                  &ldquo;{project.last_follow_up.notes}&rdquo;
                </p>
              )}
              <div className="pt-1">
                <button
                  onClick={onOpenAddFollowUp}
                  className="text-[11px] font-semibold text-zinc-900 hover:underline cursor-pointer"
                >
                  + Record Follow-up
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Spec #48: Overview, Tasks, Follow-ups, Activity, Team) */}
      <div className="border-b border-zinc-200 flex items-center gap-6 text-xs font-semibold">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'tasks', label: `Tasks (${project.tasks?.length || 0})` },
            { id: 'followups', label: `Follow-ups (${project.follow_ups?.length || 0})` },
            { id: 'activities', label: `Activity History (${project.activities?.length || 0})` },
            { id: 'team', label: `Project Team (${project.team_members?.length || 1})` },
          ] as Array<{ id: DetailTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            id={`project-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 border-b-2 transition cursor-pointer ${
              activeTab === tab.id
                ? 'border-zinc-900 text-zinc-950 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-xs">
                Project Scope & Details
              </h3>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                {project.description || 'No detailed scope description provided.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-100 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px] uppercase font-semibold">
                    Start Date
                  </span>
                  <span className="font-semibold text-zinc-900 mt-0.5 block">
                    {project.start_date || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px] uppercase font-semibold">
                    Target Completion
                  </span>
                  <span className="font-semibold text-zinc-900 mt-0.5 block">
                    {project.expected_completion_date || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px] uppercase font-semibold">
                    Actual Completion
                  </span>
                  <span className="font-semibold text-zinc-900 mt-0.5 block">
                    {project.actual_completion_date || 'In Progress'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick tasks preview */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                  Active Tasks ({project.tasks?.filter((t) => t.status !== 'completed').length || 0})
                </h3>
                <button
                  onClick={onOpenAddTask}
                  className="text-xs font-semibold text-zinc-900 hover:underline cursor-pointer"
                >
                  + Add Task
                </button>
              </div>

              {project.tasks && project.tasks.length > 0 ? (
                <div className="divide-y divide-zinc-100">
                  {project.tasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() =>
                            onUpdateTaskStatus(
                              task.id,
                              task.status === 'completed' ? 'pending' : 'completed'
                            )
                          }
                          className="rounded text-zinc-900 cursor-pointer"
                        />
                        <div>
                          <span
                            className={`font-medium ${
                              task.status === 'completed'
                                ? 'line-through text-zinc-400'
                                : 'text-zinc-900'
                            }`}
                          >
                            {task.title}
                          </span>
                          <span className="text-[11px] text-zinc-500 block">
                            Assigned: {task.assigned_member?.name || 'Lead'} · Due: {task.due_date}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={task.priority} size="sm" />
                        {onEditTask && (
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded transition cursor-pointer"
                            title="Edit Task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteTask && (
                          <button
                            type="button"
                            onClick={() => setTaskToDelete(task)}
                            className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 py-3">No tasks added yet.</div>
              )}
            </div>
          </div>

          {/* Client Details Card Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-zinc-500" />
                <span>Client Record</span>
              </h3>

              {project.client ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-base font-bold text-zinc-900 block">
                      {project.client.name}
                    </span>
                    {project.client.company && (
                      <span className="text-zinc-500 font-medium block text-xs">
                        {project.client.company}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-zinc-100">
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <a href={`tel:${project.client.phone}`} className="hover:text-zinc-950">
                        {project.client.phone}
                      </a>
                    </div>
                    {project.client.email && (
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <a href={`mailto:${project.client.email}`} className="hover:text-zinc-950">
                          {project.client.email}
                        </a>
                      </div>
                    )}
                    {project.client.address && (
                      <div className="flex items-start gap-2 text-zinc-600">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <span>{project.client.address}</span>
                      </div>
                    )}
                  </div>

                  {project.client.notes && (
                    <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 bg-zinc-50 p-2.5 rounded">
                      <span className="font-semibold text-zinc-700 block mb-0.5">Notes:</span>
                      {project.client.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-zinc-400">No client details assigned.</div>
              )}
            </div>

            {/* Project Lead Card */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-500" />
                <span>Project Lead</span>
              </h3>

              {project.project_lead ? (
                <div className="flex items-center gap-3 text-xs">
                  {project.project_lead.avatar ? (
                    <img
                      src={project.project_lead.avatar}
                      alt={project.project_lead.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-sm">
                      {project.project_lead.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-sm text-zinc-900">
                      {project.project_lead.name}
                    </div>
                    <div className="text-zinc-500">{project.project_lead.designation}</div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">
                      {project.project_lead.phone}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-400">No lead assigned.</div>
              )}
            </div>

            {/* Other Team Members Card (just below Project Lead) */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-500" />
                  <span>Other Team Members</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-semibold">
                  {otherMembers.length} {otherMembers.length === 1 ? 'member' : 'members'}
                </span>
              </h3>

              {otherMembers.length > 0 ? (
                <div className="space-y-2.5 pt-1 divide-y divide-zinc-100">
                  {otherMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 text-xs pt-2.5 first:pt-0">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-zinc-200 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-xs border border-zinc-200 shrink-0">
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-zinc-900 truncate">{member.name}</div>
                        <div className="text-[11px] text-zinc-500 truncate">{member.designation}</div>
                        {member.phone && (
                          <div className="text-[10px] text-zinc-400">{member.phone}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-zinc-400 py-1">No other team members assigned.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tasks */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Project Action Items & Tasks</h3>
              <p className="text-xs text-zinc-500">
                Track deliverables, drawings, BOQ submissions, and site checks.
              </p>
            </div>
            <button
              onClick={onOpenAddTask}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>

          <div className="divide-y divide-zinc-200 pt-2">
            {project.tasks && project.tasks.length > 0 ? (
              project.tasks.map((task) => (
                <div
                  key={task.id}
                  id={`project-task-item-${task.id}`}
                  className="py-3.5 flex items-start justify-between gap-4 hover:bg-zinc-50/70 px-2 rounded-lg transition"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() =>
                        onUpdateTaskStatus(
                          task.id,
                          task.status === 'completed' ? 'pending' : 'completed'
                        )
                      }
                      className="mt-1 rounded text-zinc-900 cursor-pointer"
                    />
                    <div>
                      <div
                        className={`text-sm font-semibold ${
                          task.status === 'completed'
                            ? 'line-through text-zinc-400'
                            : 'text-zinc-900'
                        }`}
                      >
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="text-xs text-zinc-500 mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1.5">
                        <span className="font-medium text-zinc-700">
                          Assigned: {task.assigned_member?.name || 'Unassigned'}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Due: {task.due_date}
                        </span>
                        {task.due_date < '2026-09-15' && task.status !== 'completed' && (
                          <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded">
                            OVERDUE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <PriorityBadge priority={task.priority} size="sm" />
                    {onEditTask && (
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition cursor-pointer"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteTask && (
                      <button
                        type="button"
                        onClick={() => setTaskToDelete(task)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400">
                No tasks assigned to this project yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Follow-ups */}
      {activeTab === 'followups' && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Client Follow-up Records</h3>
              <p className="text-xs text-zinc-500">
                Maintain relationship touchpoints, calls, site visits, and scheduled reminders.
              </p>
            </div>
            <button
              onClick={onOpenAddFollowUp}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Follow-up</span>
            </button>
          </div>

          <div className="divide-y divide-zinc-200 pt-2">
            {project.follow_ups && project.follow_ups.length > 0 ? (
              project.follow_ups.map((fu) => (
                <div key={fu.id} className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-zinc-900 px-2 py-0.5 bg-zinc-100 rounded border border-zinc-200">
                        {fu.method}
                      </span>
                      <span className="font-bold text-zinc-800">{fu.follow_up_date}</span>
                      {fu.follow_up_date < '2026-09-15' && fu.status !== 'completed' && (
                        <span className="text-rose-600 font-bold text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          OVERDUE
                        </span>
                      )}
                      {fu.follow_up_date === '2026-09-15' && (
                        <span className="text-amber-700 font-bold text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          TODAY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onUpdateFollowUpStatus(
                            fu.id,
                            fu.status === 'completed' ? 'pending' : 'completed'
                          )
                        }
                        className={`text-xs px-2 py-0.5 rounded cursor-pointer ${
                          fu.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        {fu.status === 'completed' ? 'Completed' : 'Mark Completed'}
                      </button>
                      {onEditFollowUp && (
                        <button
                          type="button"
                          onClick={() => onEditFollowUp(fu)}
                          className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded transition cursor-pointer"
                          title="Edit Follow-up"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteFollowUp && (
                        <button
                          type="button"
                          onClick={() => setFollowUpToDelete(fu)}
                          className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Delete Follow-up"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-800 bg-zinc-50/70 p-3 rounded-lg border border-zinc-200/60 leading-relaxed">
                    {fu.notes}
                  </p>

                  <div className="text-[11px] text-zinc-400">
                    Logged by: {fu.creator_member?.name || 'Team member'}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-zinc-400">
                No follow-ups recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Chronological Activity History (Spec #27) */}
      {activeTab === 'activities' && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Project Activity History</h3>
              <p className="text-xs text-zinc-500">
                Complete audit trail of updates, design decisions, site visits, and approvals.
              </p>
            </div>
            <button
              onClick={onOpenAddUpdate}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Update</span>
            </button>
          </div>

          {/* Chronological Timeline (Spec #27) */}
          <div className="relative pl-6 border-l-2 border-zinc-200 space-y-6 pt-3 ml-2">
            {project.activities && project.activities.length > 0 ? (
              project.activities.map((act) => (
                <div key={act.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-zinc-800" />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">{act.activity_date}</span>
                      <span className="text-xs font-semibold text-zinc-700">
                        {act.team_member?.name || 'Company Team'}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                      {act.activity_type}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-700 mt-1 leading-relaxed">{act.description}</p>
                </div>
              ))
            ) : (
              <div className="py-6 text-xs text-zinc-400">No activity logged yet.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Project Team (Spec #22, #23) */}
      {activeTab === 'team' && (
        <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">Assigned Team Members</h3>
            <p className="text-xs text-zinc-500">
              Responsible lead and active staff collaborating on this project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lead */}
            {project.project_lead && (
              <div className="p-4 rounded-xl border-2 border-zinc-900 bg-zinc-50/50 flex items-start gap-3">
                {project.project_lead.avatar ? (
                  <img
                    src={project.project_lead.avatar}
                    alt={project.project_lead.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border border-zinc-300 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-base shrink-0">
                    {project.project_lead.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="inline-block px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-zinc-900 text-white rounded mb-1">
                    Project Lead
                  </div>
                  <div className="text-sm font-bold text-zinc-900">
                    {project.project_lead.name}
                  </div>
                  <div className="text-xs text-zinc-600">
                    {project.project_lead.designation}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
                    <div>{project.project_lead.phone}</div>
                    <div>{project.project_lead.email}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Other Members */}
            {project.team_members
              ?.filter((m) => m.id !== project.project_lead_id)
              .map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl border border-zinc-200 bg-white flex items-start gap-3"
                >
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-zinc-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-base shrink-0">
                      {member.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="inline-block px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-zinc-100 text-zinc-600 rounded mb-1">
                      Team Member
                    </div>
                    <div className="text-sm font-bold text-zinc-900">{member.name}</div>
                    <div className="text-xs text-zinc-600">{member.designation}</div>
                    <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
                      <div>{member.phone}</div>
                      <div>{member.email}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
      {/* Modals for confirmation */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          setIsDeleteModalOpen(false);
          await onDeleteProject();
        }}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${project.project_name}"? All associated tasks, follow-ups, and logs will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete Project"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        onConfirm={async () => {
          setIsArchiveModalOpen(false);
          if (project.is_archived) {
            if (onRestoreProject) await onRestoreProject(project.id);
          } else {
            if (onArchiveProject) await onArchiveProject(project.id);
          }
        }}
        title={project.is_archived ? 'Restore Project' : 'Archive Project'}
        message={
          project.is_archived
            ? `Restore "${project.project_name}" to active projects?`
            : `Move "${project.project_name}" to the Project Archive? It will be safely hidden from active dashboard boards while preserving all historical records.`
        }
        confirmLabel={project.is_archived ? 'Restore Project' : 'Archive Project'}
        isDestructive={false}
      />

      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={async () => {
          if (taskToDelete && onDeleteTask) {
            await onDeleteTask(taskToDelete.id);
          }
          setTaskToDelete(null);
        }}
        title="Delete Task"
        message={`Are you sure you want to delete task "${taskToDelete?.title}"?`}
        confirmLabel="Delete Task"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={Boolean(followUpToDelete)}
        onClose={() => setFollowUpToDelete(null)}
        onConfirm={async () => {
          if (followUpToDelete && onDeleteFollowUp) {
            await onDeleteFollowUp(followUpToDelete.id);
          }
          setFollowUpToDelete(null);
        }}
        title="Delete Follow-up"
        message="Are you sure you want to delete this follow-up record?"
        confirmLabel="Delete Follow-up"
        isDestructive={true}
      />
    </div>
  );
};
