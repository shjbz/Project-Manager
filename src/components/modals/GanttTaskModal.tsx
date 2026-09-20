import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, AlertCircle, Clock, CheckCircle2, Palette } from 'lucide-react';
import type { GanttTask, GanttSegment, GanttChart, TeamMember, Priority, TaskStatus } from '../../types';

interface GanttTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: GanttTask | null;
  chart: GanttChart;
  team: TeamMember[];
  onSave: (taskData: GanttTask) => Promise<void> | void;
}

type DurationUnit = 'days' | 'weeks' | 'months';

interface SegmentWithDuration extends GanttSegment {
  durationVal: number;
  durationUnit: DurationUnit;
}

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', hex: '#6366f1', ring: 'ring-indigo-500' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-600', hex: '#2563eb', ring: 'ring-blue-600' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500', hex: '#0ea5e9', ring: 'ring-sky-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', hex: '#06b6d4', ring: 'ring-cyan-500' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-500', hex: '#14b8a6', ring: 'ring-teal-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', hex: '#10b981', ring: 'ring-emerald-500' },
  { id: 'lime', label: 'Lime', bg: 'bg-lime-500', hex: '#84cc16', ring: 'ring-lime-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', hex: '#f59e0b', ring: 'ring-amber-500' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500', hex: '#f97316', ring: 'ring-orange-500' },
  { id: 'red', label: 'Red', bg: 'bg-red-500', hex: '#ef4444', ring: 'ring-red-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', hex: '#f43f5e', ring: 'ring-rose-500' },
  { id: 'fuchsia', label: 'Fuchsia', bg: 'bg-fuchsia-500', hex: '#d946ef', ring: 'ring-fuchsia-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', hex: '#a855f7', ring: 'ring-purple-500' },
  { id: 'violet', label: 'Violet', bg: 'bg-violet-500', hex: '#8b5cf6', ring: 'ring-violet-500' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-600', hex: '#475569', ring: 'ring-slate-600' },
];

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

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return dateStr;
  dateObj.setDate(dateObj.getDate() + days);
  return formatDate(dateObj);
}

