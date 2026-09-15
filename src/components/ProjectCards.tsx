import React from 'react';
import { Calendar, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Project } from '../types';
import { PriorityBadge, StatusBadge, HealthBadge } from './Badges';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const isOverdue = project.is_overdue;

  return (
    <div
      id={`project-card-${project.id}`}
      onClick={onClick}
      className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between group ${
        isOverdue ? 'border-rose-300 ring-1 ring-rose-200/60' : 'border-zinc-200/90 hover:border-zinc-300'
      }`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <PriorityBadge priority={project.priority} size="sm" />
          <StatusBadge status={project.status} size="sm" />
        </div>

        {/* Title & Type */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-zinc-900 group-hover:text-zinc-950 tracking-tight leading-snug">
            {project.project_name}
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">{project.project_type}</p>
        </div>

        {/* Client & Lead info */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-zinc-100 mb-3 bg-zinc-50/50 -mx-5 px-5">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-semibold block">
              Client
            </span>
            <span className="text-zinc-800 font-medium truncate block mt-0.5">
              {project.client?.name || '—'}
            </span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-zinc-600 font-semibold block">
              Project Lead
            </span>
            <span className="text-zinc-800 font-medium truncate block mt-0.5">
              {project.project_lead?.name || '—'}
            </span>
          </div>
        </div>

        {/* Tracking items: Last follow-up & Next task */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-600">
            <span className="text-zinc-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-600" />
              <span>Last Follow-up:</span>
            </span>
            <span className="font-medium text-zinc-800">
              {project.last_follow_up?.follow_up_date || '—'}
            </span>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-zinc-600 flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600" />
              <span>Next Task:</span>
            </span>
            <span className="font-medium text-zinc-800 text-right truncate">
              {project.next_task?.title || 'No pending tasks'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-600 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-600" />
              <span>Due:</span>
            </span>
            <span
              className={`font-semibold ${
                isOverdue ? 'text-rose-600 flex items-center gap-1' : 'text-zinc-700'
              }`}
            >
              {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
              {project.next_task?.due_date || project.expected_completion_date || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Team members list */}
      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
        <div className="truncate pr-2">
          <span className="text-zinc-600 font-medium">Team: </span>
          <span className="text-zinc-700">
            {project.team_members && project.team_members.length > 0
              ? project.team_members.map((m) => m.name.split(' ')[0]).join(' · ')
              : project.project_lead?.name || '—'}
          </span>
        </div>
        {project.health_status && <HealthBadge health={project.health_status} />}
      </div>
    </div>
  );
};

export const ProjectRow: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const isOverdue = project.is_overdue;

  return (
    <tr
      id={`project-row-${project.id}`}
      onClick={onClick}
      className={`border-b border-zinc-200 hover:bg-zinc-50/90 transition cursor-pointer text-xs ${
        isOverdue ? 'bg-rose-50/30' : ''
      }`}
    >
      {/* Project name & type */}
      <td className="py-3 px-4">
        <div className="font-semibold text-sm text-zinc-900">{project.project_name}</div>
        <div className="text-[11px] text-zinc-500 font-normal">{project.project_type}</div>
      </td>

      {/* Client */}
      <td className="py-3 px-4 font-medium text-zinc-800">
        <div>{project.client?.name || '—'}</div>
        {project.client?.company && (
          <div className="text-[11px] text-zinc-400 font-normal">{project.client.company}</div>
        )}
      </td>

      {/* Project Lead */}
      <td className="py-3 px-4 text-zinc-700 font-medium">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span>{project.project_lead?.name || '—'}</span>
        </div>
      </td>

      {/* Priority */}
      <td className="py-3 px-4">
        <PriorityBadge priority={project.priority} size="sm" />
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <StatusBadge status={project.status} size="sm" />
      </td>

      {/* Last Follow-up */}
      <td className="py-3 px-4 text-zinc-600 whitespace-nowrap">
        {project.last_follow_up?.follow_up_date || '—'}
      </td>

      {/* Next Task */}
      <td className="py-3 px-4 text-zinc-800 max-w-xs truncate font-medium">
        {project.next_task?.title || <span className="text-zinc-400 italic">None</span>}
      </td>

      {/* Due Date */}
      <td className="py-3 px-4 whitespace-nowrap">
        <span
          className={`font-semibold ${
            isOverdue ? 'text-rose-600 flex items-center gap-1' : 'text-zinc-700'
          }`}
        >
          {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
          {project.next_task?.due_date || project.expected_completion_date || '—'}
        </span>
      </td>
    </tr>
  );
};
