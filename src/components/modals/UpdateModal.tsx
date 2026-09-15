import React, { useState, useEffect } from 'react';
import { X, History } from 'lucide-react';
import type { TeamMember, ActivityType } from '../../types';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  projectId: string;
  team: TeamMember[];
}

const UPDATE_TYPES: ActivityType[] = [
  'General Update',
  'Client Communication',
  'Meeting',
  'Site Visit',
  'Design',
  'Drawing',
  'BOQ',
  'Construction',
  'Payment',
  'Material',
  'Approval',
  'Other',
];

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectId,
  team,
}) => {
  const [updateType, setUpdateType] = useState<ActivityType>('Site Visit');
  const [activityDate, setActivityDate] = useState('2026-09-15');
  const [personId, setPersonId] = useState(team[0]?.id || '');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUpdateType('Site Visit');
      setActivityDate('2026-09-15');
      setPersonId(team[0]?.id || '');
      setDescription('');
      setError(null);
      setSaving(false);
    }
  }, [isOpen, projectId, team]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        project_id: projectId,
        activity_type: updateType,
        activity_date: activityDate,
        team_member_id: personId || undefined,
        description: description.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div
        id="update-modal-dialog"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Add Project Update</h2>
              <p className="text-[11px] text-zinc-500">Append to chronological activity history</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Update Type *</label>
              <select
                id="update-type-select"
                value={updateType}
                onChange={(e) => setUpdateType(e.target.value as ActivityType)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              >
                {UPDATE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Date *</label>
              <input
                id="update-date-input"
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Person / Team Member</label>
            <select
              id="update-person-select"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
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
            <label className="block font-semibold text-zinc-700 mb-1">Description *</label>
            <textarea
              id="update-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="e.g. Client approved revised floor plan and signed off on false ceiling electrical drawing."
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
              id="save-update-btn"
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold shadow transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
