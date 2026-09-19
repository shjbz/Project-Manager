import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './api';
import type { Project, TeamMember, Client, DashboardStats, Task, FollowUp, CompanySettings, GanttChart, GanttTask } from './types';
import { AuthGate } from './components/AuthGate';
import { Navigation, NavTab } from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { DashboardView } from './components/DashboardView';
import { ProjectsView } from './components/ProjectsView';
import { CalendarView } from './components/CalendarView';
import { GanttChartView } from './components/GanttChartView';
import { ArchiveView } from './components/ArchiveView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { ClientsView } from './components/ClientsView';
import { TeamView } from './components/TeamView';
import { SettingsView } from './components/SettingsView';

// Modals
import { ProjectModal } from './components/modals/ProjectModal';
import { FollowUpModal } from './components/modals/FollowUpModal';
import { TaskModal } from './components/modals/TaskModal';
import { UpdateModal } from './components/modals/UpdateModal';
import { ClientModal } from './components/modals/ClientModal';
import { TeamModal } from './components/modals/TeamModal';
import { GanttChartModal } from './components/modals/GanttChartModal';
import { GanttTaskModal } from './components/modals/GanttTaskModal';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [company, setCompany] = useState<CompanySettings | null>(null);

  // Navigation State
  const [currentNav, setCurrentNav] = useState<NavTab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Global Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Core Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    followUpPending: 0,
    dueSoon: 0,
    overdue: 0,
    urgentProjects: 0,
    completedThisMonth: 0,
    totalProjects: 0,
    statusBreakdown: {
      onTrack: 0,
      followUpNeeded: 0,
      atRisk: 0,
      overdue: 0,
      completed: 0,
    },
  });
  const [followUpsAttention, setFollowUpsAttention] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);
  const [overdueItems, setOverdueItems] = useState<any[]>([]);
  const [teamWorkload, setTeamWorkload] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Action Modals State
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpTargetProjectId, setFollowUpTargetProjectId] = useState<string | undefined>(undefined);
  const [followUpDefaultDate, setFollowUpDefaultDate] = useState<string | undefined>(undefined);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTargetProjectId, setTaskTargetProjectId] = useState<string | undefined>(undefined);
  const [taskDefaultDate, setTaskDefaultDate] = useState<string | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateTargetProjectId, setUpdateTargetProjectId] = useState<string | undefined>(undefined);

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);

  // Gantt Chart State
  const [ganttCharts, setGanttCharts] = useState<GanttChart[]>([]);
  const [selectedGanttChartId, setSelectedGanttChartId] = useState<string | undefined>(undefined);
  const [ganttChartModalOpen, setGanttChartModalOpen] = useState(false);
  const [ganttChartTargetProjectId, setGanttChartTargetProjectId] = useState<string | undefined>(undefined);
  const [ganttTaskModalOpen, setGanttTaskModalOpen] = useState(false);
  const [ganttTaskModalChart, setGanttTaskModalChart] = useState<GanttChart | null>(null);
  const [editingGanttTask, setEditingGanttTask] = useState<GanttTask | null>(null);

  // 1. Initial Authentication Check
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await api.checkAuth();
        setIsAuthenticated(res.authenticated);
        if (res.company) {
          setCompany(res.company);
        }
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };
    verifyAuth();
  }, []);

  // 2. Fetch all app data
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    try {
      const [
        projectsData,
        teamData,
        clientsData,
        dashData,
        companyData,
        ganttData,
      ] = await Promise.all([
        api.getProjects(),
        api.getTeam(),
        api.getClients(),
        api.getDashboard(),
        api.getCompany().catch(() => null),
        api.getGanttCharts().catch(() => []),
      ]);

      setProjects(projectsData);
      setTeam(teamData);
      setClients(clientsData);
      setGanttCharts(ganttData);
      if (companyData) {
        setCompany(companyData);
      }

      if (dashData && dashData.stats) {
        setStats(dashData.stats);
        setFollowUpsAttention(dashData.followUpsRequiringAttention || []);
        setUpcomingTasks(dashData.upcomingTasks || []);
        setOverdueItems(dashData.overdueItems || []);
        setTeamWorkload(dashData.teamWorkload || []);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [isAuthenticated]);

  // Live computed metrics to ensure Follow-up Required, Upcoming Tasks, Team Workload, and Overdue items
  // are ALWAYS up-to-date in the dashboard whenever any project, task, or follow-up changes.
  const liveFollowUpsAttention = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const list: any[] = [];
    projects.forEach((p) => {
      if (p.is_archived) return;
      const clientName = p.client?.name || clients.find((c) => c.id === p.client_id)?.name || 'Client';
      (p.follow_ups || []).forEach((fu) => {
        if (fu.status === 'completed') return;
        const creator = team.find((m) => m.id === fu.created_by);
        const fDate = fu.follow_up_date || (fu as any).date || '';
        list.push({
          id: fu.id,
          project_id: p.id,
          project_name: p.project_name,
          client_name: clientName,
          follow_up_date: fDate,
          method: fu.method || 'Phone',
          notes: fu.notes || '',
          status: fu.status,
          creator_member: creator,
          is_overdue: fDate ? fDate < todayStr : false,
          is_today: fDate ? fDate === todayStr : false,
        });
      });
    });
    list.sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date));
    return list.length > 0 ? list : followUpsAttention;
  }, [projects, clients, team, followUpsAttention]);

  const liveUpcomingTasks = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const list: any[] = [];
    projects.forEach((p) => {
      if (p.is_archived) return;
      (p.tasks || []).forEach((t) => {
        if (t.status === 'completed') return;
        const member = team.find((m) => m.id === t.assigned_to);
        const dueDate = t.due_date || '';
        list.push({
          id: t.id,
          project_id: p.id,
          project_name: p.project_name,
          title: t.title,
          due_date: dueDate,
          priority: t.priority,
          status: t.status,
          assigned_to: t.assigned_to,
          assigned_member: member,
          is_overdue: dueDate ? dueDate < todayStr : false,
        });
      });
    });
    list.sort((a, b) => a.due_date.localeCompare(b.due_date));
    return list.length > 0 ? list : upcomingTasks;
  }, [projects, team, upcomingTasks]);

  const liveTeamWorkload = useMemo(() => {
    if (!team || team.length === 0) return teamWorkload;
    return team
      .filter((m) => m.status === 'active')
      .map((m) => {
        const assigned = projects.filter((p) => {
          if (p.is_archived) return false;
          const memberIds = Array.isArray(p.team_member_ids) ? p.team_member_ids : [];
          return p.project_lead_id === m.id || memberIds.includes(m.id);
        });
        const activeProj = assigned.filter((p) => p.status === 'active' || p.status === 'at_risk');
        const urgentProj = assigned.filter((p) => p.priority === 'urgent' && p.status !== 'completed' && p.status !== 'cancelled');
        const followUpPending = assigned.filter((p) => p.status === 'follow_up_pending');
        const overdueProjects = assigned.filter((p) => p.is_overdue);

        return {
          id: m.id,
          name: m.name,
          designation: m.designation,
          avatar: m.avatar,
          totalProjects: assigned.length,
          activeProjects: activeProj.length,
          urgentProjects: urgentProj.length,
          followUpPending: followUpPending.length,
          overdueProjects: overdueProjects.length,
        };
      })
      .sort((a, b) => b.totalProjects - a.totalProjects);
  }, [team, projects, teamWorkload]);

  const liveOverdueItems = useMemo(() => {
    const overdueTasks = liveUpcomingTasks.filter((t) => t.is_overdue);
    const overdueFUs = liveFollowUpsAttention.filter((f) => f.is_overdue);
    const combined = [
      ...overdueTasks.map((t) => ({ ...t, type: 'task' as const })),
      ...overdueFUs.map((f) => ({ ...f, type: 'follow_up' as const, title: f.notes || `${f.method} follow-up` })),
    ];
    return combined.length > 0 ? combined : overdueItems;
  }, [liveUpcomingTasks, liveFollowUpsAttention, overdueItems]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  // Global Keyboard Shortcuts (Cmd+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
  };

  // Dedicated detailed selected project state
  const [detailedProject, setDetailedProject] = useState<Project | null>(null);

  // Fetch full details whenever a project is selected
  useEffect(() => {
    if (!selectedProjectId) {
      setDetailedProject(null);
      return;
    }
    let isMounted = true;
    api.getProject(selectedProjectId)
      .then((proj) => {
        if (isMounted && proj) {
          setDetailedProject(proj);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch detailed project:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  const refreshCurrentProject = useCallback(async (projId?: string) => {
    const targetId = projId || selectedProjectId;
    if (!targetId) return;
    try {
      const fresh = await api.getProject(targetId);
      if (fresh) {
        setDetailedProject(fresh);
        setProjects((prev) => prev.map((p) => (p.id === fresh.id ? fresh : p)));
      }
    } catch (e) {
      // ignore
    }
  }, [selectedProjectId]);

  // Currently selected project with guaranteed relation resolution
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    const base = (detailedProject && detailedProject.id === selectedProjectId)
      ? detailedProject
      : (projects.find((p) => p.id === selectedProjectId) || null);
    if (!base) return null;

    const resolvedClient = base.client || clients.find((c) => c.id === base.client_id) || null;
    const resolvedLead = base.project_lead || team.find((t) => t.id === base.project_lead_id) || null;
    const memberIds = Array.isArray(base.team_member_ids) ? base.team_member_ids : [];
    const resolvedMembers = (base.team_members && base.team_members.length > 0)
      ? base.team_members
      : team.filter((t) => memberIds.includes(t.id));

    return {
      ...base,
      client: resolvedClient,
      project_lead: resolvedLead,
      team_members: resolvedMembers,
      tasks: base.tasks || [],
      follow_ups: base.follow_ups || [],
      activities: base.activities || [],
    };
  }, [detailedProject, projects, selectedProjectId, clients, team]);

  // Project CRUD Actions
  const handleSaveProject = async (projectData: Partial<Project>) => {
    if (editingProject) {
      const updated = await api.updateProject(editingProject.id, projectData);
      if (updated) {
        setDetailedProject(updated);
      }
    } else {
      const created = await api.createProject(projectData);
      setSelectedProjectId(created.id);
      setDetailedProject(created);
    }
    await loadAllData();
  };

  const handleDeleteProject = async (id: string) => {
    await api.deleteProject(id);
    setSelectedProjectId(null);
    setDetailedProject(null);
    await loadAllData();
  };

  const handleArchiveProject = async (id: string) => {
    await api.archiveProject(id);
    await loadAllData();
    await refreshCurrentProject(id);
  };

  const handleRestoreProject = async (id: string) => {
    await api.restoreProject(id);
    await loadAllData();
    await refreshCurrentProject(id);
  };

  const handleQuickUpdateProject = async (updates: Partial<Project>) => {
    if (!selectedProjectId) return;
    const updated = await api.updateProject(selectedProjectId, updates);
    if (updated) {
      setDetailedProject(updated);
    }
    await loadAllData();
    await refreshCurrentProject();
  };

  // Task Actions
  const handleSaveTask = async (taskData: any) => {
    if (editingTask) {
      await api.updateTask(editingTask.id, taskData);
    } else {
      await api.createTask(taskData);
    }
    setEditingTask(null);
    await loadAllData();
    await refreshCurrentProject(taskData.project_id || selectedProjectId);
  };

  const handleDeleteTask = async (taskId: string) => {
    await api.deleteTask(taskId);
    await loadAllData();
    await refreshCurrentProject();
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    await api.updateTask(taskId, { status: newStatus });
    await loadAllData();
    await refreshCurrentProject();
  };

  // Follow-up Actions
  const handleSaveFollowUp = async (fuData: any) => {
    if (editingFollowUp) {
      await api.updateFollowUp(editingFollowUp.id, fuData);
    } else {
      await api.createFollowUp(fuData);
    }
    setEditingFollowUp(null);
    await loadAllData();
    await refreshCurrentProject(fuData.project_id || selectedProjectId);
  };

  const handleDeleteFollowUp = async (fuId: string) => {
    await api.deleteFollowUp(fuId);
    await loadAllData();
    await refreshCurrentProject();
  };

  const handleUpdateFollowUpStatus = async (fuId: string, newStatus: FollowUp['status']) => {
    await api.updateFollowUp(fuId, { status: newStatus });
    await loadAllData();
    await refreshCurrentProject();
  };

  // Update / Activity Actions
  const handleSaveUpdate = async (updateData: any) => {
    await api.createActivity(updateData);
    await loadAllData();
    await refreshCurrentProject(updateData.project_id || selectedProjectId);
  };

  // Client CRUD Actions
  const handleSaveClient = async (clientData: Partial<Client>) => {
    if (editingClient) {
      await api.updateClient(editingClient.id, clientData);
    } else {
      await api.createClient(clientData);
    }
    await loadAllData();
  };

  const handleDeleteClient = async (clientId: string) => {
    await api.deleteClient(clientId);
    await loadAllData();
  };

  // Team CRUD Actions
  const handleSaveTeamMember = async (memberData: Partial<TeamMember>) => {
    if (editingTeamMember) {
      await api.updateTeamMember(editingTeamMember.id, memberData);
    } else {
      await api.createTeamMember(memberData);
    }
    await loadAllData();
  };

  const handleDeleteTeamMember = async (memberId: string, reassignToId?: string) => {
    await api.deleteTeamMember(memberId, reassignToId);
    await loadAllData();
  };

  // Gantt Chart Actions
  const handleSaveGanttChart = async (chartData: any) => {
    const created = await api.createGanttChart(chartData);
    await loadAllData();
    setSelectedGanttChartId(created.id);
    setCurrentNav('gantt');
  };

  const handleDeleteGanttChart = async (chartId: string) => {
    try {
      await api.deleteGanttChart(chartId);
      setGanttCharts((prev) => prev.filter((c) => c.id !== chartId && c.project_id !== chartId));
      setSelectedGanttChartId((prev) => (prev === chartId ? null : prev));
      await loadAllData();
    } catch (err: any) {
      console.error('Failed to delete Gantt chart:', err);
    }
  };

  const handleSaveGanttTask = async (taskData: GanttTask) => {
    if (!ganttTaskModalChart) return;
    const currentTasks = ganttTaskModalChart.tasks || [];
    const exists = currentTasks.some((t) => t.id === taskData.id);
    const updatedTasks = exists
      ? currentTasks.map((t) => (t.id === taskData.id ? taskData : t))
      : [...currentTasks, taskData];
    await api.updateGanttChart(ganttTaskModalChart.id, { tasks: updatedTasks });
    await loadAllData();
  };

  const handleDeleteGanttTask = async (chartId: string, taskId: string) => {
    const chart = ganttCharts.find((c) => c.id === chartId);
    if (!chart) return;
    const updatedTasks = (chart.tasks || []).filter((t) => t.id !== taskId);
    await api.updateGanttChart(chartId, { tasks: updatedTasks });
    await loadAllData();
  };

  // Loading Screen for initial session check
  if (authChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
          <span>Verifying company workspace access...</span>
        </div>
      </div>
    );
  }

  // Not authenticated: Render single-password unlock screen
  if (!isAuthenticated) {
    return (
      <AuthGate
        onSuccess={(authCompany) => {
          if (authCompany) setCompany(authCompany);
          setIsAuthenticated(true);
        }}
        onAuthenticated={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen overflow-hidden bg-zinc-50 text-zinc-900 flex font-sans antialiased">
        {/* Sidebar Navigation */}
        <Navigation
          currentNav={currentNav}
          currentTab={currentNav}
          onNavigate={(nav) => {
            setCurrentNav(nav);
            setSelectedProjectId(null); // Reset detail view when clicking nav item
          }}
          onTabChange={(nav) => {
            setCurrentNav(nav);
            setSelectedProjectId(null);
          }}
          company={company}
          onOpenNewProject={() => {
            setEditingProject(null);
            setProjectModalOpen(true);
          }}
          onOpenNewFollowUp={() => {
            setEditingFollowUp(null);
            setFollowUpTargetProjectId(selectedProjectId || undefined);
            setFollowUpModalOpen(true);
          }}
          onOpenNewTask={() => {
            setEditingTask(null);
            setTaskTargetProjectId(selectedProjectId || undefined);
            setTaskModalOpen(true);
          }}
          onOpenNewUpdate={() => {
            setUpdateTargetProjectId(selectedProjectId || undefined);
            setUpdateModalOpen(true);
          }}
          onLogout={handleLogout}
          urgentCount={stats.urgentProjects || 0}
          overdueCount={stats.overdue || 0}
          archivedCount={projects.filter((p) => p.is_archived).length}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {selectedProject ? (
              /* Project Detail View */
              <ProjectDetailView
                project={selectedProject}
                team={team}
                onBack={() => setSelectedProjectId(null)}
                onEditProject={() => {
                  setEditingProject(selectedProject);
                  setProjectModalOpen(true);
                }}
                onDeleteProject={() => handleDeleteProject(selectedProject.id)}
                onArchiveProject={handleArchiveProject}
                onRestoreProject={handleRestoreProject}
                onOpenAddTask={() => {
                  setEditingTask(null);
                  setTaskTargetProjectId(selectedProject.id);
                  setTaskModalOpen(true);
                }}
                onOpenAddFollowUp={() => {
                  setEditingFollowUp(null);
                  setFollowUpTargetProjectId(selectedProject.id);
                  setFollowUpModalOpen(true);
                }}
                onOpenAddUpdate={() => {
                  setUpdateTargetProjectId(selectedProject.id);
                  setUpdateModalOpen(true);
                }}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setTaskTargetProjectId(task.project_id);
                  setTaskModalOpen(true);
                }}
                onDeleteTask={handleDeleteTask}
                onEditFollowUp={(fu) => {
                  setEditingFollowUp(fu);
                  setFollowUpTargetProjectId(fu.project_id);
                  setFollowUpModalOpen(true);
                }}
                onDeleteFollowUp={handleDeleteFollowUp}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUpdateFollowUpStatus={handleUpdateFollowUpStatus}
                onUpdateProjectQuick={handleQuickUpdateProject}
                hasGanttChart={ganttCharts.some((g) => g.project_id === selectedProject.id)}
                onViewGanttChart={() => {
                  setSelectedGanttChartId(selectedProject.id);
                  setCurrentNav('gantt');
                  setSelectedProjectId(null);
                }}
                onCreateGanttChart={() => {
                  setGanttChartTargetProjectId(selectedProject.id);
                  setGanttChartModalOpen(true);
                }}
              />
            ) : currentNav === 'dashboard' ? (
              /* Dashboard Overview View */
              <DashboardView
                stats={stats}
                projects={projects}
                team={team}
                clients={clients}
                followUpsAttention={liveFollowUpsAttention}
                upcomingTasks={liveUpcomingTasks}
                overdueItems={liveOverdueItems}
                teamWorkload={liveTeamWorkload}
                onSelectProject={(id) => setSelectedProjectId(id)}
                onOpenNewProject={() => {
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
                onOpenNewFollowUp={() => {
                  setEditingFollowUp(null);
                  setFollowUpTargetProjectId(undefined);
                  setFollowUpDefaultDate(undefined);
                  setFollowUpModalOpen(true);
                }}
              />
            ) : currentNav === 'projects' ? (
              /* Projects Directory View */
              <ProjectsView
                projects={projects.filter((p) => !p.is_archived)}
                team={team}
                clients={clients}
                onSelectProject={(id) => setSelectedProjectId(id)}
                onOpenNewProject={() => {
                  setEditingProject(null);
                  setProjectModalOpen(true);
                }}
              />
            ) : currentNav === 'gantt' ? (
              /* Gantt Chart View */
              <GanttChartView
                charts={ganttCharts}
                projects={projects}
                team={team}
                companySettings={company}
                selectedChartId={selectedGanttChartId}
                onSelectChart={(id) => setSelectedGanttChartId(id)}
                onOpenNewChart={(projId) => {
                  setGanttChartTargetProjectId(projId);
                  setGanttChartModalOpen(true);
                }}
                onOpenTaskModal={(chart, task) => {
                  setGanttTaskModalChart(chart);
                  setEditingGanttTask(task || null);
                  setGanttTaskModalOpen(true);
                }}
                onDeleteChart={handleDeleteGanttChart}
                onDeleteTask={handleDeleteGanttTask}
                onViewProjectDetail={(pId) => setSelectedProjectId(pId)}
              />
            ) : currentNav === 'calendar' ? (
              /* Calendar View */
              <CalendarView
                projects={projects}
                team={team}
                clients={clients}
                onSelectProject={(id) => setSelectedProjectId(id)}
                onOpenNewTask={(date, pId) => {
                  setEditingTask(null);
                  setTaskTargetProjectId(pId || undefined);
                  setTaskDefaultDate(date);
                  setTaskModalOpen(true);
                }}
                onOpenNewFollowUp={(date, pId) => {
                  setEditingFollowUp(null);
                  setFollowUpTargetProjectId(pId || undefined);
                  setFollowUpDefaultDate(date);
                  setFollowUpModalOpen(true);
                }}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onUpdateFollowUpStatus={handleUpdateFollowUpStatus}
              />
            ) : currentNav === 'archive' ? (
              /* Project Archive View */
              <ArchiveView
                projects={projects}
                team={team}
                clients={clients}
                onSelectProject={(id) => setSelectedProjectId(id)}
                onRestoreProject={handleRestoreProject}
                onDeleteProject={handleDeleteProject}
              />
            ) : currentNav === 'clients' ? (
              /* Clients View */
              <ClientsView
                clients={clients}
                projects={projects.filter((p) => !p.is_archived)}
                onOpenNewClient={() => {
                  setEditingClient(null);
                  setClientModalOpen(true);
                }}
                onEditClient={(client) => {
                  setEditingClient(client);
                  setClientModalOpen(true);
                }}
                onDeleteClient={handleDeleteClient}
                onSelectProject={(id) => setSelectedProjectId(id)}
              />
            ) : currentNav === 'team' ? (
              /* Team Directory View */
              <TeamView
                team={team}
                projects={projects.filter((p) => !p.is_archived)}
                onOpenNewMember={() => {
                  setEditingTeamMember(null);
                  setTeamModalOpen(true);
                }}
                onEditMember={(member) => {
                  setEditingTeamMember(member);
                  setTeamModalOpen(true);
                }}
                onDeleteMember={handleDeleteTeamMember}
                onSelectProject={(id) => setSelectedProjectId(id)}
              />
            ) : currentNav === 'settings' ? (
              /* Settings View */
              <SettingsView
                onRefreshAllData={loadAllData}
                company={company}
                onCompanyUpdated={(updated) => setCompany(updated)}
              />
            ) : null}
          </div>
        </main>

        {/* Global Quick Search Modal (Cmd+K) */}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          projects={projects.filter((p) => !p.is_archived)}
          clients={clients}
          team={team}
          onSelectProject={(id) => {
            setSelectedProjectId(id);
            setIsSearchOpen(false);
          }}
          onSelectClient={() => {
            setCurrentNav('clients');
            setIsSearchOpen(false);
          }}
          onSelectTeamMember={() => {
            setCurrentNav('team');
            setIsSearchOpen(false);
          }}
        />

        {/* Action Modals */}
        <ProjectModal
          isOpen={projectModalOpen}
          onClose={() => setProjectModalOpen(false)}
          onSave={handleSaveProject}
          clients={clients}
          team={team}
          initialData={editingProject}
          onQuickAddClient={async (clientData) => {
            const created = await api.createClient(clientData);
            await loadAllData();
            return created;
          }}
        />

        <FollowUpModal
          isOpen={followUpModalOpen}
          onClose={() => {
            setFollowUpModalOpen(false);
            setEditingFollowUp(null);
            setFollowUpDefaultDate(undefined);
          }}
          onSave={handleSaveFollowUp}
          projects={projects.filter((p) => !p.is_archived)}
          team={team}
          defaultProjectId={followUpTargetProjectId}
          initialData={editingFollowUp}
          defaultFollowUpDate={followUpDefaultDate}
        />

        <TaskModal
          isOpen={taskModalOpen}
          onClose={() => {
            setTaskModalOpen(false);
            setEditingTask(null);
            setTaskDefaultDate(undefined);
          }}
          onSave={handleSaveTask}
          projectId={taskTargetProjectId}
          projects={projects.filter((p) => !p.is_archived)}
          team={team}
          initialData={editingTask}
          defaultDueDate={taskDefaultDate}
        />

        <UpdateModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          onSave={handleSaveUpdate}
          projectId={updateTargetProjectId}
          projects={projects.filter((p) => !p.is_archived)}
          team={team}
        />

        <ClientModal
          isOpen={clientModalOpen}
          onClose={() => setClientModalOpen(false)}
          onSave={handleSaveClient}
          initialData={editingClient}
        />

        <TeamModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          onSave={handleSaveTeamMember}
          initialData={editingTeamMember}
        />

        {/* Gantt Chart Creation Modal */}
        <GanttChartModal
          isOpen={ganttChartModalOpen}
          onClose={() => {
            setGanttChartModalOpen(false);
            setGanttChartTargetProjectId(undefined);
          }}
          projects={projects}
          initialProjectId={ganttChartTargetProjectId}
          onSave={handleSaveGanttChart}
        />

        {/* Gantt Task & Multi-Segment Modal */}
        {ganttTaskModalChart && (
          <GanttTaskModal
            isOpen={ganttTaskModalOpen}
            onClose={() => {
              setGanttTaskModalOpen(false);
              setEditingGanttTask(null);
            }}
            task={editingGanttTask}
            chart={ganttTaskModalChart}
            team={team}
            onSave={handleSaveGanttTask}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
