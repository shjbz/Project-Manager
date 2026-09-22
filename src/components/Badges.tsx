import React from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { Priority, ProjectStatus, HealthStatus, AutomatedStatusResult } from '../types';
import { getAutomatedProjectStatus, normalizeProjectStatus } from '../types';

export const PriorityBadge: React.FC<{ priority: Priority; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const baseClass = isSm
    ? 'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded'
    : 'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md tracking-wider uppercase';

  switch (priority) {
    case 'urgent':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200/70`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
          Urgent
        </span>
      );
    case 'high':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`${baseClass} bg-rose-50 text-rose-700 border border-rose-200/70`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
          High
        </span>
      );
    case 'standard':
    case 'medium':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`${baseClass} bg-zinc-100 text-zinc-700 border border-zinc-200`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          Standard
        </span>
      );
    case 'low':
      return (
        <span
          id={`priority-badge-${priority}`}
          className={`${baseClass} bg-zinc-50 text-zinc-500 border border-zinc-200/60`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          Low
        </span>
      );
    default:
      return null;
  }
};

/**
 * Manually selected Project Status badge (Active, On Hold, Completed, Cancelled).
 */
export const StatusBadge: React.FC<{ status: ProjectStatus | string; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const baseClass = isSm
    ? 'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded'
    : 'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md';

  const normalized = normalizeProjectStatus(status);

  switch (normalized) {
    case 'active':
      return (
        <span
          id={`status-badge-${normalized}`}
          className={`${baseClass} bg-zinc-900 text-white font-medium`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Active
        </span>
      );
    case 'on_hold':
      return (
        <span
          id={`status-badge-${normalized}`}
          className={`${baseClass} bg-zinc-100 text-zinc-700 border border-zinc-200`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          On Hold
        </span>
      );
    case 'completed':
      return (
        <span
          id={`status-badge-${normalized}`}
          className={`${baseClass} bg-blue-50 text-blue-800 border border-blue-200`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          Completed
        </span>
      );
    case 'cancelled':
      return (
        <span
          id={`status-badge-${normalized}`}
          className={`${baseClass} bg-zinc-100 text-zinc-500 border border-zinc-200 line-through`}
        >
          Cancelled
        </span>
      );
    default:
      return null;
  }
};

/**
 * Minimal but catchy Automated Situation / Health Badge:
 * - Green: On track (Everything Done)
 * - Orange: Work in Progress (Tasks/Follow-up Pending)
 * - Red: Need attention (Overdue Task/Followup)
 */
export const AutomatedStatusBadge: React.FC<{
  project: {
    status?: string;
    expected_completion_date?: string;
    is_overdue?: boolean;
    tasks?: Array<{ status: string; due_date?: string; title?: string }>;
    follow_ups?: Array<{ status?: string; follow_up_date?: string; notes?: string }>;
    next_task?: { status?: string; due_date?: string; title?: string } | null;
    next_follow_up?: { status?: string; follow_up_date?: string; notes?: string } | null;
  };
  size?: 'xs' | 'sm' | 'md';
  showSublabel?: boolean;
  iconOnly?: boolean;
  className?: string;
}> = ({ project, size = 'sm', showSublabel = true, iconOnly = false, className = '' }) => {
  const auto = getAutomatedProjectStatus(project);

  if (iconOnly) {
    if (auto.status === 'on_track') {
      return (
        <span
          id={`auto-situation-circle-${auto.status}`}
          title={`🟢 On track (Everything Done)${auto.reasons.length ? ': ' + auto.reasons.join(', ') : ''}`}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100/90 border border-emerald-300 text-emerald-700 shadow-2xs hover:scale-110 transition cursor-help ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
        </span>
      );
    }
    if (auto.status === 'in_progress') {
      return (
        <span
          id={`auto-situation-circle-${auto.status}`}
          title={`🟠 Work in Progress (Tasks/Follow-up Pending)${auto.reasons.length ? ': ' + auto.reasons.join(', ') : ''}`}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100/90 border border-amber-300 text-amber-800 shadow-2xs hover:scale-110 transition cursor-help ${className}`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
        </span>
      );
    }
    // Need attention: Red
    return (
      <span
        id={`auto-situation-circle-${auto.status}`}
        title={`🔴 Need attention (Overdue Task/Followup)${auto.reasons.length ? ': ' + auto.reasons.join(', ') : ''}`}
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100/90 border border-rose-300 text-rose-700 shadow-2xs animate-pulse hover:scale-110 transition cursor-help ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 stroke-[2.5]" />
      </span>
    );
  }

  if (auto.status === 'on_track') {
    return (
      <span
        id={`auto-situation-badge-${auto.status}`}
        title={`On track: ${auto.reasons.join(', ')}`}
        className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition shadow-2xs ${
          size === 'xs'
            ? 'px-1.5 py-0.5 text-[10px]'
            : size === 'sm'
            ? 'px-2 py-0.5 text-xs'
            : 'px-2.5 py-1 text-xs'
        } bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100/70 ${className}`}
      >
        <CheckCircle2 className={`${size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-600 shrink-0`} />
        <span className="font-semibold text-emerald-900">On track</span>
        {showSublabel && (
          <span className="text-emerald-700/80 text-[11px] font-normal">
            (Everything Done)
          </span>
        )}
      </span>
    );
  }

  if (auto.status === 'in_progress') {
    return (
      <span
        id={`auto-situation-badge-${auto.status}`}
        title={`Work in Progress: ${auto.reasons.join(', ')}`}
        className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition shadow-2xs ${
          size === 'xs'
            ? 'px-1.5 py-0.5 text-[10px]'
            : size === 'sm'
            ? 'px-2 py-0.5 text-xs'
            : 'px-2.5 py-1 text-xs'
        } bg-amber-50 text-amber-900 border-amber-200/90 hover:bg-amber-100/70 ${className}`}
      >
        <Clock className={`${size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-600 shrink-0`} />
        <span className="font-semibold text-amber-950">Work in Progress</span>
        {showSublabel && (
          <span className="text-amber-800/80 text-[11px] font-normal">
            (Tasks/Follow-up Pending)
          </span>
        )}
      </span>
    );
  }

  // Need attention: Overdue items
  return (
    <span
      id={`auto-situation-badge-${auto.status}`}
      title={`Need attention: ${auto.reasons.join(', ')}`}
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition shadow-2xs ${
        size === 'xs'
          ? 'px-1.5 py-0.5 text-[10px]'
          : size === 'sm'
          ? 'px-2 py-0.5 text-xs'
          : 'px-2.5 py-1 text-xs'
      } bg-rose-50 text-rose-900 border-rose-200/90 hover:bg-rose-100/70 ${className}`}
    >
      <AlertTriangle className={`${size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-rose-600 shrink-0 animate-pulse`} />
      <span className="font-semibold text-rose-950">Need attention</span>
      {showSublabel && (
        <span className="text-rose-700/80 text-[11px] font-normal">
          (Overdue Task/Followup)
        </span>
      )}
    </span>
  );
};

export const HealthBadge: React.FC<{ health: HealthStatus }> = ({ health }) => {
  switch (health) {
    case 'on_track':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> On Track
        </span>
      );
    case 'follow_up_needed':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Follow-up Needed
        </span>
      );
    case 'at_risk':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> At Risk
        </span>
      );
    case 'overdue':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> Overdue
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> Completed
        </span>
      );
    default:
      return null;
  }
};
