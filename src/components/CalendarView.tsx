import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  CalendarCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  Phone,
  MessageSquare,
  Users,
  MapPin,
  X,
  ListFilter,
  Search,
} from 'lucide-react';
import type { Project, Task, FollowUp, TeamMember, Client } from '../types';

interface CalendarViewProps {
  projects: Project[];
  team: TeamMember[];
  clients: Client[];
  onSelectProject: (projectId: string) => void;
  onOpenNewTask?: (defaultDate?: string, projectId?: string) => void;
  onOpenNewFollowUp?: (defaultDate?: string, projectId?: string) => void;
  onUpdateTaskStatus?: (taskId: string, newStatus: Task['status']) => void;
  onUpdateFollowUpStatus?: (fuId: string, newStatus: FollowUp['status']) => void;
}

export type CalendarItemType = 'task' | 'follow_up';

export interface CalendarEvent {
  id: string;
  type: CalendarItemType;
  title: string;
  date: string; // YYYY-MM-DD
  projectId: string;
  projectName: string;
  clientName?: string;
  status: string;
  priority?: string;
  method?: string;
  assignedMember?: TeamMember;
  creatorMember?: TeamMember;
  notes?: string;
  isOverdue: boolean;
  isToday: boolean;
  rawTask?: Task;
  rawFollowUp?: FollowUp;
}

