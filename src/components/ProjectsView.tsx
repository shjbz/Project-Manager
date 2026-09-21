import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  ArrowUpDown,
} from 'lucide-react';
import type { Project, TeamMember, Client, Priority, ProjectStatus } from '../types';
import { getAutomatedProjectStatus, normalizeProjectStatus } from '../types';
import { ProjectCard, ProjectRow } from './ProjectCards';

interface ProjectsViewProps {
  projects: Project[];
  team: TeamMember[];
  clients: Client[];
  onSelectProject: (projectId: string) => void;
  onOpenNewProject: () => void;
  preselectedLeadId?: string;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  team,
  clients,
  onSelectProject,
  onOpenNewProject,
  preselectedLeadId,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [situation, setSituation] = useState<string>('all');
  const [leadId, setLeadId] = useState<string>(preselectedLeadId || 'all');
  const [clientId, setClientId] = useState<string>('all');
  const [projectType, setProjectType] = useState<string>('all');
  const [dueDate, setDueDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');

  const isDateThisWeek = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return false;

    const testAgainst = (base: Date) => {
      const d = new Date(base);
      d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      return target >= startOfWeek && target <= endOfWeek;
    };

    return testAgainst(new Date()) || testAgainst(new Date('2026-09-15'));
  };

  const filtered = projects.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        (p.project_name && p.project_name.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.client?.name && p.client.name.toLowerCase().includes(q)) ||
        (p.client?.company && p.client.company.toLowerCase().includes(q)) ||
        (p.project_lead?.name && p.project_lead.name.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (priority !== 'all') {
      if ((priority === 'high' || priority === 'urgent') && (p.priority !== 'high' && p.priority !== 'urgent')) return false;
      if (priority === 'standard' && p.priority !== 'standard') return false;
      if (priority === 'low' && p.priority !== 'low') return false;
    }
    // Manual Project Status
    if (status !== 'all') {
      const norm = normalizeProjectStatus(p.status);
      if (norm !== status) return false;
    }
    // Automated Situation (On track / Work in Progress / Need attention)
    if (situation !== 'all') {
      const auto = getAutomatedProjectStatus(p);
      if (auto.status !== situation) return false;
    }
    if (leadId !== 'all' && p.project_lead_id !== leadId) {
      return false;
    }
    if (clientId !== 'all' && p.client_id !== clientId) return false;
    if (projectType !== 'all' && p.project_type.toLowerCase() !== projectType.toLowerCase()) {
      return false;
    }
    if (dueDate === 'overdue' && !p.is_overdue) return false;
    if (dueDate === 'today') {
      const isToday =
        p.next_task?.due_date === '2026-09-15' || p.next_follow_up?.follow_up_date === '2026-09-15';
      if (!isToday) return false;
    }
    if (dueDate === 'this_week') {
      const hasTaskThisWeek = isDateThisWeek(p.next_task?.due_date);
      const hasFollowUpThisWeek = isDateThisWeek(p.next_follow_up?.follow_up_date);
      const hasCompletionThisWeek = isDateThisWeek(p.expected_completion_date);
      if (!hasTaskThisWeek && !hasFollowUpThisWeek && !hasCompletionThisWeek) {
        return false;
      }
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'due_this_week') {
      const aThisWeek =
        isDateThisWeek(a.next_task?.due_date) || isDateThisWeek(a.next_follow_up?.follow_up_date);
      const bThisWeek =
        isDateThisWeek(b.next_task?.due_date) || isDateThisWeek(b.next_follow_up?.follow_up_date);
      if (aThisWeek && !bThisWeek) return -1;
      if (!aThisWeek && bThisWeek) return 1;
      return (a.next_task?.due_date || '9999').localeCompare(b.next_task?.due_date || '9999');
    }
    if (sortBy === 'default') {
      const pScore: Record<string, number> = { urgent: 3, standard: 2, low: 1 };
      const diff = (pScore[b.priority] || 0) - (pScore[a.priority] || 0);
      if (diff !== 0) return diff;
      if (a.is_overdue && !b.is_overdue) return -1;
      if (!a.is_overdue && b.is_overdue) return 1;
      return (a.next_task?.due_date || '9999').localeCompare(b.next_task?.due_date || '9999');
    }
    if (sortBy === 'name') return a.project_name.localeCompare(b.project_name);
    if (sortBy === 'client') return (a.client?.name || '').localeCompare(b.client?.name || '');
    if (sortBy === 'lead') return (a.project_lead?.name || '').localeCompare(b.project_lead?.name || '');
    if (sortBy === 'start_date') return b.start_date.localeCompare(a.start_date);
    if (sortBy === 'due_date') {
      const dA = a.next_task?.due_date || a.expected_completion_date || '9999';
      const dB = b.next_task?.due_date || b.expected_completion_date || '9999';
      return dA.localeCompare(dB);
    }
    return 0;
  });

  const projectTypesList = Array.from(new Set(projects.map((p) => p.project_type)));

  return (
    <div id="projects-view-container" className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-zinc-400">
            Portfolio Command
          </div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mt-0.5">Projects</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Complete company projects directory with workload, assignments, and schedule tracking.
          </p>
        </div>

        <button
          id="projects-create-new-btn"
          onClick={onOpenNewProject}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Project</span>
        </button>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              id="projects-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project name, client, lead, or location..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Selector (Spec #36) */}
            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <select
                id="projects-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-medium"
              >
                <option value="default">Default: Priority & Overdue</option>
                <option value="due_this_week">Timeline: Due this week</option>
                <option value="due_date">Timeline: Due Date (Soonest)</option>
                <option value="name">Project Name (A-Z)</option>
                <option value="client">Client Name</option>
                <option value="lead">Project Lead</option>
                <option value="start_date">Start Date</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Second row of granular filters (Spec #35) */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-zinc-100 text-xs">
          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="standard">Standard</option>
            <option value="low">Low</option>
          </select>

          {/* Project Status (Manual) */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700"
          >
            <option value="all">All Project Statuses</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Operational Situation (Automated) */}
          <select
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700 font-medium"
          >
            <option value="all">All Situations</option>
            <option value="on_track">🟢 On track (Everything Done)</option>
            <option value="in_progress">🟠 Work in Progress (Tasks/Follow-up Pending)</option>
            <option value="need_attention">🔴 Need attention (Overdue Task/Followup)</option>
          </select>

          {/* Lead */}
          <select
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700"
          >
            <option value="all">All Leads & Members</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Client */}
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.company ? `(${c.company})` : ''}
              </option>
            ))}
          </select>

          {/* Type */}
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700"
          >
            <option value="all">All Project Types</option>
            {projectTypesList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Due date */}
          <select
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700"
          >
            <option value="all">All Due Dates</option>
            <option value="today">Due Today</option>
            <option value="this_week">Due this week</option>
            <option value="overdue">Overdue Only</option>
          </select>

          {/* Reset button */}
          {(search || priority !== 'all' || status !== 'all' || situation !== 'all' || leadId !== 'all' || clientId !== 'all' || projectType !== 'all' || dueDate !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setPriority('all');
                setStatus('all');
                setSituation('all');
                setLeadId('all');
                setClientId('all');
                setProjectType('all');
                setDueDate('all');
              }}
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-950 underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Projects Display */}
      {sorted.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-500 text-xs">
          No projects found matching the criteria.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => onSelectProject(p.id)} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Project Lead</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Project Status</th>
                  <th className="py-3 px-4">Situation</th>
                  <th className="py-3 px-4">Follow-up Status</th>
                  <th className="py-3 px-4">Next Task</th>
                  <th className="py-3 px-4">Due</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <ProjectRow key={p.id} project={p} onClick={() => onSelectProject(p.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
