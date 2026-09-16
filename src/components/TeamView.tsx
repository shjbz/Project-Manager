import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  FolderKanban,
  CheckSquare,
  Edit2,
  Trash2,
  Briefcase,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import type { TeamMember, Project, Task } from '../types';
import { PriorityBadge, StatusBadge } from './Badges';
import { DeleteTeamMemberModal } from './modals/DeleteTeamMemberModal';

interface TeamViewProps {
  team: TeamMember[];
  projects: Project[];
  onOpenNewMember: () => void;
  onEditMember: (member: TeamMember) => void;
  onDeleteMember: (memberId: string, reassignToId?: string) => Promise<void>;
  onSelectProject: (projectId: string) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  team,
  projects,
  onOpenNewMember,
  onEditMember,
  onDeleteMember,
  onSelectProject,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(team[0]?.id || null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  const filteredTeam = team.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.designation.toLowerCase().includes(q) ||
      (m.email && m.email.toLowerCase().includes(q)) ||
      (m.phone && m.phone.includes(q))
    );
  });

  const activeMember = team.find((m) => m.id === selectedMemberId) || filteredTeam[0];

  // Lead projects vs contributing member projects
  const leadProjects = activeMember
    ? projects.filter((p) => p.project_lead_id === activeMember.id)
    : [];
  const assignedProjects = activeMember
    ? projects.filter(
        (p) =>
          p.project_lead_id !== activeMember.id &&
          (p.team_member_ids?.includes(activeMember.id) ||
            p.team_members?.some((tm) => tm.id === activeMember.id))
      )
    : [];

  const allInvolvedProjects = [...leadProjects, ...assignedProjects];

  // Active tasks for this member
  const pendingTasks: Array<{ task: Task; projectName: string; projectId: string }> = [];
  projects.forEach((p) => {
    p.tasks?.forEach((t) => {
      if (t.assigned_to === activeMember?.id && t.status !== 'completed') {
        pendingTasks.push({ task: t, projectName: p.project_name, projectId: p.id });
      }
    });
  });

  return (
    <div id="team-view-container" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-zinc-400">
            Staff & Workload
          </div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mt-0.5">Team Members</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Company architects, engineers, site supervisors, and project leads.
          </p>
        </div>

        <button
          id="team-add-new-btn"
          onClick={onOpenNewMember}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Team Member</span>
        </button>
      </div>

      {/* Main Split Grid: Left staff directory, Right staff workload & project breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List of staff */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team by name or designation..."
              className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="space-y-2">
            {filteredTeam.map((m) => {
              const isSelected = activeMember?.id === m.id;
              const pCount = projects.filter(
                (p) =>
                  p.project_lead_id === m.id ||
                  p.team_member_ids?.includes(m.id) ||
                  p.team_members?.some((tm) => tm.id === m.id)
              ).length;
              const urgentCount = projects.filter(
                (p) =>
                  (p.project_lead_id === m.id || p.team_member_ids?.includes(m.id)) &&
                  p.priority === 'urgent' &&
                  p.status !== 'completed'
              ).length;

              return (
                <div
                  key={m.id}
                  id={`team-member-card-${m.id}`}
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-zinc-300 shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          isSelected ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        {m.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-sm tracking-tight truncate">{m.name}</div>
                      <div
                        className={`text-xs truncate ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        {m.designation}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {pCount} {pCount === 1 ? 'Project' : 'Projects'}
                    </span>
                    {urgentCount > 0 && (
                      <span className="text-[10px] font-bold text-rose-500">
                        {urgentCount} urgent
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredTeam.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400">
                No team members match the search.
              </div>
            )}
          </div>
        </div>

        {/* Right column: Member Profile & Assigned Projects Breakdown */}
        <div className="lg:col-span-7">
          {activeMember ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 shadow-xs">
              {/* Header profile card */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-5">
                <div className="flex items-start gap-4">
                  {activeMember.avatar ? (
                    <img
                      src={activeMember.avatar}
                      alt={activeMember.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-full object-cover border-2 border-zinc-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xl">
                      {activeMember.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-zinc-950">{activeMember.name}</h2>
                      <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium border border-emerald-200">
                        {activeMember.status === 'active' ? 'Active Staff' : 'Inactive'}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-zinc-600 mt-0.5">
                      {activeMember.designation}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 mt-2">
                      {activeMember.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <a href={`tel:${activeMember.phone}`} className="hover:underline">
                            {activeMember.phone}
                          </a>
                        </div>
                      )}
                      {activeMember.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-400" />
                          <a href={`mailto:${activeMember.email}`} className="hover:underline">
                            {activeMember.email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditMember(activeMember)}
                    className="p-2 text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setMemberToDelete(activeMember)}
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                    title="Delete Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Workload Stats Bar */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-center">
                  <span className="text-[11px] uppercase font-bold text-zinc-400 block">
                    Project Lead
                  </span>
                  <span className="text-xl font-extrabold text-zinc-900 mt-0.5 block">
                    {leadProjects.length}
                  </span>
                </div>
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-center">
                  <span className="text-[11px] uppercase font-bold text-zinc-400 block">
                    Assigned Member
                  </span>
                  <span className="text-xl font-extrabold text-zinc-900 mt-0.5 block">
                    {assignedProjects.length}
                  </span>
                </div>
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-center">
                  <span className="text-[11px] uppercase font-bold text-zinc-400 block">
                    Pending Tasks
                  </span>
                  <span className="text-xl font-extrabold text-zinc-900 mt-0.5 block">
                    {pendingTasks.length}
                  </span>
                </div>
              </div>

              {/* Lead Projects Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-zinc-700" />
                  <span>Leading Projects ({leadProjects.length})</span>
                </h3>

                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                  {leadProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onSelectProject(p.id)}
                      className="p-3.5 hover:bg-zinc-50/80 transition cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs text-zinc-900 group-hover:text-zinc-950 truncate">
                          {p.project_name}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Client: {p.client?.name || '—'} · {p.project_type}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={p.priority} size="sm" />
                        <StatusBadge status={p.status} size="sm" />
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
                      </div>
                    </div>
                  ))}
                  {leadProjects.length === 0 && (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      Not currently assigned as lead on active projects.
                    </div>
                  )}
                </div>
              </div>

              {/* Contributing Member Projects */}
              {assignedProjects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-zinc-700" />
                    <span>Collaborating Projects ({assignedProjects.length})</span>
                  </h3>

                  <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                    {assignedProjects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onSelectProject(p.id)}
                        className="p-3.5 hover:bg-zinc-50/80 transition cursor-pointer flex items-center justify-between gap-4 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-zinc-900 group-hover:text-zinc-950 truncate">
                            {p.project_name}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Lead: {p.project_lead?.name || '—'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={p.status} size="sm" />
                          <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Pending Tasks */}
              {pendingTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-zinc-700" />
                    <span>Assigned Deliverables ({pendingTasks.length})</span>
                  </h3>

                  <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden text-xs">
                    {pendingTasks.map(({ task, projectName, projectId }) => (
                      <div
                        key={task.id}
                        onClick={() => onSelectProject(projectId)}
                        className="p-3 hover:bg-zinc-50/80 transition cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-semibold text-zinc-900">{task.title}</div>
                          <div className="text-[11px] text-zinc-500">
                            Project: {projectName} · Due: {task.due_date}
                          </div>
                        </div>
                        <PriorityBadge priority={task.priority} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 text-xs">
              Select a team member to view their active assignments and workload.
            </div>
          )}
        </div>
      </div>
      <DeleteTeamMemberModal
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={async (memberId, reassignToId) => {
          await onDeleteMember(memberId, reassignToId);
          if (selectedMemberId === memberId) {
            const remaining = team.filter((m) => m.id !== memberId);
            setSelectedMemberId(remaining[0]?.id || null);
          }
          setMemberToDelete(null);
        }}
        member={memberToDelete}
        allTeam={team}
        projects={projects}
      />
    </div>
  );
};
