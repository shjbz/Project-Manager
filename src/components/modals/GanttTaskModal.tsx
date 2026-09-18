import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import type { GanttTask, GanttSegment, GanttChart, TeamMember, Priority, TaskStatus } from '../../types';

interface GanttTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: GanttTask | null;
  chart: GanttChart;
  team: TeamMember[];
  onSave: (taskData: GanttTask) => Promise<void> | void;
}

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', border: 'border-indigo-600', ring: 'ring-indigo-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', border: 'border-emerald-600', ring: 'ring-emerald-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', border: 'border-amber-600', ring: 'ring-amber-500' },
  { id: 'sky', label: 'Sky', bg: 'bg-sky-500', border: 'border-sky-600', ring: 'ring-sky-500' },
  { id: 'violet', label: 'Violet', bg: 'bg-violet-500', border: 'border-violet-600', ring: 'ring-violet-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', border: 'border-rose-600', ring: 'ring-rose-500' },
];

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
  const [segments, setSegments] = useState<GanttSegment[]>([]);
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
      setSegments(
        task.segments && task.segments.length > 0
          ? JSON.parse(JSON.stringify(task.segments))
          : [
              {
                id: `seg-${Date.now()}`,
                name: 'Segment 1',
                start_date: chart.start_date,
                end_date: addDays(chart.start_date, 7),
                progress: 0,
              },
            ]
      );
    } else {
      // New Task default
      setTitle('');
      setDescription('');
      setAssignedTo(team[0]?.id || '');
      setPriority('medium');
      setStatus('pending');
      setColor('indigo');

      // Default: 1 segment of 7 days starting from chart start or today
      const defaultStart = chart.start_date || new Date().toISOString().slice(0, 10);
      setSegments([
        {
          id: `seg-${Date.now()}-1`,
          name: 'Segment 1',
          start_date: defaultStart,
          end_date: addDays(defaultStart, 7),
          progress: 0,
        },
      ]);
    }
    setError('');
  }, [isOpen, task, chart]);

  function addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1];
    let newStart = chart.start_date;
    if (lastSeg && lastSeg.end_date) {
      // Suggest starting 7 days after the last segment ends (a 1-week gap!)
      newStart = addDays(lastSeg.end_date, 7);
    }
    const newEnd = addDays(newStart, 7);

    const newSeg: GanttSegment = {
      id: `seg-${Date.now()}-${segments.length + 1}`,
      name: `Segment ${segments.length + 1} (After Gap)`,
      start_date: newStart,
      end_date: newEnd,
      progress: 0,
    };
    setSegments([...segments, newSeg]);
  };

  const handleRemoveSegment = (index: number) => {
    if (segments.length <= 1) return;
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleSegmentChange = (index: number, field: keyof GanttSegment, val: any) => {
    const updated = [...segments];
    updated[index] = { ...updated[index], [field]: val };
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

      const taskToSave: GanttTask = {
        id: task?.id || `gt-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        priority,
        status,
        color,
        segments,
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

          {/* Row: Assignee, Priority, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                <option value="">Unassigned</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.designation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                <option value="urgent">Urgent</option>
                <option value="standard">Standard</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Color theme */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Timeline Bar Color</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  title={c.label}
                  className={`w-7 h-7 rounded-lg ${c.bg} transition cursor-pointer flex items-center justify-center ${
                    color === c.id ? `ring-2 ring-offset-2 ${c.ring} scale-110 shadow-xs` : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {color === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* MULTI-SEGMENT BUILDER */}
          <div className="pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between mb-2.5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  Schedule Segments & Intervals
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Add multiple work segments with gaps (e.g., 1 week now, a gap, then another week).
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

            <div className="space-y-2.5">
              {segments.map((seg, idx) => {
                // calculate duration
                let days = 0;
                if (seg.start_date && seg.end_date) {
                  const s = new Date(seg.start_date);
                  const e = new Date(seg.end_date);
                  days = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                }

                return (
                  <div
                    key={seg.id || idx}
                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={seg.name || ''}
                          onChange={(e) => handleSegmentChange(idx, 'name', e.target.value)}
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

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={seg.start_date}
                          onChange={(e) => handleSegmentChange(idx, 'start_date', e.target.value)}
                          className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-500 mb-1">End Date</label>
                        <input
                          type="date"
                          value={seg.end_date}
                          onChange={(e) => handleSegmentChange(idx, 'end_date', e.target.value)}
                          className="w-full text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500 mb-1">
                          <span>Progress</span>
                          <span>{seg.progress ?? 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={seg.progress ?? 0}
                          onChange={(e) => handleSegmentChange(idx, 'progress', parseInt(e.target.value) || 0)}
                          className="w-full accent-zinc-900 cursor-pointer"
                        />
                      </div>
                    </div>

                    {days > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                        <span>
                          Duration: <strong className="text-zinc-800">{days} days</strong> (~{(days / 7).toFixed(1)} wks)
                        </span>
                        {idx > 0 && segments[idx - 1]?.end_date && seg.start_date && (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold text-[10px]">
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
