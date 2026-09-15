import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FolderKanban, Building, User, ArrowRight } from 'lucide-react';
import type { Project, Client, TeamMember } from '../types';
import { PriorityBadge, StatusBadge } from './Badges';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  clients: Client[];
  team: TeamMember[];
  onSelectProject: (projectId: string) => void;
  onSelectClient: (clientId: string) => void;
  onSelectTeamMember: (memberId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  projects,
  clients,
  team,
  onSelectProject,
  onSelectClient,
  onSelectTeamMember,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // handled by parent or opened
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingProjects = q
    ? projects.filter(
        (p) =>
          (p.project_name && p.project_name.toLowerCase().includes(q)) ||
          (p.location && p.location.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.client?.name && p.client.name.toLowerCase().includes(q)) ||
          (p.client?.company && p.client.company.toLowerCase().includes(q)) ||
          (p.project_lead?.name && p.project_lead.name.toLowerCase().includes(q))
      )
    : [];

  const matchingClients = q
    ? clients.filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.company && c.company.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.includes(q))
      )
    : [];

  const matchingTeam = q
    ? team.filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.designation && m.designation.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q))
      )
    : [];

  const totalResults = matchingProjects.length + matchingClients.length + matchingTeam.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-zinc-950/60 backdrop-blur-xs">
      <div
        id="global-search-dialog"
        className="w-full max-w-2xl bg-white border border-zinc-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-200 bg-zinc-50/50">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, clients, team members, locations..."
            className="w-full bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-400 hover:text-zinc-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-300">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-4">
          {!q ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              Type to search company projects, clients, and team members across all records.
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No results found for &ldquo;<span className="font-semibold">{query}</span>&rdquo;
            </div>
          ) : (
            <>
              {/* Projects */}
              {matchingProjects.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 px-2 mb-1 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Projects ({matchingProjects.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchingProjects.map((p) => (
                      <div
                        key={p.id}
                        id={`search-res-project-${p.id}`}
                        onClick={() => {
                          onSelectProject(p.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-100 transition cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-zinc-900 group-hover:text-zinc-950">
                              {p.project_name}
                            </span>
                            <span className="text-xs text-zinc-400">· {p.project_type}</span>
                          </div>
                          <div className="text-xs text-zinc-500 truncate mt-0.5">
                            Client: {p.client?.name} {p.client?.company ? `(${p.client.company})` : ''} · Lead: {p.project_lead?.name} · {p.location}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <PriorityBadge priority={p.priority} size="sm" />
                          <StatusBadge status={p.status} size="sm" />
                          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clients */}
              {matchingClients.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 px-2 mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    <span>Clients ({matchingClients.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchingClients.map((c) => (
                      <div
                        key={c.id}
                        id={`search-res-client-${c.id}`}
                        onClick={() => {
                          onSelectClient(c.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-100 transition cursor-pointer group"
                      >
                        <div>
                          <div className="font-semibold text-sm text-zinc-900">
                            {c.name} {c.company && <span className="font-normal text-zinc-500">· {c.company}</span>}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {c.phone} {c.email ? `· ${c.email}` : ''}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              {matchingTeam.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 px-2 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Team Members ({matchingTeam.length})</span>
                  </div>
                  <div className="space-y-1">
                    {matchingTeam.map((m) => (
                      <div
                        key={m.id}
                        id={`search-res-member-${m.id}`}
                        onClick={() => {
                          onSelectTeamMember(m.id);
                          onClose();
                        }}
                        className="flex items-center justify-between p-2.5 rounded-lg hover:bg-zinc-100 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          {m.avatar ? (
                            <img
                              src={m.avatar}
                              alt={m.name}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-zinc-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-bold">
                              {m.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-sm text-zinc-900">{m.name}</div>
                            <div className="text-xs text-zinc-500">{m.designation}</div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
