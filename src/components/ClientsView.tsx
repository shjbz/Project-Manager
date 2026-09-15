import React, { useState } from 'react';
import {
  Building,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  FolderKanban,
  Edit2,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import type { Client, Project } from '../types';
import { PriorityBadge, StatusBadge } from './Badges';

interface ClientsViewProps {
  clients: Client[];
  projects: Project[];
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => Promise<void>;
  onSelectProject: (projectId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  projects,
  onOpenNewClient,
  onEditClient,
  onDeleteClient,
  onSelectProject,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);

  const filteredClients = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const activeClient = clients.find((c) => c.id === selectedClientId) || filteredClients[0];
  const clientProjects = activeClient
    ? projects.filter((p) => p.client_id === activeClient.id)
    : [];

  return (
    <div id="clients-view-container" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-zinc-400">
            Client Directory
          </div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight mt-0.5">Clients</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Accounts, corporate clients, contact records, and full project histories.
          </p>
        </div>

        <button
          id="clients-add-new-btn"
          onClick={onOpenNewClient}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Client</span>
        </button>
      </div>

      {/* Main Split Grid: Left client list, Right client detail & project history */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: List of clients */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients by name, company, phone..."
              className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-400"
            />
          </div>

          <div className="space-y-2">
            {filteredClients.map((c) => {
              const isSelected = activeClient?.id === c.id;
              const count = c.projectCount || projects.filter((p) => p.client_id === c.id).length;
              return (
                <div
                  key={c.id}
                  id={`client-card-item-${c.id}`}
                  onClick={() => setSelectedClientId(c.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                      : 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm tracking-tight">{c.name}</div>
                      {c.company && (
                        <div
                          className={`text-xs mt-0.5 ${
                            isSelected ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          {c.company}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {count} {count === 1 ? 'Project' : 'Projects'}
                    </span>
                  </div>

                  <div
                    className={`mt-3 pt-2 text-xs flex items-center justify-between border-t ${
                      isSelected ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-500'
                    }`}
                  >
                    <span>{c.phone}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
            {filteredClients.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-400">No clients found.</div>
            )}
          </div>
        </div>

        {/* Right column: Active Client Details & Full Project History (Spec #49) */}
        <div className="lg:col-span-7">
          {activeClient ? (
            <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6 shadow-xs">
              {/* Header info */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-950">{activeClient.name}</h2>
                    <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium border border-emerald-200">
                      {activeClient.status === 'active' ? 'Active Account' : 'Inactive'}
                    </span>
                  </div>
                  {activeClient.company && (
                    <div className="text-sm text-zinc-600 font-medium mt-0.5">
                      {activeClient.company}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditClient(activeClient)}
                    className="p-2 text-zinc-600 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete client record "${activeClient.name}"?`)) {
                        onDeleteClient(activeClient.id);
                      }
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-zinc-50 p-4 rounded-xl border border-zinc-200/70">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-700">
                    <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                    <a href={`tel:${activeClient.phone}`} className="font-medium hover:underline">
                      {activeClient.phone}
                    </a>
                  </div>
                  {activeClient.email && (
                    <div className="flex items-center gap-2 text-zinc-700">
                      <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                      <a
                        href={`mailto:${activeClient.email}`}
                        className="font-medium hover:underline"
                      >
                        {activeClient.email}
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  {activeClient.address && (
                    <div className="flex items-start gap-2 text-zinc-700">
                      <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <span>{activeClient.address}</span>
                    </div>
                  )}
                  {activeClient.notes && (
                    <div className="text-[11px] text-zinc-500 italic mt-2">
                      &ldquo;{activeClient.notes}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Client Complete Project History (Spec #49) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-zinc-700" />
                    <span>Project History ({clientProjects.length})</span>
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    Repeat engagement breakdown
                  </span>
                </div>

                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
                  {clientProjects.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => onSelectProject(p.id)}
                      className="p-4 hover:bg-zinc-50/80 transition cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-zinc-900 group-hover:text-zinc-950">
                            {p.project_name}
                          </span>
                          <span className="text-xs text-zinc-500">· {p.project_type}</span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1 flex items-center gap-3">
                          <span>Lead: {p.project_lead?.name || 'Unassigned'}</span>
                          <span>·</span>
                          <span>Start: {p.start_date}</span>
                          {p.next_task && (
                            <>
                              <span>·</span>
                              <span className="truncate">Next: {p.next_task.title}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={p.priority} size="sm" />
                        <StatusBadge status={p.status} size="sm" />
                        <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900" />
                      </div>
                    </div>
                  ))}
                  {clientProjects.length === 0 && (
                    <div className="p-8 text-center text-xs text-zinc-400">
                      No projects currently recorded for this client.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center text-zinc-400 text-xs">
              Select a client to view their contact information and project engagement history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
