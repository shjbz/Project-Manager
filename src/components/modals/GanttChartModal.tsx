import React, { useState, useEffect } from 'react';
import { X, CalendarRange, Calendar, AlertCircle, Clock } from 'lucide-react';
import type { Project, GanttChart } from '../../types';

interface GanttChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  initialProjectId?: string;
  chart?: GanttChart | null;
  onSave: (chartData: {
    id?: string;
    project_id: string;
    title: string;
    start_date: string;
    end_date: string;
    notes?: string;
  }) => Promise<void> | void;
}

type DurationUnit = 'days' | 'weeks' | 'months';

// Helper to format Date as YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate end date given start date, duration value, and unit
function calculateEndDate(startDateStr: string, durationVal: number, unit: DurationUnit): string {
  if (!startDateStr || isNaN(durationVal) || durationVal <= 0) return '';
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  if (isNaN(start.getTime())) return '';

  const end = new Date(start);
  if (unit === 'days') {
    end.setDate(end.getDate() + Math.round(durationVal) - 1);
  } else if (unit === 'weeks') {
    end.setDate(end.getDate() + Math.round(durationVal * 7) - 1);
  } else if (unit === 'months') {
    // Add months
    const wholeMonths = Math.floor(durationVal);
    const fractionMonth = durationVal - wholeMonths;
    end.setMonth(end.getMonth() + wholeMonths);
    if (fractionMonth > 0) {
      end.setDate(end.getDate() + Math.round(fractionMonth * 30));
    }
    end.setDate(end.getDate() - 1);
  }
  return formatDate(end);
}

// Calculate duration given start date and end date
function calculateDurationFromDates(startDateStr: string, endDateStr: string, unit: DurationUnit): number {
  if (!startDateStr || !endDateStr) return 0;
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (unit === 'days') {
    return totalDays;
  } else if (unit === 'weeks') {
    return Math.round((totalDays / 7) * 10) / 10;
  } else {
    return Math.round((totalDays / 30.4) * 10) / 10;
  }
}

