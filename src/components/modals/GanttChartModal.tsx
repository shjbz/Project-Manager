import React, { useState, useEffect } from 'react';
import { X, CalendarRange, Calendar, AlertCircle } from 'lucide-react';
import type { Project, GanttChart } from '../../types';

interface GanttChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  initialProjectId?: string;
  onSave: (chartData: {
    project_id: string;
    title: string;
    start_date: string;
    end_date: string;
    notes?: string;
  }) => Promise<void> | void;
}

export const GanttChartModal: React.FC<GanttChartModalProps> = ({
  isOpen,
  onClose,
  projects,
  initialProjectId,
  onSave,
}) => {
  const activeProjects = projects.filter((p) => !p.is_archived);

  const [projectId, setProjectId] = useState(initialProjectId || activeProjects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill dates and title from selected project
  useEffect(() => {
    if (!isOpen) return;

    const targetProjId = initialProjectId || projectId || activeProjects[0]?.id || '';
    setProjectId(targetProjId);

    const proj = projects.find((p) => p.id === targetProjId);
    if (proj) {
      setTitle(`${proj.project_name} - Master Gantt Chart`);
      setStartDate(proj.start_date || new Date().toISOString().slice(0, 10));
      if (proj.expected_completion_date) {
        setEndDate(proj.expected_completion_date);
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 60);
        setEndDate(d.toISOString().slice(0, 10));
      }
      setNotes(proj.description || '');
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const future = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
      setTitle('Project Master Gantt Chart');
      setStartDate(today);
      setEndDate(future);
    }
    setError('');
  }, [isOpen, initialProjectId]);

  const handleProjectSelect = (id: string) => {
    setProjectId(id);
    const proj = projects.find((p) => p.id === id);
    if (proj) {
      setTitle(`${proj.project_name} - Master Gantt Chart`);
      if (proj.start_date) setStartDate(proj.start_date);
      if (proj.expected_completion_date) setEndDate(proj.expected_completion_date);
      if (proj.description) setNotes(proj.description);
    }
  };

  if (!isOpen) return null;

  // Calculate duration in days
  let durationDays = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = e.getTime() - s.getTime();
    durationDays = Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  }

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
        project_id: projectId,
        title: title.trim(),
        start_date: startDate,
        end_date: endDate,
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create Gantt chart');
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
              <h2 className="text-base font-bold text-zinc-900 leading-tight">Create Gantt Chart</h2>
              <p className="text-xs text-zinc-500">Timeline & multi-segment schedule for your project</p>
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
              placeholder="e.g., Master Construction Timeline"
              className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
              required
            />
          </div>

          {/* Project Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs bg-white border border-zinc-200 rounded-xl px-3 py-2.5 text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
                required
              />
            </div>
          </div>

          {/* Computed Duration Badge */}
          {durationDays > 0 && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-zinc-600 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                Project Duration Span:
              </span>
              <span className="font-bold text-zinc-900">
                {durationDays} days (~{(durationDays / 7).toFixed(1)} weeks)
              </span>
            </div>
          )}

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
              {isSubmitting ? 'Creating...' : 'Create Gantt Chart'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
