import React from 'react';
import type { Priority, ProjectStatus, HealthStatus } from '../types';

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
    case 'standard':
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

export const StatusBadge: React.FC<{ status: ProjectStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const baseClass = isSm
    ? 'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded'
    : 'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md';

  switch (status) {
    case 'active':
      return (
        <span
          id={`status-badge-${status}`}
          className={`${baseClass} bg-emerald-50 text-emerald-800 border border-emerald-200`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
          Active
        </span>
      );
    case 'follow_up_pending':
      return (
        <span
          id={`status-badge-${status}`}
          className={`${baseClass} bg-amber-50 text-amber-800 border border-amber-200`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          Follow-up Pending
        </span>
      );
    case 'at_risk':
      return (
        <span
          id={`status-badge-${status}`}
          className={`${baseClass} bg-orange-50 text-orange-800 border border-orange-200`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
          At Risk
        </span>
      );
    case 'on_hold':
      return (
        <span
          id={`status-badge-${status}`}
          className={`${baseClass} bg-zinc-100 text-zinc-600 border border-zinc-200`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          On Hold
        </span>
      );
    case 'completed':
      return (
        <span
          id={`status-badge-${status}`}
          className={`${baseClass} bg-blue-50 text-blue-800 border border-blue-200`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
          Completed
        </span>
      );
    case 'cancelled':
      return (
        <span
          id={`status-badge-${status}`}
          className={`${baseClass} bg-zinc-100 text-zinc-500 border border-zinc-200 line-through`}
        >
          Cancelled
        </span>
      );
    default:
      return null;
  }
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
