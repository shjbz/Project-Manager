import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Users2,
  Building,
  Settings,
  Plus,
  CalendarCheck,
  Search,
  Building2,
  LogOut,
} from 'lucide-react';
import type { CompanySettings } from '../types';

export type NavTab = 'dashboard' | 'projects' | 'clients' | 'team' | 'settings';

interface NavigationProps {
  currentTab?: NavTab;
  currentNav?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  onNavigate?: (tab: NavTab) => void;
  company?: Partial<CompanySettings> | null;
  onOpenNewProject?: () => void;
  onOpenNewFollowUp?: () => void;
  onOpenSearch?: () => void;
  onLogout?: () => void;
  urgentCount?: number;
  overdueCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  currentNav,
  onTabChange,
  onNavigate,
  company,
  onOpenNewProject,
  onOpenNewFollowUp,
  onOpenSearch,
  onLogout,
  urgentCount = 0,
  overdueCount = 0,
}) => {
  const activeTab = currentNav || currentTab || 'dashboard';

  const handleNavClick = (tab: NavTab) => {
    if (onTabChange) onTabChange(tab);
    if (onNavigate) onNavigate(tab);
  };

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderKanban className="w-4 h-4" />,
      count: overdueCount > 0 ? overdueCount : undefined,
    },
    { id: 'clients', label: 'Clients', icon: <Building className="w-4 h-4" /> },
    { id: 'team', label: 'Team', icon: <Users2 className="w-4 h-4" /> },
  ];

  const logoSrc = company?.logo_url || company?.company_logo;

  return (
    <aside
      id="main-sidebar"
      className="w-64 bg-zinc-900 text-zinc-300 flex flex-col shrink-0 border-r border-zinc-800 h-screen sticky top-0 overflow-y-auto select-none z-30"
    >
      {/* Brand & Company Logo */}
      <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt={company?.company_name || 'Company Logo'}
            className="w-10 h-10 rounded-lg object-contain bg-zinc-800 border border-zinc-700 p-0.5 shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Building2 className="w-5 h-5 text-zinc-100" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate"
            title={company?.company_name || 'STUDIO ARCHVIBE'}
          >
            {company?.company_name || 'STUDIO ARCHVIBE'}
          </h1>
          <p className="text-sm font-bold text-white tracking-tight leading-tight truncate">
            {company?.tagline || 'Project Command'}
          </p>
        </div>
      </div>

      {/* Quick Action Buttons (Spec #11) */}
      <div className="p-3 space-y-2 border-b border-zinc-800/80">
        <button
          id="sidebar-new-project-btn"
          onClick={() => onOpenNewProject && onOpenNewProject()}
          className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Project</span>
        </button>

        <button
          id="sidebar-new-followup-btn"
          onClick={() => onOpenNewFollowUp && onOpenNewFollowUp()}
          className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer"
        >
          <CalendarCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>+ Follow-up</span>
        </button>
      </div>

      {/* Search trigger button */}
      <div className="px-3 pt-3">
        <button
          id="sidebar-search-btn"
          onClick={() => onOpenSearch && onOpenSearch()}
          className="w-full flex items-center justify-between bg-zinc-950/60 hover:bg-zinc-950 border border-zinc-800 text-zinc-400 px-3 py-2 rounded-lg text-xs transition cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
            <span>Search workspace...</span>
          </div>
          <kbd className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Navigation Links (Spec #38) */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 px-3 py-1">
          Workspace
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-link-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-zinc-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Settings Link & Status (Spec #38) */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <button
          id="nav-link-settings"
          onClick={() => handleNavClick('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-zinc-800 text-white font-semibold'
              : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Company Settings</span>
        </button>

        {onLogout && (
          <button
            id="nav-link-logout"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        )}

        <div className="mt-2 pt-2 border-t border-zinc-800/60 px-3 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Company Workspace</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Workspace Connected" />
        </div>
      </div>
    </aside>
  );
};
