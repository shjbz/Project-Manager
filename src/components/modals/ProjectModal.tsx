import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Project, Client, TeamMember, Priority, ProjectStatus, ProjectType } from '../../types';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: any) => Promise<void>;
  clients: Client[];
  team: TeamMember[];
  initialData?: Project | null;
  onQuickAddClient?: (clientData: Partial<Client>) => Promise<Client>;
}

const PROJECT_TYPES: ProjectType[] = [
  'Architecture',
  'Interior',
  'Construction',
  'Development',
  'Renovation',
  'Commercial',
  'Residential',
  'Other',
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
  team,
  initialData,
  onQuickAddClient,
}) => {
  const isEditing = Boolean(initialData);

  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<string>('Architecture');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectLeadId, setProjectLeadId] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('standard');
  const [status, setStatus] = useState<ProjectStatus>('active');
  const [startDate, setStartDate] = useState('2026-09-15');
  const [expectedDate, setExpectedDate] = useState('2026-12-31');

  // Initial task & followup for new projects
  const [initialTaskTitle, setInitialTaskTitle] = useState('');
  const [initialTaskDue, setInitialTaskDue] = useState('2026-09-20');
  const [initialTaskAssignee, setInitialTaskAssignee] = useState('');

  // Quick inline add client toggle
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with selected project or start fresh
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setProjectName(initialData.project_name || '');
        setProjectType(initialData.project_type || 'Architecture');
        setLocation(initialData.location || '');
        setDescription(initialData.description || '');
        setClientId(initialData.client_id || (clients[0]?.id || ''));
        setProjectLeadId(initialData.project_lead_id || (team[0]?.id || ''));
        setTeamMemberIds(
          initialData.team_member_ids && initialData.team_member_ids.length > 0
            ? initialData.team_member_ids
            : (team[0] ? [team[0].id] : [])
        );
        setPriority(initialData.priority || 'standard');
        setStatus(initialData.status || 'active');
        setStartDate(initialData.start_date || '2026-09-15');
        setExpectedDate(initialData.expected_completion_date || '2026-12-31');
        setInitialTaskTitle('');
      } else {
        setProjectName('');
        setProjectType('Architecture');
        setLocation('');
        setDescription('');
        setClientId(clients[0]?.id || '');
        setProjectLeadId(team[0]?.id || '');
        setTeamMemberIds(team[0] ? [team[0].id] : []);
        setPriority('standard');
        setStatus('active');
        setStartDate('2026-09-15');
        setExpectedDate('2026-12-31');
        setInitialTaskTitle('');
        setInitialTaskDue('2026-09-20');
        setInitialTaskAssignee('');
      }
      setShowNewClientForm(false);
      setNewClientName('');
      setNewClientCompany('');
      setNewClientPhone('');
      setError(null);
      setSaving(false);
    }
  }, [isOpen, initialData, clients, team]);

  if (!isOpen) return null;

  const handleToggleMember = (id: string) => {
    if (teamMemberIds.includes(id)) {
      if (teamMemberIds.length === 1 && id === projectLeadId) return; // keep at least lead
      setTeamMemberIds(teamMemberIds.filter((m) => m !== id));
    } else {
      setTeamMemberIds([...teamMemberIds, id]);
    }
  };

  const handleQuickAddClient = async () => {
    if (!newClientName || !newClientPhone) {
      setError('Client Name and Phone are required');
      return;
    }
    try {
      if (onQuickAddClient) {
        const created = await onQuickAddClient({
          name: newClientName,
          company: newClientCompany,
          phone: newClientPhone,
          status: 'active',
        });
        setClientId(created.id);
        setShowNewClientForm(false);
        setNewClientName('');
        setNewClientCompany('');
        setNewClientPhone('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add client');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    if (!projectLeadId) {
      setError('Please assign a project lead');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        project_name: projectName.trim(),
        project_type: projectType,
        location: location.trim(),
        description: description.trim(),
        client_id: clientId,
        project_lead_id: projectLeadId,
        team_member_ids: Array.from(new Set([projectLeadId, ...teamMemberIds])),
        priority,
        status,
        start_date: startDate,
        expected_completion_date: expectedDate,
      };

      if (!isEditing && initialTaskTitle.trim()) {
        payload.initial_task = {
          title: initialTaskTitle.trim(),
          due_date: initialTaskDue,
          assigned_to: initialTaskAssignee || projectLeadId,
          priority,
        };
      }

      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="project-modal-dialog"
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden my-8"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/70">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              {isEditing ? `Edit Project: ${initialData?.project_name}` : '+ Create New Project'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Specify project specs, client, lead, assignees, and initial schedule.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              1. Project Information
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Project Name *</label>
              <input
                id="modal-project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Gulshan Residence"
                required
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Project Type</label>
                <select
                  id="modal-project-type"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Location</label>
                <input
                  id="modal-project-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Gulshan 2, Dhaka"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Description</label>
              <textarea
                id="modal-project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Project scope, key deliverables, architectural requirements..."
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>

          {/* Client Selection (Spec #19) */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                2. Client Assignment
              </span>
              <button
                type="button"
                onClick={() => setShowNewClientForm(!showNewClientForm)}
                className="text-xs font-semibold text-zinc-800 hover:text-zinc-950 underline cursor-pointer"
              >
                {showNewClientForm ? 'Cancel New Client' : '+ Add New Client'}
              </button>
            </div>

            {!showNewClientForm ? (
              <div>
                <select
                  id="modal-project-client"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
                >
                  <option value="" disabled>
                    -- Select Existing Client --
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''} — {c.phone}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
                <div className="font-semibold text-zinc-800">Quick Add Client</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Client Name *"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="px-2.5 py-1.5 border border-zinc-300 rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={newClientCompany}
                    onChange={(e) => setNewClientCompany(e.target.value)}
                    className="px-2.5 py-1.5 border border-zinc-300 rounded bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone *"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="px-2.5 py-1.5 border border-zinc-300 rounded bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleQuickAddClient}
                  className="px-3 py-1.5 bg-zinc-800 text-white rounded text-xs font-medium cursor-pointer"
                >
                  Save & Select Client
                </button>
              </div>
            )}
          </div>

          {/* Team Assignment (Spec #22, #23) */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              3. Project Team
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                Project Lead (Primary Responsibility) *
              </label>
              <select
                id="modal-project-lead"
                value={projectLeadId}
                onChange={(e) => {
                  setProjectLeadId(e.target.value);
                  if (!teamMemberIds.includes(e.target.value)) {
                    setTeamMemberIds([...teamMemberIds, e.target.value]);
                  }
                }}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
              >
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                Assigned Team Members
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                {team.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 cursor-pointer text-zinc-800 hover:text-zinc-950 select-none"
                  >
                    <input
                      type="checkbox"
                      checked={teamMemberIds.includes(m.id) || m.id === projectLeadId}
                      disabled={m.id === projectLeadId}
                      onChange={() => handleToggleMember(m.id)}
                      className="rounded text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="truncate">
                      {m.name} {m.id === projectLeadId ? '(Lead)' : ''}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Priority, Status & Dates (Spec #16, #17, #24) */}
          <div className="space-y-3 pt-3 border-t border-zinc-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              4. Status, Priority & Schedule
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Priority *</label>
                <select
                  id="modal-project-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
                >
                  <option value="urgent">Urgent (Immediate attention)</option>
                  <option value="standard">Standard (Normal)</option>
                  <option value="low">Low (Lower priority)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Project Status *</label>
                <select
                  id="modal-project-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:border-zinc-900"
                >
                  <option value="active">Active</option>
                  <option value="follow_up_pending">Follow-up Pending</option>
                  <option value="at_risk">At Risk</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Expected Completion Date
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Initial Next Task (Spec #26) - For new projects */}
          {!isEditing && (
            <div className="space-y-3 pt-3 border-t border-zinc-200">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                5. Immediate Next Task (Optional)
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Prepare revised kitchen layout / Site measurement"
                  value={initialTaskTitle}
                  onChange={(e) => setInitialTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={initialTaskDue}
                    onChange={(e) => setInitialTaskDue(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Assignee</label>
                  <select
                    value={initialTaskAssignee}
                    onChange={(e) => setInitialTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg"
                  >
                    <option value="">Default (Project Lead)</option>
                    {team.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-700 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-project-submit-btn"
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold shadow transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
