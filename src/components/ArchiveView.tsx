import React, { useState } from 'react';
import {
  Archive,
  RotateCcw,
  Trash2,
  Eye,
  Search,
  Building,
  User,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import type { Project, TeamMember, Client } from '../types';
import { PriorityBadge, StatusBadge } from './Badges';

interface ArchiveViewProps {
  projects: Project[];
  team?: TeamMember[];
  clients?: Client[];
  onSelectProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => Promise<void>;
  onDeleteProject: (projectId: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  projects,
  onSelectProject,
  onRestoreProject,
  onDeleteProject,
}) => {
  const [search, setSearch] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const archivedProjects = projects.filter((p) => p.is_archived);

  const filtered = archivedProjects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.project_name.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.client?.name.toLowerCase().includes(q) ||
      p.client?.company?.toLowerCase().includes(q) ||
      p.project_lead?.name.toLowerCase().includes(q) ||
      p.project_type?.toLowerCase().includes(q)
    );
  });

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      await onRestoreProject(id);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div id="archive-view-container" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-zinc-400">
            Historical Records
          </div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mt-0.5 flex items-center gap-2">
            <Archive className="w-6 h-6 text-zinc-700" />
            <span>Project Archive</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Archived and completed projects kept securely with all tasks, notes, and activity history intact.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-bold px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200">
            {archivedProjects.length} Archived Project{archivedProjects.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      {archivedProjects.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search archived projects by title, client, or lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
          />
        </div>
      )}

      {/* Content */}
      {filtered.length > 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="divide-y divide-zinc-200">
            {filtered.map((project) => (
              <div
                key={project.id}
                id={`archived-project-${project.id}`}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/70 transition"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      onClick={() => onSelectProject(project.id)}
                      className="text-base font-bold text-zinc-900 hover:text-blue-600 cursor-pointer transition truncate"
                    >
                      {project.project_name}
                    </h3>
                    <PriorityBadge priority={project.priority} size="sm" />
                    <StatusBadge status={project.status} size="sm" />
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase tracking-wider">
                      Archived
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-zinc-400" />
                      <strong className="text-zinc-700">{project.client?.name || 'Client'}</strong>
                      {project.client?.company && <span>({project.client.company})</span>}
                    </span>

                    {project.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{project.location}</span>
                      </span>
                    )}

                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Lead: {project.project_lead?.name || 'Unassigned'}</span>
                    </span>

                    {project.archived_at && (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Archived: {new Date(project.archived_at).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSelectProject(project.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                    title="View Project Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <button
                    onClick={() => handleRestore(project.id)}
                    disabled={restoringId === project.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg transition cursor-pointer"
                    title="Restore to Active Projects"
                  >
                    {restoringId === project.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => onDeleteProject(project.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Permanently Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center max-w-lg mx-auto shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto mb-3">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900">
            {search ? 'No matching archived projects' : 'Project Archive is Empty'}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {search
              ? 'Try adjusting your search terms to find archived projects.'
              : 'You can archive completed or inactive projects from their project view. Archiving removes projects from your active dashboard while preserving all deliverables and logs.'}
          </p>
        </div>
      )}
    </div>
  );
};