// Days of the week starting from Saturday (Index 0 = Saturday, ..., Index 6 = Friday: Weekend)
const DAYS_OF_WEEK = [
  { short: 'Sat', full: 'Saturday', isWeekend: false },
  { short: 'Sun', full: 'Sunday', isWeekend: false },
  { short: 'Mon', full: 'Monday', isWeekend: false },
  { short: 'Tue', full: 'Tuesday', isWeekend: false },
  { short: 'Wed', full: 'Wednesday', isWeekend: false },
  { short: 'Thu', full: 'Thursday', isWeekend: false },
  { short: 'Fri', full: 'Friday', isWeekend: true }, // Friday is weekend
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  projects,
  team,
  clients,
  onSelectProject,
  onOpenNewTask,
  onOpenNewFollowUp,
  onUpdateTaskStatus,
  onUpdateFollowUpStatus,
}) => {
  // Current calendar navigation date
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: CalendarEvent[] } | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'tasks' | 'follow_ups'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  // Real today's date formatted as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Year & Month being viewed
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0 - 11

  // Extract all calendar events (tasks and follow-ups) from projects
  const allEvents = useMemo(() => {
    const list: CalendarEvent[] = [];
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));
    const teamMap = new Map(team.map((m) => [m.id, m]));

    projects.forEach((proj) => {
      if (proj.is_archived) return;

      const cName = proj.client?.name || clientMap.get(proj.client_id) || 'Client';

      // 1. Process Tasks (deadline = due_date)
      (proj.tasks || []).forEach((task) => {
        if (!task.due_date) return;
        const assigned = task.assigned_to ? teamMap.get(task.assigned_to) : task.assigned_member;
        const isOverdue = task.status !== 'completed' && task.due_date < todayStr;
        const isToday = task.due_date === todayStr;

        list.push({
          id: task.id,
          type: 'task',
          title: task.title,
          date: task.due_date,
          projectId: proj.id,
          projectName: proj.project_name,
          clientName: cName,
          status: task.status,
          priority: task.priority,
          assignedMember: assigned,
          notes: task.description,
          isOverdue,
          isToday,
          rawTask: task,
        });
      });

      // 2. Process Follow-ups (date = follow_up_date)
      (proj.follow_ups || []).forEach((fu) => {
        const fDate = fu.follow_up_date || (fu as any).date;
        if (!fDate) return;
        const creator = fu.created_by ? teamMap.get(fu.created_by) : fu.creator_member;
        const isOverdue = fu.status !== 'completed' && fDate < todayStr;
        const isToday = fDate === todayStr;

        list.push({
          id: fu.id,
          type: 'follow_up',
          title: fu.notes ? (fu.notes.length > 50 ? fu.notes.slice(0, 48) + '...' : fu.notes) : `Follow-up (${fu.method})`,
          date: fDate,
          projectId: proj.id,
          projectName: proj.project_name,
          clientName: fu.client_name || cName,
          status: fu.status || 'pending',
          method: fu.method || 'Phone',
          creatorMember: creator,
          notes: fu.notes,
          isOverdue,
          isToday,
          rawFollowUp: fu,
        });
      });
    });

    return list;
  }, [projects, clients, team, todayStr]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Type filter
      if (typeFilter === 'tasks' && ev.type !== 'task') return false;
      if (typeFilter === 'follow_ups' && ev.type !== 'follow_up') return false;

      // Status filter
      if (statusFilter === 'pending' && ev.status === 'completed') return false;
      if (statusFilter === 'completed' && ev.status !== 'completed') return false;

      // Project filter
      if (projectFilter !== 'all' && ev.projectId !== projectFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesProject = ev.projectName.toLowerCase().includes(q);
        const matchesClient = ev.clientName?.toLowerCase().includes(q);
        const matchesNotes = ev.notes?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesProject && !matchesClient && !matchesNotes) return false;
      }

      return true;
    });
  }, [allEvents, typeFilter, statusFilter, projectFilter, searchQuery]);

  // Map events by date (key = YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((ev) => {
      const existing = map.get(ev.date) || [];
      existing.push(ev);
      map.set(ev.date, existing);
    });
    return map;
  }, [filteredEvents]);

  // Quick statistics for the active month
  const monthStats = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const thisMonthEvents = allEvents.filter((e) => e.date.startsWith(monthPrefix));
    const tasksCount = thisMonthEvents.filter((e) => e.type === 'task').length;
    const followUpsCount = thisMonthEvents.filter((e) => e.type === 'follow_up').length;
    const overdueCount = allEvents.filter((e) => e.isOverdue).length;
    const pendingMonthCount = thisMonthEvents.filter((e) => e.status !== 'completed').length;

    return {
      total: thisMonthEvents.length,
      tasks: tasksCount,
      followUps: followUpsCount,
      overdue: overdueCount,
      pending: pendingMonthCount,
    };
  }, [allEvents, currentYear, currentMonth]);

  // Calendar Grid Matrix Calculation: Week starting on Saturday!
  const calendarDays = useMemo(() => {
    // 1st day of the month
    const firstDay = new Date(currentYear, currentMonth, 1);
    // Number of days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // In JS: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    // To make Saturday = index 0:
    // satIndex = (jsDay + 1) % 7
    const firstDaySatIndex = (firstDay.getDay() + 1) % 7;

    // Days from previous month to fill the first row
    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
    const cells: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isWeekend: boolean; // Friday
      isToday: boolean;
    }> = [];

    // Fill leading days from previous month
    for (let i = firstDaySatIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDaysCount - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      const dayOfWeek = (new Date(prevYear, prevMonth, dNum).getDay() + 1) % 7;
      cells.push({
        dateStr,
        dayNumber: dNum,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 6, // Friday
        isToday: dateStr === todayStr,
      });
    }

    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = (new Date(currentYear, currentMonth, d).getDay() + 1) % 7;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isWeekend: dayOfWeek === 6, // Friday is weekend
        isToday: dateStr === todayStr,
      });
    }

    // Fill trailing days for the next month to complete the 7-day grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayOfWeek = (new Date(nextYear, nextMonth, i).getDay() + 1) % 7;
      cells.push({
        dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isWeekend: dayOfWeek === 6,
        isToday: dateStr === todayStr,
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Toggle item status directly from calendar popover
  const handleToggleEventStatus = (event: CalendarEvent) => {
    if (event.type === 'task' && onUpdateTaskStatus) {
      const newStatus = event.status === 'completed' ? 'pending' : 'completed';
      onUpdateTaskStatus(event.id, newStatus);
      setSelectedEvent((prev) => (prev ? { ...prev, status: newStatus } : null));
    } else if (event.type === 'follow_up' && onUpdateFollowUpStatus) {
      const newStatus = event.status === 'completed' ? 'pending' : 'completed';
      onUpdateFollowUpStatus(event.id, newStatus);
      setSelectedEvent((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  return (
    <div className="space-y-5">
      {/* Calendar Header: Title, Controls, Navigation */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
                <CalendarIcon className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                  <span>Project Schedule & Calendar</span>
                </h1>
                <p className="text-xs text-zinc-500 font-medium">
                  Week starts on <strong>Saturday</strong> &bull; <strong>Friday</strong> is designated weekend &bull; Real-time task deadlines & client follow-ups
                </p>
              </div>
            </div>
          </div>

          {/* Month Navigation & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-1 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                className="p-1.5 rounded-lg hover:bg-white text-zinc-700 hover:text-zinc-950 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 text-xs font-bold text-zinc-900 tracking-tight min-w-[130px] text-center">
                {monthName} {currentYear}
              </div>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                className="p-1.5 rounded-lg hover:bg-white text-zinc-700 hover:text-zinc-950 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleGoToday}
              className="px-3 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              Today
            </button>

            {/* View Mode Toggle: Month vs Agenda */}
            <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-1 text-xs font-medium">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'month' ? 'bg-white text-zinc-950 font-bold shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Month Grid
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'agenda' ? 'bg-white text-zinc-950 font-bold shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Agenda List
              </button>
            </div>

            {/* Quick Record Buttons */}
            {onOpenNewTask && (
              <button
                onClick={() => onOpenNewTask(todayStr)}
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-950 border border-sky-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                <span>+ Task</span>
              </button>
            )}

            {onOpenNewFollowUp && (
              <button
                onClick={() => onOpenNewFollowUp(todayStr)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Follow-up</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimal Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-100">
          <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tasks (Deadlines)</div>
              <div className="text-base font-bold text-sky-950 leading-tight">
                {monthStats.tasks} <span className="text-[11px] font-medium text-zinc-500">this month</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Follow-ups (Dates)</div>
              <div className="text-base font-bold text-amber-950 leading-tight">
                {monthStats.followUps} <span className="text-[11px] font-medium text-zinc-500">touchpoints</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-800 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pending Deliverables</div>
              <div className="text-base font-bold text-zinc-900 leading-tight">
                {monthStats.pending} <span className="text-[11px] font-medium text-zinc-500">in schedule</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Overdue Attention</div>
              <div className="text-base font-bold text-rose-950 leading-tight">
                {monthStats.overdue} <span className="text-[11px] font-medium text-zinc-500">action required</span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Filters & Search Strip */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          {/* Type Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-zinc-900 text-white shadow-2xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
              }`}
            >
              All Items ({allEvents.length})
            </button>
            <button
              onClick={() => setTypeFilter('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                typeFilter === 'tasks'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks ({allEvents.filter((e) => e.type === 'task').length})</span>
            </button>
            <button
              onClick={() => setTypeFilter('follow_ups')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                typeFilter === 'follow_ups'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Follow-ups ({allEvents.filter((e) => e.type === 'follow_up').length})</span>
            </button>
          </div>

          {/* Status & Search */}
          <div className="flex items-center gap-2">
            {/* Status toggle */}
            <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-white font-bold text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  statusFilter === 'completed' ? 'bg-white font-bold text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white font-bold text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All
              </button>
            </div>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
            >
              <option value="all">All Projects</option>
              {projects
                .filter((p) => !p.is_archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name}
                  </option>
                ))}
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 w-32 sm:w-44"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar View: Month Grid */}
      {viewMode === 'month' ? (
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Day of Week Headers: Saturday to Friday */}
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/80 text-xs font-bold text-zinc-600">
            {DAYS_OF_WEEK.map((d, idx) => (
              <div
                key={d.full}
                className={`p-3 text-center border-r border-zinc-200 last:border-r-0 flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  d.isWeekend ? 'bg-amber-50/40 text-amber-950 font-bold' : ''
                }`}
              >
                <span>{d.full}</span>
                {d.isWeekend && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 tracking-wider uppercase">
                    Weekend
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 7-column Calendar Matrix */}
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200">
            {calendarDays.map((cell) => {
              const dayEvents = eventsByDate.get(cell.dateStr) || [];
              const hasEvents = dayEvents.length > 0;
              const isCellToday = cell.dateStr === todayStr;

              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[110px] sm:min-h-[125px] p-2 flex flex-col transition group relative ${
                    !cell.isCurrentMonth
                      ? 'bg-zinc-50/60 text-zinc-400'
                      : cell.isWeekend
                      ? 'bg-amber-50/20 text-zinc-800'
                      : 'bg-white text-zinc-900'
                  } ${isCellToday ? 'ring-2 ring-inset ring-zinc-900/80' : ''}`}
                >
                  {/* Day header: number + today tag */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                          isCellToday
                            ? 'bg-zinc-900 text-white font-bold shadow-xs'
                            : cell.isCurrentMonth
                            ? 'text-zinc-800 group-hover:bg-zinc-100'
                            : 'text-zinc-400'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      {isCellToday && (
                        <span className="hidden sm:inline-block text-[9px] font-bold uppercase tracking-wider text-zinc-900 bg-zinc-200/80 px-1.5 py-0.2 rounded">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Quick Add Button on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                      {onOpenNewTask && (
                        <button
                          onClick={() => onOpenNewTask(cell.dateStr)}
                          title={`Add task for ${cell.dateStr}`}
                          className="p-1 hover:bg-sky-100 text-sky-800 rounded transition cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Event Pills List inside Cell */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const isTask = ev.type === 'task';
                      const isCompleted = ev.status === 'completed';

                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`px-1.5 py-1 rounded-md text-[11px] font-medium border transition cursor-pointer truncate flex items-center gap-1 shadow-2xs ${
                            isTask
                              ? isCompleted
                                ? 'bg-zinc-100 text-zinc-500 border-zinc-200 line-through'
                                : ev.isOverdue
                                ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                                : 'bg-sky-50 text-sky-950 border-sky-200 hover:bg-sky-100 hover:border-sky-300'
                              : isCompleted
                              ? 'bg-zinc-100 text-zinc-500 border-zinc-200 line-through'
                              : ev.isOverdue
                              ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                              : 'bg-amber-50 text-amber-950 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                          }`}
                          title={`${isTask ? 'Task' : 'Follow-up'}: ${ev.title} (${ev.projectName})`}
                        >
                          {isTask ? (
                            <CheckSquare className="w-3 h-3 text-sky-600 shrink-0" />
                          ) : (
                            <CalendarCheck className="w-3 h-3 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}

                    {/* View more indicator if > 3 items */}
                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => setSelectedDayEvents({ date: cell.dateStr, events: dayEvents })}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-bold text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                      >
                        +{dayEvents.length - 3} more items
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda List View: Day-by-Day Clean Stream */
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Agenda Schedule & Timeline
            </h2>
            <span className="text-xs text-zinc-500 font-medium">
              Showing {filteredEvents.length} items
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
              No tasks or follow-ups found matching your filters.
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(eventsByDate.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateStr, events]) => {
                  const dObj = new Date(dateStr + 'T00:00:00');
                  const dayOfWeekName = DAYS_OF_WEEK[(dObj.getDay() + 1) % 7]?.full || '';
                  const isDateToday = dateStr === todayStr;
                  const isWeekend = (dObj.getDay() + 1) % 7 === 6;

                  return (
                    <div key={dateStr} className="border border-zinc-200 rounded-xl overflow-hidden">
                      <div
                        className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b border-zinc-200 ${
                          isDateToday
                            ? 'bg-zinc-900 text-white'
                            : isWeekend
                            ? 'bg-amber-50 text-amber-950'
                            : 'bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{dateStr}</span>
                          <span className="opacity-80">({dayOfWeekName})</span>
                          {isWeekend && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 uppercase">
                              Weekend
                            </span>
                          )}
                          {isDateToday && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white text-zinc-900 uppercase">
                              Today
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium opacity-80">
                          {events.length} {events.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className="divide-y divide-zinc-100 p-2 space-y-1">
                        {events.map((ev) => {
                          const isTask = ev.type === 'task';
                          return (
                            <div
                              key={ev.id}
                              onClick={() => setSelectedEvent(ev)}
                              className="p-2.5 rounded-lg hover:bg-zinc-50 flex items-center justify-between gap-4 transition cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                                    isTask
                                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  {isTask ? (
                                    <CheckSquare className="w-3.5 h-3.5" />
                                  ) : (
                                    <CalendarCheck className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-bold truncate ${
                                        ev.status === 'completed'
                                          ? 'line-through text-zinc-400'
                                          : 'text-zinc-900 group-hover:text-zinc-950'
                                      }`}
                                    >
                                      {ev.title}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                        isTask
                                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}
                                    >
                                      {isTask ? 'Task' : 'Follow-up'}
                                    </span>
                                    {ev.isOverdue && (
                                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                                    <span className="font-semibold text-zinc-700">{ev.projectName}</span>
                                    {ev.clientName && <span>&bull; Client: {ev.clientName}</span>}
                                    {ev.assignedMember && <span>&bull; Lead: {ev.assignedMember.name}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                                    ev.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-zinc-100 text-zinc-700'
                                  }`}
                                >
                                  {ev.status}
                                </span>
                                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 transition" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Selected Event Details Modal / Popover */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedEvent.type === 'task'
                      ? 'bg-sky-100 text-sky-900 border-sky-200'
                      : 'bg-amber-100 text-amber-950 border-amber-200'
                  }`}
                >
                  {selectedEvent.type === 'task' ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <CalendarCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        selectedEvent.type === 'task'
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {selectedEvent.type === 'task' ? 'Task Deliverable' : 'Client Follow-up'}
                    </span>
                    {selectedEvent.isOverdue && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                        Overdue
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 mt-1">
                    {selectedEvent.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Info Details */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <div>
                  <span className="text-zinc-500 font-medium">Scheduled Date / Deadline</span>
                  <div className="font-bold text-zinc-900 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{selectedEvent.date}</span>
                    {selectedEvent.isToday && (
                      <span className="text-[10px] font-bold text-zinc-900 bg-zinc-200 px-1.5 py-0.2 rounded">
                        Today
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 font-medium">Current Status</span>
                  <div className="font-bold mt-0.5 capitalize flex items-center gap-1.5">
                    {selectedEvent.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className={selectedEvent.status === 'completed' ? 'text-emerald-700' : 'text-zinc-900'}>
                      {selectedEvent.status}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 font-medium">Project Name</span>
                  <div className="font-bold text-zinc-900 mt-0.5 truncate">
                    {selectedEvent.projectName}
                  </div>
                </div>

                <div>
                  <span className="text-zinc-500 font-medium">Client</span>
                  <div className="font-bold text-zinc-900 mt-0.5 truncate">
                    {selectedEvent.clientName || 'N/A'}
                  </div>
                </div>

                {selectedEvent.type === 'follow_up' && selectedEvent.method && (
                  <div>
                    <span className="text-zinc-500 font-medium">Contact Method</span>
                    <div className="font-bold text-zinc-900 mt-0.5">
                      {selectedEvent.method}
                    </div>
                  </div>
                )}

                {selectedEvent.assignedMember && (
                  <div>
                    <span className="text-zinc-500 font-medium">Assigned Lead / Staff</span>
                    <div className="font-bold text-zinc-900 mt-0.5">
                      {selectedEvent.assignedMember.name}
                    </div>
                  </div>
                )}
              </div>

              {selectedEvent.notes && (
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                  <span className="text-zinc-500 font-medium block mb-1">Notes / Description</span>
                  <p className="text-zinc-800 leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
              <button
                onClick={() => handleToggleEventStatus(selectedEvent)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  selectedEvent.status === 'completed'
                    ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200'
                    : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {selectedEvent.status === 'completed' ? 'Mark as Incomplete' : 'Mark as Completed'}
                </span>
              </button>

              <button
                onClick={() => {
                  const pId = selectedEvent.projectId;
                  setSelectedEvent(null);
                  onSelectProject(pId);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <span>Open Project Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Day Multiple Events Popover */}
      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-md w-full p-5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-bold text-zinc-900">
                  Schedule for {selectedDayEvents.date}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 py-1">
              {selectedDayEvents.events.map((ev) => {
                const isTask = ev.type === 'task';
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEvent(ev);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer space-y-1 ${
                      isTask
                        ? 'bg-sky-50/70 border-sky-200 hover:border-sky-300'
                        : 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-900 truncate pr-2">{ev.title}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                          isTask ? 'bg-sky-100 text-sky-800 border-sky-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isTask ? 'Task' : 'Follow-up'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-600 flex items-center justify-between">
                      <span className="truncate">{ev.projectName}</span>
                      <span className="capitalize font-medium text-zinc-500">{ev.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-200 flex items-center justify-end">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