export const GanttChartModal: React.FC<GanttChartModalProps> = ({
  isOpen,
  onClose,
  projects,
  initialProjectId,
  chart,
  onSave,
}) => {
  const activeProjects = projects.filter((p) => !p.is_archived);

  const [projectId, setProjectId] = useState(chart?.project_id || initialProjectId || activeProjects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationValue, setDurationValue] = useState<number>(60);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('days');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill dates and title from selected project or existing chart on open
  useEffect(() => {
    if (!isOpen) return;

    if (chart) {
      // Editing existing chart
      setProjectId(chart.project_id);
      setTitle(chart.title || '');
      setStartDate(chart.start_date);
      setEndDate(chart.end_date);
      const days = calculateDurationFromDates(chart.start_date, chart.end_date, 'days');
      setDurationValue(days || 60);
      setDurationUnit('days');
      setNotes(chart.notes || '');
    } else {
      // Creating new chart
      const targetProjId = initialProjectId || projectId || activeProjects[0]?.id || '';
      setProjectId(targetProjId);

      const proj = projects.find((p) => p.id === targetProjId);
      if (proj) {
        setTitle(`${proj.project_name} - Master Gantt Chart`);
        const sDate = proj.start_date || formatDate(new Date());
        setStartDate(sDate);

        if (proj.expected_completion_date) {
          setEndDate(proj.expected_completion_date);
          const days = calculateDurationFromDates(sDate, proj.expected_completion_date, 'days');
          setDurationValue(days || 60);
          setDurationUnit('days');
        } else {
          const calculatedEnd = calculateEndDate(sDate, 60, 'days');
          setEndDate(calculatedEnd);
          setDurationValue(60);
          setDurationUnit('days');
        }
        setNotes(proj.description || '');
      } else {
        const today = formatDate(new Date());
        const calculatedEnd = calculateEndDate(today, 60, 'days');
        setTitle('Project Master Gantt Chart');
        setStartDate(today);
        setEndDate(calculatedEnd);
        setDurationValue(60);
        setDurationUnit('days');
      }
    }
    setError('');
  }, [isOpen, initialProjectId, chart]);

  // Handle Project Selection
  const handleProjectSelect = (id: string) => {
    setProjectId(id);
    const proj = projects.find((p) => p.id === id);
    if (proj) {
      setTitle(`${proj.project_name} - Master Gantt Chart`);
      const sDate = proj.start_date || formatDate(new Date());
      setStartDate(sDate);

      if (proj.expected_completion_date) {
        setEndDate(proj.expected_completion_date);
        const d = calculateDurationFromDates(sDate, proj.expected_completion_date, durationUnit);
        setDurationValue(d || 30);
      } else {
        const e = calculateEndDate(sDate, durationValue, durationUnit);
        setEndDate(e);
      }
      if (proj.description) setNotes(proj.description);
    }
  };

  // 1. When Start Date changes: auto-calculate End Date based on current duration
  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (newStart && durationValue > 0) {
      const computedEnd = calculateEndDate(newStart, durationValue, durationUnit);
      if (computedEnd) {
        setEndDate(computedEnd);
      }
    } else if (newStart && endDate && newStart <= endDate) {
      const computedDur = calculateDurationFromDates(newStart, endDate, durationUnit);
      setDurationValue(computedDur);
    }
  };

  // 2. When Duration Value or Unit changes: auto-calculate End Date
  const handleDurationValueChange = (newVal: number) => {
    setDurationValue(newVal);
    if (startDate && newVal > 0) {
      const computedEnd = calculateEndDate(startDate, newVal, durationUnit);
      if (computedEnd) {
        setEndDate(computedEnd);
      }
    }
  };

  const handleDurationUnitChange = (newUnit: DurationUnit) => {
    setDurationUnit(newUnit);
    if (startDate && endDate) {
      // Recalculate duration number for the new unit
      const newDur = calculateDurationFromDates(startDate, endDate, newUnit);
      setDurationValue(newDur);
    } else if (startDate && durationValue > 0) {
      const computedEnd = calculateEndDate(startDate, durationValue, newUnit);
      if (computedEnd) {
        setEndDate(computedEnd);
      }
    }
  };

  // 3. When End Date changes manually: auto-calculate duration
  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (startDate && newEnd) {
      if (newEnd >= startDate) {
        const computedDur = calculateDurationFromDates(startDate, newEnd, durationUnit);
        setDurationValue(computedDur);
      }
    }
  };

  if (!isOpen) return null;

  // Computed total days for display badge
  const totalDays = startDate && endDate ? calculateDurationFromDates(startDate, endDate, 'days') : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError('Please select a project');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a title for the Gantt chart');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please provide start date and end date');
      return;
    }
    if (startDate > endDate) {
      setError('Start date cannot be after end date');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSave({
        id: chart?.id,
        project_id: projectId,
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save Gantt chart');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="gantt-chart-creation-modal"
        className="bg-white border border-zinc-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <CalendarRange className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 leading-tight">
                {chart ? 'Edit Gantt Chart' : 'Create Gantt Chart'}
              </h2>
              <p className="text-xs text-zinc-500">
                {chart ? 'Update schedule name, dates, duration and details' : 'Timeline & multi-segment schedule for your project'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Select Project <span className="text-rose-500">*</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              required
            >
              <option value="">-- Choose Project --</option>
              {activeProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name} {p.client ? `(${p.client.company || p.client.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Gantt Chart Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Falcon Tower - Master Schedule"
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 font-medium"
              required
            />
          </div>

          {/* Start Date, Duration (days/weeks/months), and End Date */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Schedule Dates & Duration
              </span>
              <span className="text-[11px] text-zinc-500">Auto-calculated</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Start Date */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-2.5 py-2 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                  required
                />
              </div>

              {/* Duration with Unit (Days / Weeks / Months) */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Duration <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={durationValue || ''}
                    onChange={(e) => handleDurationValueChange(parseFloat(e.target.value) || 0)}
                    className="w-1/2 text-xs bg-white border border-zinc-200 rounded-xl px-2.5 py-2 text-zinc-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                    placeholder="Duration"
                    required
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => handleDurationUnitChange(e.target.value as DurationUnit)}
                    className="w-1/2 text-xs bg-white border border-zinc-200 rounded-xl px-1.5 py-2 text-zinc-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-2.5 py-2 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                  required
                />
              </div>
            </div>

            {/* Computed Duration summary pill */}
            {totalDays > 0 && (
              <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-600">
                <span className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3 h-3 text-zinc-400" />
                  Total Timeline Span:
                </span>
                <span className="font-bold text-zinc-900">
                  {totalDays} days (~{(totalDays / 7).toFixed(1)} weeks • {(totalDays / 30.4).toFixed(1)} months)
                </span>
              </div>
            )}
          </div>

          {/* Basic Information / Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Basic Information & Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Scope, key milestones, or work interval guidelines..."
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Saving...' : chart ? 'Save Changes' : 'Create Gantt Chart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
