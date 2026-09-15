import React, { useState, useEffect } from 'react';
import { X, CalendarCheck } from 'lucide-react';
import type { Project, TeamMember, FollowUpMethod } from '../../types';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  projects: Project[];
  team: TeamMember[];
  defaultProjectId?: string;
}

const METHODS: FollowUpMethod[] = ['Phone', 'WhatsApp', 'Email', 'Meeting', 'Site Visit', 'Other'];

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projects,
  team,
  defaultProjectId,
}) => {
  const [projectId, setProjectId] = useState(defaultProjectId || (projects[0]?.id || ''));
  const [followUpDate, setFollowUpDate] = useState('2026-09-17');
  const [method, setMethod] = useState<FollowUpMethod>('Phone');
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState(team[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset fields to blank and auto-select project on open
  useEffect(() => {
    if (isOpen) {
      setProjectId(defaultProjectId || (projects[0]?.id || ''));
      setNotes('');
      setFollowUpDate('2026-09-17');
      setMethod('Phone');
      setCreatedBy(team[0]?.id || '');
      setError(null);
      setSaving(false);
    }
  }, [isOpen, defaultProjectId, projects, team]);

  if (!isOpen) return null;

  const currentProject = projects.find((p) => p.id === projectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError('Please select a project');
      return;
    }
    if (!notes.trim()) {
      setError('Please enter follow-up notes');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        project_id: projectId,
        follow_up_date: followUpDate,
        method,
        notes: notes.trim(),
        created_by: createdBy || undefined,
        status: 'pending',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div
        id="followup-modal-dialog"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Record Follow-up</h2>
              <p className="text-[11px] text-zinc-500">Schedule client contact or log discussion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Project *</label>
            {defaultProjectId && currentProject ? (
              <div className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 font-medium flex items-center justify-between">
                <span>
                  {currentProject.project_name} {currentProject.client?.name ? `(${currentProject.client.name})` : ''}
                </span>
                <span className="text-[10px] bg-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded font-semibold">
                  Inside Project
                </span>
              </div>
            ) : (
              <select
                id="followup-project-select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name} ({p.client?.name || 'Client'})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Follow-up Date *</label>
              <input
                id="followup-date-input"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Method *</label>
              <select
                id="followup-method-select"
                value={method}
                onChange={(e) => setMethod(e.target.value as FollowUpMethod)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Followed Up By</label>
            <select
              id="followup-member-select"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            >
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.designation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Follow-up Note *</label>
            <textarea
              id="followup-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Client requested revised kitchen layout and updated BOQ before Friday meeting."
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
            />
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
              id="save-followup-btn"
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold shadow transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Follow-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
