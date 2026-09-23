import React from 'react';
import { Calendar, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Project } from '../types';
import { getNextPendingTask, getProjectFollowUpStatus, formatRelativeDue } from '../types';
import { PriorityBadge, StatusBadge, AutomatedStatusBadge } from './Badges';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextPendingTask = getNextPendingTask(project);
  const followUpStatus = getProjectFollowUpStatus(project);

  const targetDueDate = nextPendingTask?.due_date || project.expected_completion_date;
  const dueInfo = formatRelativeDue(targetDueDate);

  const isDueOverdue = targetDueDate
    ? targetDueDate < todayStr
    : Boolean(project.is_overdue);

  return (
    <div
      id={`project-card-${project.id}`}
      onClick={onClick}
      className={`bg-white border rounded-xl p-5 hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between group ${
        isDueOverdue ? 'border-rose-300 ring-1 ring-rose-200/60' : 'border-zinc-200/90 hover:border-zinc-300'
      }`}
    >
      <div>
        {/* Top Badges: Priority (Left) & Manually Selected Project Status (Right) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <PriorityBadge priority={project.priority} size="sm" />
          <StatusBadge status={project.status} size="sm" />
        </div>

        {/* Title & Type */}
        <div className="mb-2.5">
          <h3 className="text-base font-bold text-zinc-900 group-hover:text-zinc-950 tracking-tight leading-snug">
            {project.project_name}
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">{project.project_type}</p>
        </div>

        {/* Automated Operational Situation (Green/Orange/Red Minimal Catchy Badge) */}
        <div className="mb-3">
          <AutomatedStatusBadge project={project} size="sm" showSublabel={true} />
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

        {/* Tracking items: Follow-up Status, Next Task & Due */}
        <div className="space-y-2.5 text-xs">
          {/* Follow-up Status: Last and Next */}
          <div className="bg-zinc-50/70 rounded-lg p-2.5 border border-zinc-200/60 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>Follow-up Status:</span>
            </div>
            <div className="text-[11px] space-y-1">
              <div
                className="flex items-baseline gap-1.5 truncate text-zinc-700"
                title={
                  followUpStatus.lastDate
                    ? `Last: ${followUpStatus.lastDate}${followUpStatus.lastDescription ? ` - ${followUpStatus.lastDescription}` : ''}`
                    : 'Last: None'
                }
              >
                <span className="font-bold text-zinc-500 text-[10px] uppercase tracking-wide shrink-0">Last:</span>
                {followUpStatus.lastDate ? (
                  <span className="truncate">
                    <span className="font-semibold text-zinc-900">{followUpStatus.lastDate}</span>
                    {followUpStatus.lastDescription && (
                      <span className="text-zinc-500 font-normal"> - {followUpStatus.lastDescription}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-zinc-400 font-normal">None</span>
                )}
              </div>
              <div
                className="flex items-baseline gap-1.5 truncate text-zinc-700"
                title={
                  followUpStatus.nextDate
                    ? `Next: ${followUpStatus.nextDate}${followUpStatus.nextDescription ? ` - ${followUpStatus.nextDescription}` : ''}`
                    : 'Next: None'
                }
              >
                <span className="font-bold text-zinc-500 text-[10px] uppercase tracking-wide shrink-0">Next:</span>
                {followUpStatus.nextDate ? (
                  <span className="truncate">
                    <span className="font-semibold text-amber-800">{followUpStatus.nextDate}</span>
                    {followUpStatus.nextDescription && (
                      <span className="text-zinc-500 font-normal"> - {followUpStatus.nextDescription}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-zinc-400 font-normal">None</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-between gap-2">
            <span className="text-zinc-600 flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
              <span>Next Task:</span>
            </span>
            <span
              className="font-medium text-zinc-800 text-right truncate"
              title={nextPendingTask?.title || 'No pending tasks'}
            >
              {nextPendingTask?.title || <span className="text-zinc-400 italic">None</span>}
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-600">
            <span className="text-zinc-600 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Due:</span>
            </span>
            <span
              className={`font-semibold truncate text-right text-xs ${
                isDueOverdue ? 'text-rose-600 flex items-center justify-end gap-1 font-bold' : 'text-zinc-800'
              }`}
              title={dueInfo ? `${dueInfo.relativeText} (${dueInfo.dateStr})` : '—'}
            >
              {isDueOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              {dueInfo ? (
                <span>
                  {dueInfo.relativeText} <span className="text-zinc-400 font-normal">({dueInfo.dateStr})</span>
                </span>
              ) : (
                '—'
              )}
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
      </div>
    </div>
  );
};

export const ProjectRow: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextPendingTask = getNextPendingTask(project);
  const followUpStatus = getProjectFollowUpStatus(project);

  const targetDueDate = nextPendingTask?.due_date || project.expected_completion_date;
  const dueInfo = formatRelativeDue(targetDueDate);

  const isDueOverdue = targetDueDate
    ? targetDueDate < todayStr
    : Boolean(project.is_overdue);

  return (
    <tr
      id={`project-row-${project.id}`}
      onClick={onClick}
      className={`border-b border-zinc-200 hover:bg-zinc-50/90 transition cursor-pointer text-xs ${
        isDueOverdue ? 'bg-rose-50/30' : ''
      }`}
    >
      {/* Project name & type */}
      <td className="py-3 px-4">
        <div className="font-semibold text-sm text-zinc-900">{project.project_name}</div>
        <div className="text-[11px] text-zinc-500 font-normal">
          {project.project_type}
          {project.client?.name && (
            <span className="md:hidden text-zinc-400"> · {project.client.name}</span>
          )}
        </div>
      </td>

      {/* Client */}
      <td className="py-3 px-4 font-medium text-zinc-800 hidden md:table-cell">
        <div>{project.client?.name || '—'}</div>
        {project.client?.company && (
          <div className="text-[11px] text-zinc-400 font-normal">{project.client.company}</div>
        )}
      </td>

      {/* Project Lead */}
      <td className="py-3 px-4 text-zinc-700 font-medium hidden sm:table-cell">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          <span>{project.project_lead?.name || '—'}</span>
        </div>
      </td>

      {/* Priority */}
      <td className="py-3 px-4 hidden lg:table-cell">
        <PriorityBadge priority={project.priority} size="sm" />
      </td>

      {/* Project Status (Manually selected) */}
      <td className="py-3 px-4">
        <StatusBadge status={project.status} size="sm" />
      </td>

      {/* Situation (Automated Green/Orange/Red Circle Icon) */}
      <td className="py-3 px-4 text-center whitespace-nowrap">
        <AutomatedStatusBadge project={project} iconOnly={true} />
      </td>

      {/* Follow-up Status: Last and Next */}
      <td className="py-3 px-4 min-w-[200px] max-w-[280px] hidden md:table-cell">
        <div className="text-[11px] leading-snug space-y-0.5">
          <div
            className="flex items-baseline gap-1.5 truncate text-zinc-700"
            title={
              followUpStatus.lastDate
                ? `Last: ${followUpStatus.lastDate}${followUpStatus.lastDescription ? ` - ${followUpStatus.lastDescription}` : ''}`
                : 'Last: None'
            }
          >
            <span className="font-bold text-zinc-500 text-[10px] uppercase tracking-wide shrink-0">Last:</span>
            {followUpStatus.lastDate ? (
              <span className="truncate">
                <span className="font-semibold text-zinc-900">{followUpStatus.lastDate}</span>
                {followUpStatus.lastDescription && (
                  <span className="text-zinc-600 font-normal"> - {followUpStatus.lastDescription}</span>
                )}
              </span>
            ) : (
              <span className="text-zinc-400 font-normal">None</span>
            )}
          </div>
          <div
            className="flex items-baseline gap-1.5 truncate text-zinc-700"
            title={
              followUpStatus.nextDate
                ? `Next: ${followUpStatus.nextDate}${followUpStatus.nextDescription ? ` - ${followUpStatus.nextDescription}` : ''}`
                : 'Next: None'
            }
          >
            <span className="font-bold text-zinc-500 text-[10px] uppercase tracking-wide shrink-0">Next:</span>
            {followUpStatus.nextDate ? (
              <span className="truncate">
                <span className="font-semibold text-amber-800">{followUpStatus.nextDate}</span>
                {followUpStatus.nextDescription && (
                  <span className="text-zinc-600 font-normal"> - {followUpStatus.nextDescription}</span>
                )}
              </span>
            ) : (
              <span className="text-zinc-400 font-normal">None</span>
            )}
          </div>
        </div>
      </td>

      {/* Next Task */}
      <td className="py-3 px-4 text-zinc-800 max-w-xs truncate font-medium hidden lg:table-cell">
        {nextPendingTask?.title || <span className="text-zinc-400 italic">None</span>}
      </td>

      {/* Due Date: Two rows: Relative time (Day/Week/Month) and Date */}
      <td className="py-3 px-4 whitespace-nowrap">
        {dueInfo ? (
          <div className="flex flex-col leading-tight">
            <span
              className={`font-semibold inline-flex items-center gap-1 text-xs ${
                isDueOverdue ? 'text-rose-600 font-bold' : dueInfo.isToday ? 'text-amber-700 font-bold' : 'text-zinc-900'
              }`}
              title={nextPendingTask ? `Next Task: ${nextPendingTask.title || 'Task'} (${dueInfo.dateStr})` : `Target Date: ${dueInfo.dateStr}`}
            >
              {isDueOverdue && <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              <span>{dueInfo.relativeText}</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-medium tracking-tight">
              {dueInfo.dateStr}
            </span>
          </div>
        ) : (
          <span className="text-zinc-400 font-medium italic">
            —
          </span>
        )}
      </td>
    </tr>
  );
};
