import React, { useState } from 'react';
import { AlertTriangle, X, UserMinus, FolderKanban } from 'lucide-react';
import type { TeamMember, Project } from '../../types';

interface DeleteTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (memberId: string, reassignToId?: string) => Promise<void>;
  member: TeamMember | null;
  allTeam: TeamMember[];
  projects: Project[];
}

export const DeleteTeamMemberModal: React.FC<DeleteTeamMemberModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  member,
  allTeam,
  projects,
}) => {
  if (!isOpen || !member) return null;

  // Find projects where this member is lead or a team member
  const assignedProjects = projects.filter(
    (p) =>
      !p.is_archived &&
      (p.project_lead_id === member.id || p.team_member_ids?.includes(member.id))
  );

  const hasProjects = assignedProjects.length > 0;

  // Other team members available for reassignment
  const otherMembers = allTeam.filter((m) => m.id !== member.id && m.status !== 'inactive');

  const [reassignToId, setReassignToId] = useState<string>(
    otherMembers[0]?.id || ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (hasProjects && otherMembers.length > 0 && !reassignToId) {
      setError('Please select a team member to reassign projects to');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConfirm(member.id, hasProjects ? reassignToId : undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
      <div
        id="delete-team-member-modal"
        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <UserMinus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Remove Team Member</h2>
              <p className="text-[11px] text-zinc-500">
                {member.name} ({member.designation})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
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

        <div className="p-5 space-y-4 text-xs">
          {hasProjects ? (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Assigned Projects Detected ({assignedProjects.length})</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  <strong>{member.name}</strong> is currently assigned to{' '}
                  {assignedProjects.length} active project
                  {assignedProjects.length > 1 ? 's' : ''}. Who should be assigned his/her
                  projects?
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1 pt-1">
                  {assignedProjects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-white/80 px-2 py-1 rounded text-[11px] text-zinc-800 border border-amber-200/50"
                    >
                      <span className="font-semibold truncate">{p.project_name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
                        {p.project_lead_id === member.id ? 'Lead' : 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {otherMembers.length > 0 ? (
                <div>
                  <label className="block font-semibold text-zinc-800 mb-1.5">
                    Reassign Projects & Tasks To *
                  </label>
                  <select
                    value={reassignToId}
                    onChange={(e) => setReassignToId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white text-zinc-900 focus:outline-none focus:border-zinc-900"
                  >
                    {otherMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.designation}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    All project leadership roles, team assignments, and open tasks will transfer
                    to the selected colleague.
                  </p>
                </div>
              ) : (
                <div className="text-zinc-600 text-xs">
                  No other active team members exist. The projects will have their assignments
                  cleared.
                </div>
              )}
            </>
          ) : (
            <p className="text-zinc-600 leading-relaxed">
              Are you sure you want to remove <strong>{member.name}</strong> ({member.designation})
              from the team directory? This member has no active project assignments.
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-zinc-700 hover:bg-zinc-100 font-semibold rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer flex items-center gap-2 shadow-xs"
            >
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{hasProjects ? 'Reassign & Remove Member' : 'Remove Member'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