export const GanttTaskModal: React.FC<GanttTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  chart,
  team,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [color, setColor] = useState('indigo');
  const [customBarLabel, setCustomBarLabel] = useState('');
  const [segments, setSegments] = useState<SegmentWithDuration[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setAssignedTo(task.assigned_to || '');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'pending');
      setColor(task.color || 'indigo');
      setCustomBarLabel(task.custom_bar_label || '');

      const rawSegments = task.segments && task.segments.length > 0 ? task.segments : [];
      if (rawSegments.length > 0) {
        setSegments(
          rawSegments.map((s) => {
            const dur = calculateDurationFromDates(s.start_date, s.end_date, 'days') || 7;
            return {
              ...s,
              bar_label: s.bar_label || '',
              durationVal: dur,
              durationUnit: 'days' as DurationUnit,
            };
          })
        );
      } else {
        const defStart = chart.start_date || formatDate(new Date());
        const defEnd = calculateEndDate(defStart, 7, 'days');
        setSegments([
          {
            id: `seg-${Date.now()}`,
            name: 'Segment 1',
            start_date: defStart,
            end_date: defEnd,
            progress: 0,
            bar_label: '',
            durationVal: 7,
            durationUnit: 'days',
          },
        ]);
      }
    } else {
      // New Task default
      setTitle('');
      setDescription('');
      setAssignedTo(team[0]?.id || '');
      setPriority('medium');
      setStatus('pending');
      setColor('indigo');
      setCustomBarLabel('');

      // Default: 1 segment of 7 days starting from chart start or today
      const defaultStart = chart.start_date || formatDate(new Date());
      const defaultEnd = calculateEndDate(defaultStart, 7, 'days');
      setSegments([
        {
          id: `seg-${Date.now()}-1`,
          name: 'Segment 1',
          start_date: defaultStart,
          end_date: defaultEnd,
          progress: 0,
          bar_label: '',
          durationVal: 7,
          durationUnit: 'days',
        },
      ]);
    }
    setError('');
  }, [isOpen, task, chart]);

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    let newStart = chart.start_date;
    if (lastSeg && lastSeg.end_date) {
      // Suggest starting 1 day or 7 days after the last segment ends
      newStart = addDays(lastSeg.end_date, 1);
    }
    const newEnd = calculateEndDate(newStart, 7, 'days');

    const newSeg: SegmentWithDuration = {
      id: `seg-${Date.now()}-${segments.length + 1}`,
      name: `Segment ${segments.length + 1}`,
      start_date: newStart,
      end_date: newEnd,
      progress: 0,
      bar_label: '',
      durationVal: 7,
      durationUnit: 'days',
    };
    setSegments([...segments, newSeg]);
  };

  const handleRemoveSegment = (index: number) => {
    if (segments.length <= 1) return;
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleSegmentBarLabelChange = (idx: number, label: string) => {
    const updated = [...segments];
    updated[idx].bar_label = label;
    setSegments(updated);
  };

  // 1. Selecting Start Date: automatically calculates and updates End Date
  const handleSegmentStartDateChange = (idx: number, newStart: string) => {
    const updated = [...segments];
    const seg = updated[idx];
    seg.start_date = newStart;

    if (newStart && seg.durationVal > 0) {
      const computedEnd = calculateEndDate(newStart, seg.durationVal, seg.durationUnit);
      if (computedEnd) {
        seg.end_date = computedEnd;
      }
    } else if (newStart && seg.end_date && newStart <= seg.end_date) {
      seg.durationVal = calculateDurationFromDates(newStart, seg.end_date, seg.durationUnit);
    }
    setSegments(updated);
  };

  // 2. Changing Duration Value: automatically calculates and updates End Date
  const handleSegmentDurationValChange = (idx: number, newVal: number) => {
    const updated = [...segments];
    const seg = updated[idx];
    seg.durationVal = newVal;

    if (seg.start_date && newVal > 0) {
      const computedEnd = calculateEndDate(seg.start_date, newVal, seg.durationUnit);
      if (computedEnd) {
        seg.end_date = computedEnd;
      }
    }
    setSegments(updated);
  };

  // 3. Changing Duration Unit: recalculates Duration Value or updates End Date
  const handleSegmentDurationUnitChange = (idx: number, newUnit: DurationUnit) => {
    const updated = [...segments];
    const seg = updated[idx];
    seg.durationUnit = newUnit;

    if (seg.start_date && seg.end_date) {
      const newDur = calculateDurationFromDates(seg.start_date, seg.end_date, newUnit);
      seg.durationVal = newDur;
    } else if (seg.start_date && seg.durationVal > 0) {
      const computedEnd = calculateEndDate(seg.start_date, seg.durationVal, newUnit);
      if (computedEnd) {
        seg.end_date = computedEnd;
      }
    }
    setSegments(updated);
  };

  // 4. Changing End Date: automatically recalculates Duration in selected unit
  const handleSegmentEndDateChange = (idx: number, newEnd: string) => {
    const updated = [...segments];
    const seg = updated[idx];
    seg.end_date = newEnd;

    if (seg.start_date && newEnd) {
      if (newEnd >= seg.start_date) {
        const computedDur = calculateDurationFromDates(seg.start_date, newEnd, seg.durationUnit);
        seg.durationVal = computedDur;
      }
    }
    setSegments(updated);
  };

  const handleSegmentProgressChange = (idx: number, newProgress: number) => {
    const updated = [...segments];
    updated[idx].progress = newProgress;
    setSegments(updated);
  };

  const handleSegmentNameChange = (idx: number, name: string) => {
    const updated = [...segments];
    updated[idx].name = name;
    setSegments(updated);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }
    if (segments.length === 0) {
      setError('At least one schedule segment is required');
      return;
    }

    // Validate segments
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      if (!s.start_date || !s.end_date) {
        setError(`Segment ${i + 1} is missing start or end date`);
        return;
      }
      if (s.start_date > s.end_date) {
        setError(`Segment ${i + 1}: Start date cannot be after end date`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Clean segment models without temporary duration state
      const cleanedSegments: GanttSegment[] = segments.map((s) => ({
        id: s.id,
        name: s.name,
        start_date: s.start_date,
        end_date: s.end_date,
        progress: s.progress,
        bar_label: s.bar_label?.trim() || undefined,
      }));

      const taskToSave: GanttTask = {
        id: task?.id || `gt-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo || '',
        priority: priority || 'medium',
        status: cleanedSegments.every((s) => s.progress === 100)
          ? 'completed'
          : cleanedSegments.some((s) => s.progress > 0)
          ? 'in_progress'
          : 'pending',
        color,
        custom_bar_label: customBarLabel.trim() || undefined,
        segments: cleanedSegments,
        created_at: task?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await onSave(taskToSave);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        id="gantt-task-modal"
        className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div>
            <h2 className="text-base font-bold text-zinc-900 leading-tight">
              {task ? 'Edit Gantt Task' : 'Add Task to Gantt Chart'}
            </h2>
            <p className="text-xs text-zinc-500">
              {chart.title} ({chart.start_date} to {chart.end_date})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Substructure Piling & Shoring"
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Description & Scope</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task details, specifications or milestones..."
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 resize-none"
            />
          </div>

          {/* Color theme */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-700">Task Timeline Color</label>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span>Selected:</span>
                <span
                  className="inline-block w-3.5 h-3.5 rounded-full border border-zinc-300"
                  style={{
                    backgroundColor:
                      COLOR_OPTIONS.find((c) => c.id === color)?.hex || (color.startsWith('#') ? color : '#6366f1'),
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-200">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  title={c.label}
                  className={`w-7 h-7 rounded-lg ${c.bg} transition cursor-pointer flex items-center justify-center ${
                    color === c.id ? `ring-2 ring-offset-2 ${c.ring} scale-110 shadow-xs` : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {color === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}

              {/* Custom Color Picker Swatch */}
              <label
                title="Custom Hex Color"
                className={`relative w-7 h-7 rounded-lg border border-dashed border-zinc-300 hover:border-zinc-500 transition cursor-pointer flex items-center justify-center ${
                  color.startsWith('#') ? 'ring-2 ring-offset-2 ring-zinc-900 scale-110 shadow-xs' : ''
                }`}
                style={color.startsWith('#') ? { backgroundColor: color } : {}}
              >
                <input
                  type="color"
                  value={color.startsWith('#') ? color : '#6366f1'}
                  onChange={(e) => setColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                {!color.startsWith('#') && <Palette className="w-3.5 h-3.5 text-zinc-500 pointer-events-none" />}
                {color.startsWith('#') && <CheckCircle2 className="w-3.5 h-3.5 text-white pointer-events-none" />}
              </label>
            </div>

            {/* Custom Bar Text (Optional) */}
            <div className="mt-3 pt-3 border-t border-zinc-200/60">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700">
                  Timeline Bar Text <span className="text-zinc-400 font-normal">(Optional)</span>
                </label>
                <span className="text-[10px] text-zinc-500 font-medium">Leave blank for clean solid bar with no text</span>
              </div>
              <input
                type="text"
                value={customBarLabel}
                onChange={(e) => setCustomBarLabel(e.target.value)}
                placeholder="e.g. Substructure Works (Leave blank for clean solid bar instead of dates)"
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* SCHEDULE SEGMENTS & DURATION BUILDER */}
          <div className="pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Schedule Segments & Duration
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Select start date and duration to auto-calculate end date, or edit end date to recalculate duration.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSegment}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Add Segment</span>
              </button>
            </div>

            <div className="space-y-3">
              {segments.map((seg, idx) => {
                const totalSegDays =
                  seg.start_date && seg.end_date
                    ? calculateDurationFromDates(seg.start_date, seg.end_date, 'days')
                    : 0;

                return (
                  <div
                    key={seg.id || idx}
                    className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 relative group shadow-2xs"
                  >
                    {/* Segment Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={seg.name || ''}
                          onChange={(e) => handleSegmentNameChange(idx, e.target.value)}
                          placeholder={`Segment ${idx + 1} Name`}
                          className="flex-1 text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>

                      {segments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSegment(idx)}
                          title="Remove Segment"
                          className="p-1 text-zinc-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Controls Grid: Start Date, Duration, End Date, Progress */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
                      {/* 1. Start Date */}
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-600 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={seg.start_date}
                          onChange={(e) => handleSegmentStartDateChange(idx, e.target.value)}
                          className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                          required
                        />
                      </div>

                      {/* 2. Duration Value & Unit with automatic date syncing */}
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-600 mb-1">
                          Duration
                        </label>
                        <div className="flex rounded-lg border border-zinc-200 bg-white overflow-hidden focus-within:ring-1 focus-within:ring-zinc-900">
                          <input
                            type="number"
                            min="1"
                            step={seg.durationUnit === 'days' ? '1' : '0.5'}
                            value={seg.durationVal || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              handleSegmentDurationValChange(idx, isNaN(val) ? 1 : val);
                            }}
                            className="w-16 px-2 py-1.5 text-xs text-zinc-900 border-r border-zinc-200 focus:outline-hidden"
                            placeholder="7"
                          />
                          <select
                            value={seg.durationUnit}
                            onChange={(e) =>
                              handleSegmentDurationUnitChange(idx, e.target.value as DurationUnit)
                            }
                            className="flex-1 px-1.5 py-1.5 text-xs text-zinc-700 bg-zinc-50 border-0 focus:outline-hidden cursor-pointer"
                          >
                            <option value="days">Days</option>
                            <option value="weeks">Weeks</option>
                            <option value="months">Months</option>
                          </select>
                        </div>
                      </div>

                      {/* 3. End Date with automatic duration recalculation */}
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-600 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={seg.end_date}
                          onChange={(e) => handleSegmentEndDateChange(idx, e.target.value)}
                          className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                          required
                        />
                      </div>

                      {/* 4. Completion Progress */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-600 mb-1">
                          <span>Progress</span>
                          <span className="font-bold text-zinc-900">{seg.progress ?? 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={seg.progress ?? 0}
                          onChange={(e) => handleSegmentProgressChange(idx, parseInt(e.target.value) || 0)}
                          className="w-full accent-zinc-900 cursor-pointer h-1.5 mt-2 bg-zinc-200 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Segment Specific Bar Text (Optional) */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-600 mb-1">
                        <span>Segment Bar Text (Optional override)</span>
                        <span className="text-[10px] text-zinc-400 font-normal">Leave blank to use task bar text or keep bar plain</span>
                      </div>
                      <input
                        type="text"
                        value={seg.bar_label || ''}
                        onChange={(e) => handleSegmentBarLabelChange(idx, e.target.value)}
                        placeholder={customBarLabel || 'Leave blank for clean solid bar with no text'}
                        className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 placeholder:text-zinc-400"
                      />
                    </div>

                    {/* Segment Summary Badge */}
                    {totalSegDays > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1.5 border-t border-zinc-200/80">
                        <span className="flex items-center gap-1.5">
                          <span>Duration:</span>
                          <strong className="text-zinc-900 font-bold">{totalSegDays} Days</strong>
                          <span className="text-zinc-400">
                            (~{(totalSegDays / 7).toFixed(1)} wks / ~{(totalSegDays / 30.4).toFixed(1)} mos)
                          </span>
                        </span>

                        {idx > 0 && segments[idx - 1]?.end_date && seg.start_date && (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold text-[10px]">
                            Gap from previous:{' '}
                            {Math.max(
                              0,
                              Math.round(
                                (new Date(seg.start_date).getTime() - new Date(segments[idx - 1].end_date).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            )}{' '}
                            days
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-100">
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
              {isSubmitting ? 'Saving...' : task ? 'Update Task' : 'Add Task to Chart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
