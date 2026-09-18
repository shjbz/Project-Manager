import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CalendarRange,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Building,
  User,
  ExternalLink,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import type { GanttChart, GanttTask, GanttSegment, Project, TeamMember, Priority, TaskStatus } from '../types';

interface GanttChartViewProps {
  charts: GanttChart[];
  projects: Project[];
  team: TeamMember[];
  selectedChartId?: string;
  onSelectChart?: (chartId: string) => void;
  onOpenNewChart: (projectId?: string) => void;
  onOpenTaskModal: (chart: GanttChart, task?: GanttTask) => void;
  onDeleteChart: (chartId: string) => Promise<void> | void;
  onDeleteTask: (chartId: string, taskId: string) => Promise<void> | void;
  onViewProjectDetail?: (projectId: string) => void;
}

export const GanttChartView: React.FC<GanttChartViewProps> = ({
  charts,
  projects,
  team,
  selectedChartId,
  onSelectChart,
  onOpenNewChart,
  onOpenTaskModal,
  onDeleteChart,
  onDeleteTask,
  onViewProjectDetail,
}) => {
  // Current active chart
  const activeChart = useMemo(() => {
    if (selectedChartId) {
      const found = charts.find((c) => c.id === selectedChartId || c.project_id === selectedChartId);
      if (found) return found;
    }
    return charts[0] || null;
  }, [charts, selectedChartId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week'>('day'); // column width
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const taskListScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize vertical scroll between task list and timeline grid
  const handleScrollTimeline = () => {
    if (timelineScrollRef.current && taskListScrollRef.current) {
      taskListScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
    }
  };

  const handleScrollTaskList = () => {
    if (timelineScrollRef.current && taskListScrollRef.current) {
      timelineScrollRef.current.scrollTop = taskListScrollRef.current.scrollTop;
    }
  };

  // Associated Project
  const currentProject = useMemo(() => {
    if (!activeChart) return null;
    return projects.find((p) => p.id === activeChart.project_id) || null;
  }, [activeChart, projects]);

  // Generate calendar days spanning the full chart duration (start_date to end_date)
  const timelineDays = useMemo(() => {
    if (!activeChart || !activeChart.start_date || !activeChart.end_date) return [];

    const start = new Date(activeChart.start_date);
    const end = new Date(activeChart.end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [];
    }

    const days: Array<{
      dateStr: string;
      date: Date;
      dayNumber: number;
      dayOfWeek: number; // 0=Sun, 5=Fri, 6=Sat
      dayInitial: string;
      isWeekend: boolean; // Friday is weekend
      isFirstOfMonth: boolean;
      monthYear: string;
      monthShort: string;
    }> = [];

    const curr = new Date(start);
    // Day names starting Saturday
    const dayInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // standard JS 0=Sun..6=Sat

    while (curr <= end) {
      const dateStr = curr.toISOString().slice(0, 10);
      const dayOfWeek = curr.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat
      const isWeekend = dayOfWeek === 5; // Friday is weekend

      days.push({
        dateStr,
        date: new Date(curr),
        dayNumber: curr.getDate(),
        dayOfWeek,
        dayInitial: dayInitials[dayOfWeek],
        isWeekend,
        isFirstOfMonth: curr.getDate() === 1,
        monthYear: curr.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthShort: curr.toLocaleDateString('en-US', { month: 'short' }),
      });

      curr.setDate(curr.getDate() + 1);
    }

    return days;
  }, [activeChart]);

  // Group days into months for the top month header
  const monthHeaders = useMemo(() => {
    if (timelineDays.length === 0) return [];
    const months: Array<{ monthYear: string; daysCount: number; startIndex: number }> = [];

    let currentMonth = '';
    let currentCount = 0;
    let startIndex = 0;

    timelineDays.forEach((day, index) => {
      if (day.monthYear !== currentMonth) {
        if (currentMonth !== '') {
          months.push({ monthYear: currentMonth, daysCount: currentCount, startIndex });
        }
        currentMonth = day.monthYear;
        currentCount = 1;
        startIndex = index;
      } else {
        currentCount++;
      }
    });

    if (currentCount > 0) {
      months.push({ monthYear: currentMonth, daysCount: currentCount, startIndex });
    }

    return months;
  }, [timelineDays]);

  // Day column width based on zoom
  const dayColWidth = zoomLevel === 'day' ? 38 : 24;

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!activeChart || !activeChart.tasks) return [];
    return activeChart.tasks.filter((task) => {
      const matchesSearch =
        !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.assigned_member?.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [activeChart, searchQuery, statusFilter]);

  // Today string
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayIndex = useMemo(() => {
    return timelineDays.findIndex((d) => d.dateStr === todayStr);
  }, [timelineDays, todayStr]);

  // Scroll to today or start of chart when chart is selected
  useEffect(() => {
    if (timelineScrollRef.current) {
      if (todayIndex > 5) {
        timelineScrollRef.current.scrollLeft = (todayIndex - 3) * dayColWidth;
      } else {
        timelineScrollRef.current.scrollLeft = 0;
      }
    }
  }, [activeChart?.id, todayIndex, dayColWidth]);

  // Color mapping helper
  const getColorStyles = (color?: string) => {
    switch (color) {
      case 'emerald':
        return {
          bar: 'bg-emerald-500 hover:bg-emerald-600 text-white',
          progress: 'bg-emerald-700',
          border: 'border-emerald-600',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'amber':
        return {
          bar: 'bg-amber-500 hover:bg-amber-600 text-white',
          progress: 'bg-amber-700',
          border: 'border-amber-600',
          badge: 'bg-amber-50 text-amber-900 border-amber-200',
        };
      case 'sky':
        return {
          bar: 'bg-sky-500 hover:bg-sky-600 text-white',
          progress: 'bg-sky-700',
          border: 'border-sky-600',
          badge: 'bg-sky-50 text-sky-800 border-sky-200',
        };
      case 'rose':
        return {
          bar: 'bg-rose-500 hover:bg-rose-600 text-white',
          progress: 'bg-rose-700',
          border: 'border-rose-600',
          badge: 'bg-rose-50 text-rose-800 border-rose-200',
        };
      case 'violet':
        return {
          bar: 'bg-violet-500 hover:bg-violet-600 text-white',
          progress: 'bg-violet-700',
          border: 'border-violet-600',
          badge: 'bg-violet-50 text-violet-800 border-violet-200',
        };
      case 'indigo':
      default:
        return {
          bar: 'bg-indigo-600 hover:bg-indigo-700 text-white',
          progress: 'bg-indigo-800',
          border: 'border-indigo-700',
          badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };
    }
  };

  // If no charts exist
  if (charts.length === 0) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center shadow-xs max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mx-auto mb-4">
          <CalendarRange className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">No Gantt Charts Yet</h2>
        <p className="text-sm text-zinc-600 mb-6 max-w-md mx-auto leading-relaxed">
          Create timeline Gantt charts for your projects with multi-segment task scheduling, work intervals, and visual progress tracking across project durations.
        </p>
        <button
          onClick={() => onOpenNewChart()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create First Gantt Chart</span>
        </button>
      </div>
    );
  }

  // Active chart duration metrics
  const totalDays = timelineDays.length;
  const totalTasks = activeChart?.tasks?.length || 0;
  const totalSegments = (activeChart?.tasks || []).reduce((acc, t) => acc + (t.segments?.length || 0), 0);

  return (
    <div className="space-y-4">
      {/* Top Header & Chart Switcher Strip */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Project / Chart Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <CalendarRange className="w-5 h-5 text-amber-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Project Gantt Chart:</span>
                <select
                  value={activeChart?.id || ''}
                  onChange={(e) => onSelectChart && onSelectChart(e.target.value)}
                  className="text-sm font-bold text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 cursor-pointer"
                >
                  {charts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.project_name || c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-600 font-medium">
                {currentProject?.client && (
                  <span className="inline-flex items-center gap-1 text-zinc-700 font-semibold">
                    <Building className="w-3.5 h-3.5 text-zinc-400" />
                    {currentProject.client.company || currentProject.client.name}
                  </span>
                )}
                {activeChart?.start_date && activeChart?.end_date && (
                  <>
                    <span className="text-zinc-300">&bull;</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {activeChart.start_date} to {activeChart.end_date} ({totalDays} days)
                    </span>
                  </>
                )}
                <span className="text-zinc-300">&bull;</span>
                <span>
                  {totalTasks} tasks ({totalSegments} segments)
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Zoom Toggle */}
            <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-0.5 text-xs font-medium">
              <button
                onClick={() => setZoomLevel('day')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  zoomLevel === 'day' ? 'bg-white font-bold text-zinc-950 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Detailed Day Columns"
              >
                Day
              </button>
              <button
                onClick={() => setZoomLevel('week')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  zoomLevel === 'week' ? 'bg-white font-bold text-zinc-950 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
                title="Compact Columns"
              >
                Compact
              </button>
            </div>

            {/* Jump to Today */}
            {todayIndex !== -1 && (
              <button
                onClick={() => {
                  if (timelineScrollRef.current && todayIndex !== -1) {
                    timelineScrollRef.current.scrollLeft = Math.max(0, (todayIndex - 3) * dayColWidth);
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                Today
              </button>
            )}

            {/* View Project Details */}
            {currentProject && onViewProjectDetail && (
              <button
                onClick={() => onViewProjectDetail(currentProject.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Open Project Details"
              >
                <FolderKanban className="w-3.5 h-3.5 text-zinc-500" />
                <span>Project Info</span>
              </button>
            )}

            {/* Add Task */}
            {activeChart && (
              <button
                onClick={() => onOpenTaskModal(activeChart)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Task</span>
              </button>
            )}

            {/* Add New Gantt Chart */}
            <button
              onClick={() => onOpenNewChart()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <CalendarRange className="w-3.5 h-3.5 text-amber-600" />
              <span>+ New Chart</span>
            </button>

            {/* Delete current chart */}
            {activeChart && (
              <button
                onClick={() => {
                  if (confirm(`Delete Gantt chart for "${activeChart.title}"?`)) {
                    onDeleteChart(activeChart.id);
                  }
                }}
                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                title="Delete this Gantt chart"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Task Search & Filter Strip */}
        <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Filter Tasks:</span>
            <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white font-bold text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All ({activeChart?.tasks?.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                  statusFilter === 'in_progress' ? 'bg-white font-bold text-sky-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-white font-bold text-zinc-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-0.5 rounded transition cursor-pointer ${
                  statusFilter === 'completed' ? 'bg-white font-bold text-emerald-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, assignees..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 w-44 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Main Gantt Grid: Synchronized Split-Pane */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        <div className="flex border-b border-zinc-200">
          {/* Left Table Header: Tasks & Leads */}
          <div className="w-[300px] sm:w-[340px] shrink-0 border-r border-zinc-200 bg-zinc-50/90 p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 tracking-tight">Tasks & Segments</span>
            <span className="text-[11px] font-semibold text-zinc-500">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Right Calendar Timeline Header (Month + Days) */}
          <div
            ref={timelineScrollRef}
            onScroll={handleScrollTimeline}
            className="flex-1 overflow-x-auto overflow-y-hidden select-none"
            style={{ scrollBehavior: 'smooth' }}
          >
            <div style={{ width: `${timelineDays.length * dayColWidth}px` }} className="flex flex-col">
              {/* Row 1: Month Headers */}
              <div className="flex border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-700 divide-x divide-zinc-200 h-7">
                {monthHeaders.map((m, idx) => (
                  <div
                    key={`${m.monthYear}-${idx}`}
                    style={{ width: `${m.daysCount * dayColWidth}px` }}
                    className="px-2 flex items-center justify-start text-[11px] font-bold text-zinc-800 uppercase tracking-wider overflow-hidden truncate"
                  >
                    {m.monthYear}
                  </div>
                ))}
              </div>

              {/* Row 2: Day Headers (Sat -> Fri weekend colored, no tag) */}
              <div className="flex bg-zinc-50/50 text-[10px] font-semibold text-zinc-600 divide-x divide-zinc-200 h-8">
                {timelineDays.map((day, idx) => {
                  const isToday = day.dateStr === todayStr;
                  return (
                    <div
                      key={day.dateStr}
                      style={{ width: `${dayColWidth}px` }}
                      className={`flex flex-col items-center justify-center text-center shrink-0 ${
                        day.isWeekend ? 'bg-amber-100/60 text-amber-950 font-bold' : ''
                      } ${isToday ? 'bg-zinc-900 text-white font-bold' : ''}`}
                      title={`${day.dateStr} (${day.isWeekend ? 'Weekend' : 'Workday'})`}
                    >
                      <span className="leading-none text-[9px] opacity-75">{day.dayInitial}</span>
                      <span className="leading-none font-bold mt-0.5">{day.dayNumber}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Task Rows & Timeline Body */}
        <div className="flex max-h-[560px] overflow-y-auto" onScroll={handleScrollTaskList} ref={taskListScrollRef}>
          {/* Left Table Rows */}
          <div className="w-[300px] sm:w-[340px] shrink-0 border-r border-zinc-200 divide-y divide-zinc-100 bg-white">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No tasks match the filter. Click &quot;+ Add Task&quot; above to create one.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const colorTheme = getColorStyles(task.color);
                const assignedPerson = team.find((m) => m.id === task.assigned_to) || task.assigned_member;
                const segCount = task.segments?.length || 0;

                return (
                  <div
                    key={task.id}
                    className="h-16 px-3 flex items-center justify-between gap-2 hover:bg-zinc-50/80 transition group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            task.status === 'completed'
                              ? 'bg-emerald-500'
                              : task.status === 'in_progress'
                              ? 'bg-sky-500'
                              : 'bg-zinc-300'
                          }`}
                        />
                        <h4
                          onClick={() => activeChart && onOpenTaskModal(activeChart, task)}
                          className="text-xs font-bold text-zinc-900 truncate hover:text-zinc-700 cursor-pointer"
                          title={task.title}
                        >
                          {task.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                        {assignedPerson && (
                          <span className="flex items-center gap-1 truncate font-medium text-zinc-700">
                            <User className="w-3 h-3 text-zinc-400 shrink-0" />
                            {assignedPerson.name}
                          </span>
                        )}
                        <span className="text-zinc-300">&bull;</span>
                        <span className="font-semibold text-zinc-600">
                          {segCount} segment{segCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Quick row actions on hover */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                      <button
                        onClick={() => activeChart && onOpenTaskModal(activeChart, task)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition cursor-pointer"
                        title="Edit Task & Segments"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (activeChart && confirm(`Delete task "${task.title}"?`)) {
                            onDeleteTask(activeChart.id, task.id);
                          }
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Add Task Button at bottom of table */}
            {activeChart && (
              <button
                onClick={() => onOpenTaskModal(activeChart)}
                className="w-full h-12 flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition border-t border-dashed border-zinc-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-500" />
                <span>+ Add Task</span>
              </button>
            )}
          </div>

          {/* Right Calendar Grid Rows */}
          <div className="flex-1 overflow-x-hidden">
            <div
              style={{ width: `${timelineDays.length * dayColWidth}px` }}
              className="divide-y divide-zinc-100 relative"
            >
              {filteredTasks.map((task) => {
                const colorTheme = getColorStyles(task.color);
                const segments = task.segments || [];

                return (
                  <div key={task.id} className="h-16 relative flex items-center group">
                    {/* Background Day Columns & Weekend Tints */}
                    <div className="absolute inset-0 flex divide-x divide-zinc-100 pointer-events-none">
                      {timelineDays.map((day) => (
                        <div
                          key={day.dateStr}
                          style={{ width: `${dayColWidth}px` }}
                          className={`h-full shrink-0 ${
                            day.isWeekend ? 'bg-amber-50/40' : ''
                          } ${day.dateStr === todayStr ? 'bg-zinc-100/40' : ''}`}
                        />
                      ))}
                    </div>

                    {/* Today Vertical Line Marker */}
                    {todayIndex !== -1 && (
                      <div
                        style={{ left: `${todayIndex * dayColWidth + dayColWidth / 2}px` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none opacity-80"
                      />
                    )}

                    {/* RENDER TASK SEGMENTS */}
                    {segments.map((seg, sIdx) => {
                      // Find start and end day index in timeline
                      const sIndex = timelineDays.findIndex((d) => d.dateStr === seg.start_date);
                      const eIndex = timelineDays.findIndex((d) => d.dateStr === seg.end_date);

                      if (sIndex === -1 && eIndex === -1) {
                        return null;
                      }

                      // Clamp to timeline range
                      const startIndex = Math.max(0, sIndex === -1 ? 0 : sIndex);
                      const endIndex = Math.min(
                        timelineDays.length - 1,
                        eIndex === -1 ? timelineDays.length - 1 : eIndex
                      );

                      const leftPx = startIndex * dayColWidth + 2;
                      const widthPx = Math.max(dayColWidth - 4, (endIndex - startIndex + 1) * dayColWidth - 4);
                      const progress = seg.progress ?? 0;

                      // Gap connector to next segment
                      const nextSeg = segments[sIdx + 1];
                      let connectorLeft = 0;
                      let connectorWidth = 0;
                      if (nextSeg) {
                        const nextStartIdx = timelineDays.findIndex((d) => d.dateStr === nextSeg.start_date);
                        if (nextStartIdx > endIndex) {
                          connectorLeft = (endIndex + 1) * dayColWidth;
                          connectorWidth = (nextStartIdx - endIndex - 1) * dayColWidth;
                        }
                      }

                      return (
                        <React.Fragment key={seg.id || sIdx}>
                          {/* Segment Bar */}
                          <div
                            style={{
                              left: `${leftPx}px`,
                              width: `${widthPx}px`,
                              top: '12px',
                              height: '40px',
                            }}
                            onClick={() => activeChart && onOpenTaskModal(activeChart, task)}
                            className={`absolute rounded-xl ${colorTheme.bar} shadow-xs flex items-center px-2.5 overflow-hidden cursor-pointer transition transform hover:scale-y-105 z-20 group/seg`}
                            title={`${task.title} - ${seg.name || `Segment ${sIdx + 1}`}\n${seg.start_date} to ${
                              seg.end_date
                            } (${progress}% completed)`}
                          >
                            {/* Inner Progress Fill */}
                            {progress > 0 && (
                              <div
                                style={{ width: `${progress}%` }}
                                className={`absolute left-0 top-0 bottom-0 ${colorTheme.progress} opacity-40`}
                              />
                            )}

                            {/* Label inside the bar */}
                            <div className="relative z-10 flex items-center justify-between w-full text-white text-[11px] font-bold leading-none truncate">
                              <span className="truncate pr-1">
                                {seg.name || task.title}
                              </span>
                              {progress > 0 && (
                                <span className="text-[10px] opacity-90 shrink-0 font-medium">{progress}%</span>
                              )}
                            </div>
                          </div>

                          {/* Gap Connector (for interval between segments) */}
                          {connectorWidth > 0 && (
                            <div
                              style={{
                                left: `${connectorLeft}px`,
                                width: `${connectorWidth}px`,
                                top: '30px',
                              }}
                              className="absolute h-0.5 border-t-2 border-dashed border-zinc-400 z-15 flex items-center justify-center pointer-events-auto group/gap"
                              title={`Interval / Scheduled Gap: ${nextSeg.start_date} resumes`}
                            >
                              <span className="opacity-0 group-hover/gap:opacity-100 transition absolute -top-4 text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-white shadow-xs whitespace-nowrap">
                                Gap Interval
                              </span>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}

              {/* Empty placeholder row if tasks list is empty */}
              {filteredTasks.length === 0 && (
                <div className="h-32 flex items-center justify-center text-xs text-zinc-400">
                  Timeline ready for task scheduling
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Legend Bar */}
        <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between text-xs text-zinc-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-zinc-700">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
              <span>Friday Weekend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-zinc-500" />
              <span>Gap Interval between Segments</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-0.5 h-3 bg-rose-500" />
              <span>Today Marker</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500">
            Click any task segment to edit dates, duration, progress, or add new intervals.
          </div>
        </div>
      </div>
    </div>
  );
};
