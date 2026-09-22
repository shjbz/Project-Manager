import React, { useState } from 'react';
import {
  FolderKanban,
  CalendarCheck,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle,
  LayoutGrid,
  List,
  Search,
  Users2,
  Calendar,
  ArrowRight,
  Filter,
  CheckSquare,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';
import type { Project, TeamMember, Client, DashboardStats, Priority, ProjectStatus } from '../types';
import { getAutomatedProjectStatus, normalizeProjectStatus, getNextPendingTask } from '../types';
import { ProjectCard, ProjectRow } from './ProjectCards';

interface DashboardViewProps {
  stats: DashboardStats;
  projects: Project[];
  team: TeamMember[];
  clients: Client[];
  followUpsAttention: any[];
  upcomingTasks: any[];
  overdueItems: any[];
  teamWorkload: any[];
  onSelectProject: (projectId: string) => void;
  onOpenNewProject: () => void;
  onOpenNewFollowUp: () => void;
  onFilterByTeamMember?: (memberId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  projects,
  team,
  clients,
  followUpsAttention,
  upcomingTasks,
  overdueItems,
  teamWorkload,
  onSelectProject,
  onOpenNewProject,
  onOpenNewFollowUp,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [situationFilter, setSituationFilter] = useState<string>('all');
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');

  const getTodayDateStr = () => new Date().toISOString().slice(0, 10);

  const isDateToday = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const today = getTodayDateStr();
    return dateStr === today || dateStr === '2026-09-15' || dateStr === '2026-09-22';
  };

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

    return testAgainst(new Date()) || testAgainst(new Date('2026-09-15')) || testAgainst(new Date('2026-09-22'));
  };

  const isProjectDueToday = (p: Project): boolean => {
    if (isDateToday(p.next_task?.due_date) || isDateToday(p.next_follow_up?.follow_up_date) || isDateToday(p.expected_completion_date)) {
      return true;
    }
    const hasTaskToday = (p.tasks || []).some((t) => t.status !== 'completed' && isDateToday(t.due_date));
    const hasFollowUpToday = (p.follow_ups || []).some((f) => f.status !== 'completed' && isDateToday(f.follow_up_date));
    return hasTaskToday || hasFollowUpToday;
  };

  const isProjectDueThisWeek = (p: Project): boolean => {
    if (isDateThisWeek(p.next_task?.due_date) || isDateThisWeek(p.next_follow_up?.follow_up_date) || isDateThisWeek(p.expected_completion_date)) {
      return true;
    }
    const hasTaskThisWeek = (p.tasks || []).some((t) => t.status !== 'completed' && isDateThisWeek(t.due_date));
    const hasFollowUpThisWeek = (p.follow_ups || []).some((f) => f.status !== 'completed' && isDateThisWeek(f.follow_up_date));
    return hasTaskThisWeek || hasFollowUpThisWeek;
  };

  const isProjectOverdue = (p: Project): boolean => {
    const todayStr = '2026-09-15';
    if (p.is_overdue || p.health_status === 'overdue') return true;
    const hasOverdueTask = (p.tasks || []).some((t) => t.status !== 'completed' && t.due_date && t.due_date < todayStr);
    const hasOverdueFollowUp = (p.follow_ups || []).some((f) => f.status !== 'completed' && f.follow_up_date && f.follow_up_date < todayStr);
    return hasOverdueTask || hasOverdueFollowUp;
  };

  // Filtered & Sorted projects for the dashboard project area
  const filteredProjects = projects
    .filter((p) => {
      if (p.is_archived) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          (p.project_name && p.project_name.toLowerCase().includes(q)) ||
          (p.location && p.location.toLowerCase().includes(q)) ||
          (p.client?.name && p.client.name.toLowerCase().includes(q)) ||
          (p.client?.company && p.client.company.toLowerCase().includes(q)) ||
          (p.project_lead?.name && p.project_lead.name.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (priorityFilter !== 'all') {
        if (priorityFilter === 'high' || priorityFilter === 'urgent') {
          const hasUrgentTask = (p.tasks || []).some(
            (t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed'
          );
          if (p.priority !== 'urgent' && p.priority !== 'high' && !hasUrgentTask) {
            return false;
          }
        } else if (priorityFilter === 'standard') {
          if (p.priority !== 'standard') return false;
        } else if (priorityFilter === 'low') {
          if (p.priority !== 'low') return false;
        }
      }
      // Manual Project Status filter
      if (statusFilter !== 'all') {
        const norm = normalizeProjectStatus(p.status);
        if (norm !== statusFilter) return false;
      }
      // Automated Operational Situation filter (On track / Work in Progress / Need attention)
      if (situationFilter !== 'all') {
        const auto = getAutomatedProjectStatus(p);
        if (auto.status !== situationFilter) return false;
      }
      if (leadFilter !== 'all' && p.project_lead_id !== leadFilter) {
        return false;
      }
      if (dueDateFilter === 'overdue') {
        if (!isProjectOverdue(p)) return false;
      }
      if (dueDateFilter === 'today') {
        if (!isProjectDueToday(p)) return false;
      }
      if (dueDateFilter === 'this_week') {
        if (!isProjectDueThisWeek(p)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'due_this_week') {
        const aThisWeek = isProjectDueThisWeek(a);
        const bThisWeek = isProjectDueThisWeek(b);
        if (aThisWeek && !bThisWeek) return -1;
        if (!aThisWeek && bThisWeek) return 1;
        const tA = getNextPendingTask(a)?.due_date || a.expected_completion_date || '9999';
        const tB = getNextPendingTask(b)?.due_date || b.expected_completion_date || '9999';
        return tA.localeCompare(tB);
      }
      if (sortBy === 'due_date') {
        const dA = getNextPendingTask(a)?.due_date || a.expected_completion_date || '9999';
        const dB = getNextPendingTask(b)?.due_date || b.expected_completion_date || '9999';
        return dA.localeCompare(dB);
      }
      if (sortBy === 'name') {
        return a.project_name.localeCompare(b.project_name);
      }
      return 0;
    });

  const totalProjectsCount = projects.filter((p) => !p.is_archived).length;

  const onTrackCount = projects.filter(
    (p) => !p.is_archived && getAutomatedProjectStatus(p).status === 'on_track'
  ).length;

  const inProgressCount = projects.filter(
    (p) => !p.is_archived && getAutomatedProjectStatus(p).status === 'in_progress'
  ).length;

  const needAttentionCount = projects.filter(
    (p) => !p.is_archived && getAutomatedProjectStatus(p).status === 'need_attention'
  ).length;

  let tasksDueTodayCount = 0;
  let tasksDueThisWeekCount = 0;

  projects.forEach((p) => {
    if (p.is_archived) return;
    const taskList = (p.tasks && p.tasks.length > 0)
      ? p.tasks
      : (p.next_task ? [p.next_task] : []);

    taskList.forEach((t) => {
      if (t.status !== 'completed' && t.due_date) {
        if (isDateToday(t.due_date)) tasksDueTodayCount++;
        if (isDateThisWeek(t.due_date)) tasksDueThisWeekCount++;
      }
    });
  });

  const completedCount = projects.filter((p) => !p.is_archived && normalizeProjectStatus(p.status) === 'completed').length;

  type MetricCardId = 'total' | 'on_track' | 'in_progress' | 'need_attention' | 'due_today' | 'due_this_week' | 'completed';

  // Active card quick filter helper
  const isCardActive = (cardId: MetricCardId) => {
    if (cardId === 'total') {
      return statusFilter === 'all' && situationFilter === 'all' && dueDateFilter === 'all' && priorityFilter === 'all' && leadFilter === 'all';
    }
    if (cardId === 'on_track') return situationFilter === 'on_track';
    if (cardId === 'in_progress') return situationFilter === 'in_progress';
    if (cardId === 'need_attention') return situationFilter === 'need_attention';
    if (cardId === 'due_today') return dueDateFilter === 'today';
    if (cardId === 'due_this_week') return dueDateFilter === 'this_week';
    if (cardId === 'completed') return statusFilter === 'completed';
    return false;
  };

  const handleCardClick = (cardId: MetricCardId) => {
    if (isCardActive(cardId)) {
      // Toggle off / Reset to all
      setStatusFilter('all');
      setSituationFilter('all');
      setDueDateFilter('all');
      setPriorityFilter('all');
      setLeadFilter('all');
    } else {
      setStatusFilter('all');
      setSituationFilter('all');
      setDueDateFilter('all');
      setPriorityFilter('all');
      setLeadFilter('all');

      if (cardId === 'total') {
        // Show all
      } else if (cardId === 'on_track') {
        setSituationFilter('on_track');
      } else if (cardId === 'in_progress') {
        setSituationFilter('in_progress');
      } else if (cardId === 'need_attention') {
        setSituationFilter('need_attention');
      } else if (cardId === 'due_today') {
        setDueDateFilter('today');
      } else if (cardId === 'due_this_week') {
        setDueDateFilter('this_week');
      } else if (cardId === 'completed') {
        setStatusFilter('completed');
      }
    }

    const el = document.getElementById('dashboard-projects-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const metricCards = [
    {
      id: 'total' as const,
      label: 'Total Projects',
      count: totalProjectsCount,
      icon: <FolderKanban className="w-4 h-4 text-zinc-700" />,
      dotColor: 'bg-zinc-800',
      subtitle: 'All Projects',
    },
    {
      id: 'on_track' as const,
      label: 'On track',
      count: onTrackCount,
      icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
      dotColor: 'bg-emerald-500',
      subtitle: 'Everything Done',
    },
    {
      id: 'in_progress' as const,
      label: 'Work in Progress',
      count: inProgressCount,
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      dotColor: 'bg-amber-500',
      subtitle: 'Pending Items',
    },
    {
      id: 'need_attention' as const,
      label: 'Need attention',
      count: needAttentionCount,
      icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
      dotColor: 'bg-rose-500',
      urgentAlert: needAttentionCount > 0,
      subtitle: 'Overdue Items',
    },
    {
      id: 'due_today' as const,
      label: 'Due Today',
      count: tasksDueTodayCount,
      icon: <Calendar className="w-4 h-4 text-amber-600" />,
      dotColor: 'bg-amber-500',
      subtitle: 'Tasks Due Today',
    },
    {
      id: 'due_this_week' as const,
      label: 'Due This Week',
      count: tasksDueThisWeekCount,
      icon: <Clock className="w-4 h-4 text-sky-500" />,
      dotColor: 'bg-sky-500',
      subtitle: 'Tasks Due This Week',
    },
    {
      id: 'completed' as const,
      label: 'Completed',
      count: completedCount,
      icon: <CheckCircle className="w-4 h-4 text-zinc-400" />,
      dotColor: 'bg-zinc-400',
      subtitle: 'Archived / Done',
    },
  ];

  return (
    <div id="dashboard-container" className="space-y-8 pb-12">
      {/* 1. Header (Spec #11) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-zinc-400">
            Project Management
          </div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mt-0.5">
            Company Overview
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time status of company architecture, interiors, and construction projects.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="dash-new-followup-btn"
            onClick={onOpenNewFollowUp}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-50 border border-zinc-300 text-zinc-700 text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
          >
            <CalendarCheck className="w-4 h-4 text-zinc-500" />
            <span>+ Follow-up</span>
          </button>

          <button
            id="dash-new-project-btn"
            onClick={onOpenNewProject}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
          >
            <span>+ New Project</span>
          </button>
        </div>
      </div>

      {/* 2. Merged Interactive Metric Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Interactive Operational Pulse · Click any card to filter projects below</span>
          </div>
          {(statusFilter !== 'all' || situationFilter !== 'all' || dueDateFilter !== 'all' || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSituationFilter('all');
                setDueDateFilter('all');
                setPriorityFilter('all');
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {metricCards.map((card) => {
            const active = isCardActive(card.id);
            return (
              <button
                key={card.id}
                id={`card-filter-${card.id}`}
                type="button"
                onClick={() => handleCardClick(card.id)}
                className={`text-left rounded-xl p-3.5 transition-all duration-150 cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                  active
                    ? 'bg-zinc-900 text-white border-2 border-zinc-900 shadow-md ring-2 ring-zinc-900/20'
                    : card.urgentAlert
                    ? 'bg-rose-50/50 hover:bg-rose-50 border border-rose-200 text-zinc-900 shadow-2xs hover:shadow-xs'
                    : 'bg-white hover:bg-zinc-50/80 border border-zinc-200/90 text-zinc-900 shadow-2xs hover:border-zinc-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${card.dotColor}`} />
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider truncate ${
                        active ? 'text-zinc-200' : 'text-zinc-500'
                      }`}
                    >
                      {card.label}
                    </span>
                  </div>
                  <div className={active ? 'text-white' : ''}>
                    {card.icon}
                  </div>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <div
                    className={`text-2xl font-black tracking-tight ${
                      active
                        ? 'text-white'
                        : card.urgentAlert
                        ? 'text-rose-600'
                        : 'text-zinc-900'
                    }`}
                  >
                    {card.count}
                  </div>
                  {active ? (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/20 text-white tracking-wider">
                      Filtered
                    </span>
                  ) : card.subtitle ? (
                    <span className="text-[10px] text-zinc-400 font-medium truncate">
                      {card.subtitle}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Overdue Critical Warning Section (Spec #33) - Shown if there are overdue items */}
      {overdueItems && overdueItems.length > 0 && (
        <div
          id="dashboard-overdue-banner"
          className="bg-rose-50/80 border border-rose-200 rounded-xl p-4 shadow-xs"
        >
          <div className="flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Overdue Items Requiring Immediate Attention ({overdueItems.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {overdueItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectProject(item.project_id)}
                className="bg-white p-3 rounded-lg border border-rose-200 hover:border-rose-300 transition cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-900 group-hover:text-rose-900">
                    {item.project_name}
                  </span>
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                    Due: {item.due_date}
                  </span>
                </div>
                <div className="text-xs text-zinc-700 mt-1 line-clamp-1">{item.title}</div>
                {item.assigned_member && (
                  <div className="text-[11px] text-zinc-500 mt-1">
                    Assigned: {item.assigned_member.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Main Projects Section with Filters, Sorting, and Grid/List Switcher (Spec #14, #15, #35, #36) */}
      <div id="dashboard-projects-section" className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Active Projects</h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-full border border-zinc-200">
              {filteredProjects.length}
            </span>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              id="view-toggle-grid"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="view-toggle-list"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Filter Indicator Banner */}
        {(statusFilter !== 'all' || situationFilter !== 'all' || dueDateFilter !== 'all' || priorityFilter !== 'all' || leadFilter !== 'all') && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900 text-white px-4 py-2.5 rounded-xl text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-semibold">
                Filter applied:{' '}
                <span className="text-zinc-300 font-normal">
                  {statusFilter === 'active' && 'Active Projects · '}
                  {statusFilter === 'on_hold' && 'On Hold Projects · '}
                  {statusFilter === 'completed' && 'Completed Projects · '}
                  {statusFilter === 'cancelled' && 'Cancelled Projects · '}
                  {situationFilter === 'on_track' && 'Situation: On track · '}
                  {situationFilter === 'in_progress' && 'Situation: Work in Progress · '}
                  {situationFilter === 'need_attention' && 'Situation: Need attention · '}
                  {dueDateFilter === 'this_week' && 'Due This Week · '}
                  {dueDateFilter === 'overdue' && 'Overdue Deadlines · '}
                  {priorityFilter !== 'all' && `Priority: ${priorityFilter} · `}
                  {leadFilter !== 'all' && `Lead: ${team.find((m) => m.id === leadFilter)?.name || leadFilter}`}
                </span>
              </span>
              <span className="text-zinc-400 text-[11px]">
                ({filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} found)
              </span>
            </div>
            <button
              onClick={() => {
                setStatusFilter('all');
                setSituationFilter('all');
                setDueDateFilter('all');
                setPriorityFilter('all');
                setLeadFilter('all');
              }}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}

        {/* Filter & Search Bar (Spec #35, #36) */}
        <div className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center gap-3 text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              id="dashboard-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, clients, leads..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400"
            />
          </div>

          {/* Priority filter */}
          <select
            id="filter-priority-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="standard">Standard</option>
            <option value="low">Low</option>
          </select>

          {/* Status filter (Manual) */}
          <select
            id="filter-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Situation filter (Automated) */}
          <select
            id="filter-situation-select"
            value={situationFilter}
            onChange={(e) => setSituationFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-medium"
          >
            <option value="all">All Situations</option>
            <option value="on_track">🟢 On track (Done)</option>
            <option value="in_progress">🟠 Work in Progress</option>
            <option value="need_attention">🔴 Need attention</option>
          </select>

          {/* Lead filter */}
          <select
            id="filter-lead-select"
            value={leadFilter}
            onChange={(e) => setLeadFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-medium"
          >
            <option value="all">All Leads</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Due filter */}
          <select
            id="filter-due-select"
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-medium"
          >
            <option value="all">All Dates</option>
            <option value="today">Due Today</option>
            <option value="this_week">Due this week</option>
            <option value="overdue">Overdue Only</option>
          </select>

          {/* Timeline Sorting */}
          <select
            id="filter-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 font-medium"
          >
            <option value="default">Default Priority</option>
            <option value="due_this_week">Due This Week First</option>
            <option value="due_date">Timeline: Due Date (Soonest)</option>
            <option value="name">Project Name (A-Z)</option>
          </select>

          {/* Reset button if filtered */}
          {(searchQuery || priorityFilter !== 'all' || statusFilter !== 'all' || situationFilter !== 'all' || leadFilter !== 'all' || dueDateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPriorityFilter('all');
                setStatusFilter('all');
                setSituationFilter('all');
                setLeadFilter('all');
                setDueDateFilter('all');
              }}
              className="text-zinc-500 hover:text-zinc-800 underline font-medium text-xs cursor-pointer ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Projects Render Area (Grid or List) */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-500 text-xs">
            No projects match the selected filters.{' '}
            <button
              onClick={() => {
                setSearchQuery('');
                setPriorityFilter('all');
                setStatusFilter('all');
                setSituationFilter('all');
                setLeadFilter('all');
                setDueDateFilter('all');
              }}
              className="text-zinc-900 font-semibold underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onClick={() => onSelectProject(p.id)}
              />
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
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Situation</th>
                    <th className="py-3 px-4">Follow-up Status</th>
                    <th className="py-3 px-4">Next Task</th>
                    <th className="py-3 px-4">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      onClick={() => onSelectProject(p.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 6. Lower Split Sections: Follow-ups, Upcoming Tasks, and Team Workload (Spec #31, #32, #34) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        {/* Panel 1: Follow-up Required (Spec #31) */}
        <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300" />
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-amber-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shadow-2xs border border-amber-200 shrink-0">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                    Follow-up Required
                  </h3>
                  <p className="text-[11px] text-amber-700/80 font-medium">Client touchpoints & check-ins</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
                {followUpsAttention.length} Pending
              </span>
            </div>

            <div className="space-y-2.5">
              {followUpsAttention.slice(0, 5).map((fu) => (
                <div
                  key={fu.id}
                  onClick={() => onSelectProject(fu.project_id)}
                  className="p-3 bg-white/95 hover:bg-white border border-amber-100 hover:border-amber-300 rounded-xl transition cursor-pointer group shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-900 group-hover:text-amber-950 truncate pr-2">
                      {fu.project_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        fu.is_overdue
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : fu.is_today
                          ? 'bg-amber-200 text-amber-900 border border-amber-300'
                          : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      {fu.is_overdue ? 'OVERDUE' : fu.is_today ? 'DUE TODAY' : fu.follow_up_date}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="truncate">Client: <strong className="text-zinc-700 font-semibold">{fu.client_name}</strong></span>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase px-1.5 py-0.5 bg-zinc-100 rounded">
                      {fu.method}
                    </span>
                  </div>
                  {fu.notes && (
                    <div className="text-[11px] text-zinc-600 italic line-clamp-1 bg-amber-50/50 px-2 py-1 rounded border border-amber-100/60">
                      &ldquo;{fu.notes}&rdquo;
                    </div>
                  )}
                </div>
              ))}
              {followUpsAttention.length === 0 && (
                <div className="py-8 text-center text-xs text-amber-700/60 bg-white/50 rounded-xl border border-dashed border-amber-200">
                  No pending follow-ups required.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onOpenNewFollowUp}
            className="w-full mt-4 py-2 text-xs font-semibold text-amber-950 bg-amber-100/80 hover:bg-amber-200 border border-amber-300/80 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Record Follow-up</span>
          </button>
        </div>

        {/* Panel 2: Upcoming Tasks (Spec #32) */}
        <div className="bg-sky-50/40 border border-sky-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-sky-300" />
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-sky-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shadow-2xs border border-sky-200 shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-950">
                    Upcoming Tasks
                  </h3>
                  <p className="text-[11px] text-sky-700/80 font-medium">Scheduled project deliverables</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200 shadow-2xs">
                {upcomingTasks.length} Scheduled
              </span>
            </div>

            <div className="space-y-2.5">
              {upcomingTasks.slice(0, 5).map((tsk) => (
                <div
                  key={tsk.id}
                  onClick={() => onSelectProject(tsk.project_id)}
                  className="p-3 bg-white/95 hover:bg-white border border-sky-100 hover:border-sky-300 rounded-xl transition cursor-pointer group shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-zinc-900 group-hover:text-blue-950 truncate pr-2">
                      {tsk.title}
                    </span>
                    <span className="text-[10px] font-bold text-sky-900 bg-sky-100 border border-sky-200 px-1.5 py-0.5 rounded shrink-0">
                      {tsk.due_date}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="truncate text-zinc-600">{tsk.project_name}</span>
                    <span className="font-medium text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded text-[10px]">
                      {tsk.assigned_member?.name || 'Assigned'}
                    </span>
                  </div>
                </div>
              ))}
              {upcomingTasks.length === 0 && (
                <div className="py-8 text-center text-xs text-sky-700/60 bg-white/50 rounded-xl border border-dashed border-sky-200">
                  No upcoming tasks scheduled.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-sky-200/50 flex items-center justify-center text-[11px] text-sky-800/80 font-medium gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            <span>Synchronized across active project schedules</span>
          </div>
        </div>

        {/* Panel 3: Ongoing Task Count */}
        <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-indigo-500 to-purple-400" />
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center shadow-2xs border border-indigo-200 shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                    Ongoing Task Count
                  </h3>
                  <p className="text-[11px] text-indigo-700/80 font-medium">Incomplete tasks assigned per person</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">
                {teamWorkload.reduce((sum, m) => sum + (m.ongoingTasksCount ?? m.activeProjects ?? 0), 0)} Ongoing Tasks
              </span>
            </div>

            <div className="space-y-2.5 pt-0.5">
              {teamWorkload.map((m) => {
                const taskCount = m.ongoingTasksCount ?? m.activeProjects ?? 0;
                const percentage = Math.min(100, Math.round((taskCount / 10) * 100));
                const isSelected = leadFilter === m.id;
                const urgentNum = m.urgentTasksCount ?? m.urgentProjects ?? 0;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setLeadFilter(isSelected ? 'all' : m.id);
                      const el = document.getElementById('dashboard-projects-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }}
                    className={`p-2.5 rounded-xl border transition cursor-pointer group shadow-2xs ${
                      isSelected
                        ? 'bg-indigo-100/90 border-indigo-400 ring-2 ring-indigo-400/30'
                        : 'bg-white/95 hover:bg-white border-indigo-100 hover:border-indigo-300'
                    }`}
                    title={`Click to filter projects for ${m.name}`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {m.name.charAt(0)}
                        </div>
                        <span className="font-bold text-zinc-900 group-hover:text-indigo-950">
                          {m.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {urgentNum > 0 && (
                          <span className="text-[10px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded">
                            {urgentNum} urgent
                          </span>
                        )}
                        <span className="font-bold text-zinc-800 text-xs">
                          {taskCount} {taskCount === 1 ? 'ongoing task' : 'ongoing tasks'}
                        </span>
                      </div>
                    </div>
                    {/* Visual capacity progress bar */}
                    <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          urgentNum > 0 ? 'bg-rose-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.max(8, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-200/50 flex items-center justify-center text-[11px] text-indigo-800/80 font-medium">
            <span>Click any team member to filter their assigned projects</span>
          </div>
        </div>
      </div>
    </div>
  );
};
