import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  CalendarRange,
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  Edit2,
  Calendar,
  Download,
  Building,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  ExternalLink,
  ChevronRight,
  Clock,
  Loader2,
  Percent,
} from 'lucide-react';
import type { GanttChart, GanttTask, GanttSegment, Project, TeamMember, CompanySettings } from '../types';
import { exportGanttToA3Pdf } from '../utils/ganttPdfExport';

interface GanttChartViewProps {
  charts: GanttChart[];
  projects: Project[];
  team: TeamMember[];
  companySettings?: CompanySettings | null;
  selectedChartId?: string | null;
  onSelectChart?: (chartId: string | null) => void;
  onOpenNewChart: (projectId?: string) => void;
  onEditChart?: (chart: GanttChart) => void;
  onOpenTaskModal: (chart: GanttChart, task?: GanttTask) => void;
  onDeleteChart: (chartId: string) => Promise<void> | void;
  onDeleteTask: (chartId: string, taskId: string) => Promise<void> | void;
  onViewProjectDetail?: (projectId: string) => void;
}

export const GanttChartView: React.FC<GanttChartViewProps> = ({
  charts,
  projects,
  companySettings,
  selectedChartId,
  onSelectChart,
  onOpenNewChart,
  onEditChart,
  onOpenTaskModal,
  onDeleteChart,
  onDeleteTask,
  onViewProjectDetail,
}) => {
  // Navigation mode: 'cards' or 'details'
  // If selectedChartId is provided, show details for that chart. Otherwise, show cards.
  const activeChart = useMemo(() => {
    if (!selectedChartId) return null;
    return charts.find((c) => c.id === selectedChartId || c.project_id === selectedChartId) || null;
  }, [charts, selectedChartId]);

  // States
  const [cardsSearchQuery, setCardsSearchQuery] = useState('');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [previewMode, setPreviewMode] = useState<'days' | 'weeks'>('days');
  const [showCompletion, setShowCompletion] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportNotice, setExportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Synchronized scroll refs: Left task list (no horizontal scrollbar) and right calendar (with horizontal scrollbar)
  const taskListRef = useRef<HTMLDivElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  // Associated Project for active chart
  const currentProject = useMemo(() => {
    if (!activeChart) return null;
    return projects.find((p) => p.id === activeChart.project_id) || null;
  }, [activeChart, projects]);

  // Timeline Days Generation
  const timelineDays = useMemo(() => {
    if (!activeChart || !activeChart.start_date || !activeChart.end_date) return [];

    const start = new Date(activeChart.start_date);
    const end = new Date(activeChart.end_date);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [];
    }

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      dayOfWeek: number; // 0=Sun, 5=Fri
      dayInitial: string;
      isWeekend: boolean;
      monthYear: string;
      monthShort: string;
    }> = [];

    const curr = new Date(start);
    const dayInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    while (curr <= end) {
      const dateStr = curr.toISOString().slice(0, 10);
      const dayOfWeek = curr.getDay();
      days.push({
        dateStr,
        dayNumber: curr.getDate(),
        dayOfWeek,
        dayInitial: dayInitials[dayOfWeek],
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
        monthYear: curr.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthShort: curr.toLocaleDateString('en-US', { month: 'short' }),
      });
      curr.setDate(curr.getDate() + 1);
    }

    return days;
  }, [activeChart]);

  // Group days into months for month header
  const monthHeaders = useMemo(() => {
    if (timelineDays.length === 0) return [];
    const months: Array<{ monthYear: string; daysCount: number }> = [];

    let currentMonth = '';
    let currentCount = 0;

    timelineDays.forEach((day) => {
      if (day.monthYear !== currentMonth) {
        if (currentMonth !== '') {
          months.push({ monthYear: currentMonth, daysCount: currentCount });
        }
        currentMonth = day.monthYear;
        currentCount = 1;
      } else {
        currentCount++;
      }
    });

    if (currentCount > 0) {
      months.push({ monthYear: currentMonth, daysCount: currentCount });
    }

    return months;
  }, [timelineDays]);

  // Weeks list for Weeks preview
  const timelineWeeks = useMemo(() => {
    if (timelineDays.length === 0) return [];
    const weeks: Array<{
      weekNumber: number;
      startDateStr: string;
      endDateStr: string;
      dayStartIndex: number;
      dayEndIndex: number;
      daysCount: number;
    }> = [];

    const totalDays = timelineDays.length;
    const numWeeks = Math.ceil(totalDays / 7);

    for (let w = 0; w < numWeeks; w++) {
      const sIdx = w * 7;
      const eIdx = Math.min(totalDays - 1, sIdx + 6);
      weeks.push({
        weekNumber: w + 1,
        startDateStr: timelineDays[sIdx].dateStr,
        endDateStr: timelineDays[eIdx].dateStr,
        dayStartIndex: sIdx,
        dayEndIndex: eIdx,
        daysCount: eIdx - sIdx + 1,
      });
    }

    return weeks;
  }, [timelineDays]);

  // Today marker calculation
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayIndex = useMemo(() => {
    return timelineDays.findIndex((d) => d.dateStr === todayStr);
  }, [timelineDays, todayStr]);

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!activeChart?.tasks) return [];
    if (!taskSearchQuery.trim()) return activeChart.tasks;
    const q = taskSearchQuery.toLowerCase();
    return activeChart.tasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [activeChart, taskSearchQuery]);

  // Dimensions
  const dayColWidth = 32; // px per day column
  const weekColWidth = 140; // px per week column
  const leftColWidth = 280; // px for tasks column

  const totalTimelineWidth = useMemo(() => {
    if (previewMode === 'days') {
      return Math.max(700, timelineDays.length * dayColWidth);
    } else {
      return Math.max(700, timelineWeeks.length * weekColWidth);
    }
  }, [previewMode, timelineDays.length, timelineWeeks.length]);

  // Scroll synchronization: Keep task rows and calendar rows aligned vertically
  const handleCalendarScroll = () => {
    if (calendarScrollRef.current && taskListRef.current) {
      taskListRef.current.scrollTop = calendarScrollRef.current.scrollTop;
    }
  };

  const handleTaskListWheel = (e: React.WheelEvent) => {
    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollTop += e.deltaY;
    }
  };

  interface ColorStyleResult {
    barClass?: string;
    progressClass?: string;
    textClass?: string;
    barStyle?: React.CSSProperties;
    progressStyle?: React.CSSProperties;
  }

  // Color mapping helper
  const getColorStyles = (color?: string): ColorStyleResult => {
    const defaultColor: ColorStyleResult = {
      barClass: 'bg-indigo-600 border-indigo-700',
      progressClass: 'bg-indigo-800',
      textClass: 'text-indigo-950',
    };

    if (!color) return defaultColor;

    if (color.startsWith('#')) {
      return {
        barClass: '',
        progressClass: '',
        barStyle: { backgroundColor: color, borderColor: color },
        progressStyle: { backgroundColor: 'rgba(0, 0, 0, 0.25)' },
        textClass: 'text-zinc-900',
      };
    }

    const named: Record<string, ColorStyleResult> = {
      indigo: { barClass: 'bg-indigo-600 border-indigo-700', progressClass: 'bg-indigo-800', textClass: 'text-indigo-950' },
      blue: { barClass: 'bg-blue-600 border-blue-700', progressClass: 'bg-blue-800', textClass: 'text-blue-950' },
      sky: { barClass: 'bg-sky-600 border-sky-700', progressClass: 'bg-sky-800', textClass: 'text-sky-950' },
      cyan: { barClass: 'bg-cyan-600 border-cyan-700', progressClass: 'bg-cyan-800', textClass: 'text-cyan-950' },
      teal: { barClass: 'bg-teal-600 border-teal-700', progressClass: 'bg-teal-800', textClass: 'text-teal-950' },
      emerald: { barClass: 'bg-emerald-600 border-emerald-700', progressClass: 'bg-emerald-800', textClass: 'text-emerald-950' },
      lime: { barClass: 'bg-lime-600 border-lime-700', progressClass: 'bg-lime-800', textClass: 'text-lime-950' },
      amber: { barClass: 'bg-amber-600 border-amber-700', progressClass: 'bg-amber-800', textClass: 'text-amber-950' },
      orange: { barClass: 'bg-orange-600 border-orange-700', progressClass: 'bg-orange-800', textClass: 'text-orange-950' },
      red: { barClass: 'bg-rose-600 border-rose-700', progressClass: 'bg-rose-800', textClass: 'text-rose-950' },
      rose: { barClass: 'bg-rose-600 border-rose-700', progressClass: 'bg-rose-800', textClass: 'text-rose-950' },
      fuchsia: { barClass: 'bg-fuchsia-600 border-fuchsia-700', progressClass: 'bg-fuchsia-800', textClass: 'text-fuchsia-950' },
      purple: { barClass: 'bg-purple-600 border-purple-700', progressClass: 'bg-purple-800', textClass: 'text-purple-950' },
      violet: { barClass: 'bg-violet-600 border-violet-700', progressClass: 'bg-violet-800', textClass: 'text-violet-950' },
      slate: { barClass: 'bg-slate-600 border-slate-700', progressClass: 'bg-slate-800', textClass: 'text-slate-950' },
    };

    return named[color.toLowerCase()] || defaultColor;
  };

  // PDF Export Handler with Instant Native Vector Execution & User Feedback
  const handleExportPdf = async () => {
    if (!activeChart) return;
    try {
      setIsExportingPdf(true);
      setExportNotice(null);

      await exportGanttToA3Pdf({
        chart: activeChart,
        project: currentProject,
        tasks: filteredTasks,
        previewMode,
        companySettings,
        showCompletion,
      });

      setExportNotice({
        type: 'success',
        message: 'Gantt schedule PDF exported & downloaded successfully!',
      });
      setTimeout(() => setExportNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to export Gantt PDF:', err);
      setExportNotice({
        type: 'error',
        message: err?.message || 'Failed to export PDF. Please try again.',
      });
      setTimeout(() => setExportNotice(null), 6000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW 1: PROJECTS WITH GANTT CHART CARDS OVERVIEW (When no chart selected)
  // -------------------------------------------------------------
  if (!activeChart) {
    const filteredCharts = charts.filter((c) => {
      if (!cardsSearchQuery.trim()) return true;
      const q = cardsSearchQuery.toLowerCase();
      const proj = projects.find((p) => p.id === c.project_id);
      return (
        c.title.toLowerCase().includes(q) ||
        c.project_name?.toLowerCase().includes(q) ||
        proj?.project_name.toLowerCase().includes(q) ||
        proj?.client?.name.toLowerCase().includes(q)
      );
    });

    // Projects that do not have a Gantt chart yet
    const projectsWithoutGantt = projects.filter(
      (p) => !charts.some((c) => c.project_id === p.id)
    );

    return (
      <div className="space-y-6">
        {/* Top Bar for Gantt Tab */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2.5">
              <CalendarRange className="w-5 h-5 text-amber-500" />
              Project Gantt Schedules
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select a project card to view and manage its interactive timeline and milestone segments
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={cardsSearchQuery}
                onChange={(e) => setCardsSearchQuery(e.target.value)}
                placeholder="Search schedules & projects..."
                className="pl-8 pr-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 w-48 sm:w-64"
              />
            </div>

            {/* Add New Gantt Chart Button */}
            <button
              onClick={() => onOpenNewChart()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New</span>
            </button>
          </div>
        </div>

        {/* Empty State when zero charts exist */}
        {charts.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center shadow-xs">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
              <CalendarRange className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1">No Gantt Charts Yet</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
              Create your first project schedule to track task intervals, milestones, and progress on a timeline.
            </p>
            <button
              onClick={() => onOpenNewChart()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create First Gantt Chart</span>
            </button>
          </div>
        ) : (
          /* Cards Grid of Projects with Gantt Chart */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharts.map((chart) => {
              const proj = projects.find((p) => p.id === chart.project_id);
              const tasks = chart.tasks || [];
              const totalSegments = tasks.reduce((acc, t) => acc + (t.segments?.length || 0), 0);

              // Calculate overall progress from tasks
              const avgProgress =
                tasks.length > 0
                  ? Math.round(
                      tasks.reduce((acc, t) => {
                        const segs = t.segments || [];
                        const tProg =
                          segs.length > 0
                            ? segs.reduce((sAcc, s) => sAcc + (s.progress || 0), 0) / segs.length
                            : 0;
                        return acc + tProg;
                      }, 0) / tasks.length
                    )
                  : 0;

              return (
                <div
                  key={chart.id}
                  onClick={() => onSelectChart && onSelectChart(chart.id)}
                  className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Prominently displayed Gantt Chart Title */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                            Gantt Chart
                          </span>
                          {proj?.project_type && (
                            <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                              {proj.project_type}
                            </span>
                          )}
                        </div>

                        {/* Chart Name prominently featured */}
                        <h2
                          className="text-base sm:text-lg font-black text-zinc-900 group-hover:text-blue-600 transition truncate leading-snug"
                          title={chart.title || proj?.project_name}
                        >
                          {chart.title || proj?.project_name || 'Gantt Schedule'}
                        </h2>

                        {/* Associated Project info */}
                        {proj?.project_name && (
                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mt-1 truncate">
                            <Building className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">Project: {proj.project_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions: Edit & Delete Chart */}
                      <div className="flex items-center gap-1 shrink-0">
                        {onEditChart && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditChart(chart);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit schedule name, dates, duration and notes"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete Gantt chart "${chart.title || proj?.project_name}"?`)) {
                              onDeleteChart(chart.id);
                            }
                          }}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Gantt schedule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Client & Date Info */}
                    <div className="space-y-1.5 text-xs text-zinc-600 mb-4">
                      {proj?.client && (
                        <div className="flex items-center gap-1.5 text-zinc-700 font-medium truncate">
                          <Building className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{proj.client.name || proj.client.company}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>
                          {chart.start_date} &rarr; {chart.end_date}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-3 border-t border-zinc-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-700">Timeline Progress</span>
                        <span className="font-bold text-zinc-900">{avgProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${avgProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-500">
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''} ({totalSegments} segments)
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-zinc-900 group-hover:text-blue-600 transition">
                      View Gantt &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Section: Projects without a schedule yet */}
        {projectsWithoutGantt.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-200">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
              Projects Without a Gantt Schedule ({projectsWithoutGantt.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {projectsWithoutGantt.map((p) => (
                <div
                  key={p.id}
                  className="bg-zinc-50/70 border border-dashed border-zinc-300 rounded-xl p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-xs font-bold text-zinc-800 truncate">{p.project_name}</h3>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {p.client?.name || p.location || 'Active Project'}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenNewChart(p.id)}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 w-full py-1.5 bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Schedule</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: GANTT CHART DETAILS (Prominent Name & Split Layout with Scrollbar on Calendar Portion ONLY)
  // -------------------------------------------------------------
  const chartTitle = activeChart.title || currentProject?.project_name || 'Project Schedule';
  const projectName = currentProject?.project_name || activeChart.project_name || '';
  const totalDays = timelineDays.length;

  return (
    <div className="space-y-4">
      {/* EXPORT STATUS NOTICE */}
      {exportNotice && (
        <div
          className={`px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
            exportNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {exportNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{exportNotice.message}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-zinc-500 hover:text-zinc-800 font-bold ml-4 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* TOP HEADER: Prominently displayed Gantt Chart Title */}
      <div className="bg-white border border-zinc-200 rounded-2xl px-5 py-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Left: Back button & PROMINENT Gantt Chart Title */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={() => onSelectChart && onSelectChart(null)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
            title="Back to All Projects"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Projects</span>
          </button>

          <div className="h-7 w-px bg-zinc-200 hidden sm:block" />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                Gantt Chart Schedule
              </span>
              <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                {activeChart.start_date} &rarr; {activeChart.end_date} ({totalDays} days)
              </span>
            </div>
            {/* Prominent Chart Title */}
            <h1
              className="text-base sm:text-xl font-black text-zinc-900 truncate tracking-tight mt-1"
              title={chartTitle}
            >
              {chartTitle}
            </h1>
            {projectName && (
              <p className="text-xs text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
                <Building className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>
                  Project: <strong className="text-zinc-700 font-semibold">{projectName}</strong>
                </span>
                {currentProject?.client && (
                  <span>• Client: {currentProject.client.company || currentProject.client.name}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right: Preview mode switch (Days/Weeks), Export PDF, + Add Task, Delete */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Days / Weeks Preview Switch */}
          <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-xl p-0.5 text-xs font-bold">
            <button
              onClick={() => setPreviewMode('days')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                previewMode === 'days'
                  ? 'bg-white text-zinc-900 shadow-2xs font-extrabold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Days
            </button>
            <button
              onClick={() => setPreviewMode('weeks')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                previewMode === 'weeks'
                  ? 'bg-white text-zinc-900 shadow-2xs font-extrabold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Weeks
            </button>
          </div>

          {/* Show / Hide Completion % Button */}
          <button
            onClick={() => setShowCompletion((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs ${
              showCompletion
                ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
            title={showCompletion ? 'Hide completion percentage on timeline bars and PDF export' : 'Show completion percentage on timeline bars and PDF export'}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>{showCompletion ? 'Completion: On' : 'Completion: Off'}</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 hover:border-zinc-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="Export Gantt Schedule PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
            ) : (
              <Download className="w-3.5 h-3.5 text-zinc-700" />
            )}
            <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>

          {/* Add Task */}
          <button
            onClick={() => onOpenTaskModal(activeChart)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Task</span>
          </button>

          {/* Edit current chart icon */}
          {onEditChart && (
            <button
              onClick={() => onEditChart(activeChart)}
              className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
              title="Edit schedule name, dates, duration and notes"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {/* Delete current chart */}
          <button
            onClick={() => {
              if (confirm(`Delete Gantt schedule "${chartTitle}"?`)) {
                onDeleteChart(activeChart.id);
                if (onSelectChart) onSelectChart(null);
              }
            }}
            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            title="Delete this Gantt chart"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FILTER STRIP (Search tasks) */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="text-xs text-zinc-500 font-medium">
          Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </span>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={taskSearchQuery}
            onChange={(e) => setTaskSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 w-48 sm:w-60"
          />
        </div>
      </div>

      {/* MAIN GANTT CONTAINER: Split layout with horizontal scrollbar in CALENDAR PORTION ONLY! */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden flex flex-col select-none">
        <div className="flex divide-x divide-zinc-200 relative max-h-[620px]">
          
          {/* ============================================================== */}
          {/* LEFT PORTION: Tasks Column (Fixed horizontally, NO horizontal scrollbar) */}
          {/* ============================================================== */}
          <div
            style={{ width: `${leftColWidth}px` }}
            className="shrink-0 flex flex-col bg-white z-20"
            onWheel={handleTaskListWheel}
          >
            {/* Left Header - Exactly matches right header height (53px) */}
            <div className="h-[53px] bg-zinc-50 border-b border-zinc-200 px-3.5 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Tasks</span>
              <span className="text-[11px] font-semibold text-zinc-500">
                {filteredTasks.length} total
              </span>
            </div>

            {/* Left Task Rows List - Synchronously scrolls vertically with calendar */}
            <div
              ref={taskListRef}
              className="flex-1 overflow-y-hidden divide-y divide-zinc-100"
            >
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  No tasks scheduled. Click <strong>+ Add Task</strong> to begin.
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="h-15 px-3 flex items-center justify-between gap-2 hover:bg-zinc-50 transition group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-zinc-900 truncate" title={task.title}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                          {task.description}
                        </div>
                      )}
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button
                        onClick={() => onOpenTaskModal(activeChart, task)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded cursor-pointer transition"
                        title="Edit Task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete task "${task.title}"?`)) {
                            onDeleteTask(activeChart.id, task.id);
                          }
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-100 rounded cursor-pointer transition"
                        title="Delete Task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT PORTION: Calendar & Timeline (HORIZONTAL SCROLLBAR IS HERE ONLY!) */}
          {/* ============================================================== */}
          <div
            ref={calendarScrollRef}
            onScroll={handleCalendarScroll}
            className="flex-1 overflow-x-auto overflow-y-auto relative min-w-0"
          >
            <div style={{ width: `${totalTimelineWidth}px` }} className="shrink-0 flex flex-col">
              
              {/* --- STICKY TIMELINE HEADER (53px height matching left header) --- */}
              <div className="sticky top-0 z-30 flex flex-col bg-zinc-50 border-b border-zinc-200 shadow-2xs">
                {previewMode === 'days' ? (
                  <div style={{ width: `${totalTimelineWidth}px` }} className="shrink-0 flex flex-col">
                    {/* Month Row (h-6 = 24px) */}
                    <div className="flex border-b border-zinc-200 h-6 text-[11px] font-bold text-zinc-700 divide-x divide-zinc-200 bg-zinc-100/70">
                      {monthHeaders.map((m, idx) => (
                        <div
                          key={`${m.monthYear}-${idx}`}
                          style={{ width: `${m.daysCount * dayColWidth}px` }}
                          className="px-2 flex items-center text-[10px] uppercase font-bold text-zinc-700 tracking-wider truncate"
                        >
                          {m.monthYear}
                        </div>
                      ))}
                    </div>

                    {/* Day Row (h-7 = 28px) */}
                    <div className="flex h-7 text-[10px] font-semibold text-zinc-600 divide-x divide-zinc-200">
                      {timelineDays.map((day) => {
                        const isToday = day.dateStr === todayStr;
                        return (
                          <div
                            key={day.dateStr}
                            style={{ width: `${dayColWidth}px` }}
                            className={`flex flex-col items-center justify-center shrink-0 ${
                              day.isWeekend ? 'bg-zinc-100 text-zinc-600 font-medium' : ''
                            } ${isToday ? 'bg-zinc-900 text-white font-bold' : ''}`}
                            title={`${day.dateStr} (${day.isWeekend ? 'Weekend' : 'Workday'})`}
                          >
                            <span className="leading-none text-[8px] opacity-75">{day.dayInitial}</span>
                            <span className="leading-none font-bold mt-0.5">{day.dayNumber}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Weeks Preview Header (53px height) */
                  <div style={{ width: `${totalTimelineWidth}px` }} className="shrink-0 flex h-[53px] divide-x divide-zinc-200">
                    {timelineWeeks.map((week) => (
                      <div
                        key={week.weekNumber}
                        style={{ width: `${weekColWidth}px` }}
                        className="flex flex-col items-center justify-center p-1 text-center shrink-0 bg-zinc-50"
                      >
                        <span className="text-xs font-bold text-zinc-900">Week {week.weekNumber}</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">
                          {week.startDateStr.slice(5)} - {week.endDateStr.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* --- TIMELINE ROWS & SEGMENT BARS (Each h-15 matching left tasks) --- */}
              <div className="divide-y divide-zinc-100">
                {filteredTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    Select &quot;+ Add Task&quot; above to schedule segments.
                  </div>
                ) : (
                  filteredTasks.map((task) => {
                    const colorStyles = getColorStyles(task.color);
                    const segments = task.segments || [];

                    return (
                      <div
                        key={task.id}
                        className="h-15 relative group hover:bg-zinc-50/50 transition flex items-center"
                      >
                        {/* Background Column Lines & Weekend Tints */}
                        <div className="absolute inset-0 flex divide-x divide-zinc-100 pointer-events-none">
                          {previewMode === 'days'
                            ? timelineDays.map((day) => (
                                <div
                                  key={day.dateStr}
                                  style={{ width: `${dayColWidth}px` }}
                                  className={`h-full shrink-0 ${
                                    day.isWeekend ? 'bg-zinc-100/60' : ''
                                  } ${day.dateStr === todayStr ? 'bg-zinc-100/40' : ''}`}
                                />
                              ))
                            : timelineWeeks.map((w) => (
                                <div
                                  key={w.weekNumber}
                                  style={{ width: `${weekColWidth}px` }}
                                  className="h-full shrink-0 border-r border-zinc-100"
                                />
                              ))}
                        </div>

                        {/* Today Marker Line (In Days view) */}
                        {previewMode === 'days' && todayIndex !== -1 && (
                          <div
                            style={{ left: `${todayIndex * dayColWidth + dayColWidth / 2}px` }}
                            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none opacity-80"
                          />
                        )}

                        {/* TASK SEGMENT BARS */}
                        {segments.map((seg, sIdx) => {
                          const chartStart = new Date(activeChart.start_date);
                          const segStart = new Date(seg.start_date);
                          const segEnd = new Date(seg.end_date);

                          if (isNaN(segStart.getTime()) || isNaN(segEnd.getTime())) return null;

                          const startOffsetDays = Math.max(
                            0,
                            Math.round((segStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24))
                          );
                          const durationDays = Math.max(
                            1,
                            Math.round((segEnd.getTime() - segStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
                          );

                          let leftPx = 0;
                          let widthPx = 0;

                          if (previewMode === 'days') {
                            leftPx = startOffsetDays * dayColWidth;
                            widthPx = Math.max(dayColWidth, durationDays * dayColWidth);
                          } else {
                            leftPx = (startOffsetDays / 7) * weekColWidth;
                            widthPx = Math.max(20, (durationDays / 7) * weekColWidth);
                          }

                          return (
                            <div
                              key={sIdx}
                              onClick={() => onOpenTaskModal(activeChart, task)}
                              style={{
                                left: `${leftPx}px`,
                                width: `${widthPx}px`,
                                ...(colorStyles.barStyle || {}),
                              }}
                              className={`absolute h-8 rounded-lg ${
                                colorStyles.barClass || 'bg-indigo-600'
                              } text-white shadow-xs flex items-center justify-between px-2 text-[11px] font-bold cursor-pointer hover:scale-[1.01] hover:shadow-md transition z-10 overflow-hidden group/bar`}
                              title={`${task.title} (${seg.start_date} to ${seg.end_date}): ${seg.progress}%`}
                            >
                              {/* Inner Progress Fill (only when showCompletion is true) */}
                              {showCompletion && seg.progress > 0 && (
                                <div
                                  style={{
                                    width: `${seg.progress}%`,
                                    ...(colorStyles.progressStyle || {}),
                                  }}
                                  className={`absolute inset-y-0 left-0 ${
                                    colorStyles.progressClass || 'bg-black/20'
                                  } transition-all pointer-events-none`}
                                />
                              )}

                              {/* Label */}
                              <span className="relative z-10 truncate max-w-[80%] font-bold text-[10px]">
                                {widthPx > 70
                                  ? `${seg.start_date.slice(5)} → ${seg.end_date.slice(5)}`
                                  : showCompletion
                                  ? `${seg.progress}%`
                                  : ''}
                              </span>

                              {/* Progress % (only when showCompletion is true) */}
                              {showCompletion && (
                                <span className="relative z-10 text-[10px] font-bold shrink-0">
                                  {seg.progress}%
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
