import React, { useState, useEffect } from 'react';
import { X, CheckSquare } from 'lucide-react';
import type { Priority, TaskStatus, TeamMember, Task, Project } from '../../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  projectId?: string;
  projects?: Project[];
  team: TeamMember[];
  initialData?: Task | null;
  defaultDueDate?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectId: defaultProjectId,
  projects = [],
  team,
  initialData,
  defaultDueDate,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState(
    initialData?.project_id || defaultProjectId || (projects[0]?.id || '')
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(team[0]?.id || '');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState(defaultDueDate || new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setSelectedProjectId(initialData.project_id);
        setTitle(initialData.title);
        setDescription(initialData.description || '');
        setAssignedTo(initialData.assigned_to || team[0]?.id || '');
        setPriority(initialData.priority);
        setDueDate(initialData.due_date);
        setStatus(initialData.status);
      } else {
        setSelectedProjectId(defaultProjectId || (projects[0]?.id || ''));
        setTitle('');
        setDescription('');
        setAssignedTo(team[0]?.id || '');
        setPriority('medium');
        setDueDate(defaultDueDate || new Date().toISOString().slice(0, 10));
        setStatus('pending');
      }
      setError(null);
      setSaving(false);
    }
  }, [isOpen, initialData, defaultProjectId, projects, team, defaultDueDate]);

  if (!isOpen) return null;

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError('Please select a project');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }
    if (!dueDate) {
      setError('Please set a due date');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        project_id: selectedProjectId,
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo || undefined,
        priority,
        due_date: dueDate,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div
        id="task-modal-dialog"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                {isEditing ? 'Edit Task' : 'Add Project Task'}
              </h2>
              <p className="text-[11px] text-zinc-500">
                {isEditing ? 'Modify task deadline or details' : 'Set actionable deliverable and deadline'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 p-1.5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Project selection if multiple projects or not locked */}
          {defaultProjectId && !projects.length ? null : (
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Project *</label>
              {defaultProjectId && currentProject ? (
                <div className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-medium">
                  {currentProject.project_name} {currentProject.client?.name ? `(${currentProject.client.name})` : ''}
                </div>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 bg-white"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.client?.name || 'Client'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Task Title *</label>
            <input
              id="task-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Final BOQ submission / Site measurement"
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Description</label>
            <textarea
              id="task-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Specific details, vendor references, or drawing sheets needed..."
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Assigned To</label>
              <select
                id="task-assignee-select"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 bg-white"
              >
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.designation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Due Date *</label>
              <input
                id="task-due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Priority</label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Status</label>
              <select
                id="task-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 bg-white"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-task-btn"
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
