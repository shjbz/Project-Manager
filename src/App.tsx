import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import type { Project, TeamMember, Client, DashboardStats, Task, FollowUp, CompanySettings } from './types';
import { AuthGate } from './components/AuthGate';
import { Navigation } from './components/Navigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { DashboardView } from './components/DashboardView';
import { ProjectsView } from './components/ProjectsView';
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

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [company, setCompany] = useState<CompanySettings | null>(null);

  // Navigation State
  const [currentNav, setCurrentNav] = useState<'dashboard' | 'projects' | 'clients' | 'team' | 'settings'>('dashboard');
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

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTargetProjectId, setTaskTargetProjectId] = useState<string | undefined>(undefined);

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updateTargetProjectId, setUpdateTargetProjectId] = useState<string | undefined>(undefined);

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null);

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
      ] = await Promise.all([
        api.getProjects(),
        api.getTeam(),
        api.getClients(),
        api.getDashboard(),
        api.getCompany().catch(() => null),
      ]);

      setProjects(projectsData);
      setTeam(teamData);
      setClients(clientsData);
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

  // Currently selected project
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Project CRUD Actions
  const handleSaveProject = async (projectData: Partial<Project>) => {
    if (editingProject) {
      await api.updateProject(editingProject.id, projectData);
    } else {
      const created = await api.createProject(projectData);
      setSelectedProjectId(created.id);
    }
    await loadAllData();
  };

  const handleDeleteProject = async (id: string) => {
    await api.deleteProject(id);
    setSelectedProjectId(null);
    await loadAllData();
  };

  const handleQuickUpdateProject = async (updates: Partial<Project>) => {
    if (!selectedProjectId) return;
    await api.updateProject(selectedProjectId, updates);
    await loadAllData();
  };

  // Task Actions
  const handleSaveTask = async (taskData: any) => {
    await api.createTask(taskData);
    await loadAllData();
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    await api.updateTask(taskId, { status: newStatus });
    await loadAllData();
  };

  // Follow-up Actions
  const handleSaveFollowUp = async (fuData: any) => {
    await api.createFollowUp(fuData);
    await loadAllData();
  };

  const handleUpdateFollowUpStatus = async (fuId: string, newStatus: FollowUp['status']) => {
    await api.updateFollowUp(fuId, { status: newStatus });
    await loadAllData();
  };

  // Update / Activity Actions
  const handleSaveUpdate = async (updateData: any) => {
    await api.createActivity(updateData);
    await loadAllData();
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

  const handleDeleteTeamMember = async (memberId: string) => {
    await api.deleteTeamMember(memberId);
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
            setFollowUpTargetProjectId(undefined);
            setFollowUpModalOpen(true);
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          onLogout={handleLogout}
          urgentCount={stats.urgentProjects || 0}
          overdueCount={stats.overdue || 0}
        />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {selectedProject ? (
          /* Project Detail View (Spec #29, #30, #48) */
          <ProjectDetailView
            project={selectedProject}
            team={team}
            onBack={() => setSelectedProjectId(null)}
            onEditProject={() => {
              setEditingProject(selectedProject);
              setProjectModalOpen(true);
            }}
            onDeleteProject={() => handleDeleteProject(selectedProject.id)}
            onOpenAddTask={() => {
              setTaskTargetProjectId(selectedProject.id);
              setTaskModalOpen(true);
            }}
            onOpenAddFollowUp={() => {
              setFollowUpTargetProjectId(selectedProject.id);
              setFollowUpModalOpen(true);
            }}
            onOpenAddUpdate={() => {
              setUpdateTargetProjectId(selectedProject.id);
              setUpdateModalOpen(true);
            }}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onUpdateFollowUpStatus={handleUpdateFollowUpStatus}
            onUpdateProjectQuick={handleQuickUpdateProject}
          />
        ) : currentNav === 'dashboard' ? (
          /* Dashboard Overview View (Spec #11-#15, #31-#34) */
          <DashboardView
            stats={stats}
            projects={projects}
            team={team}
            clients={clients}
            followUpsAttention={followUpsAttention}
            upcomingTasks={upcomingTasks}
            overdueItems={overdueItems}
            teamWorkload={teamWorkload}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onOpenNewProject={() => {
              setEditingProject(null);
              setProjectModalOpen(true);
            }}
            onOpenNewFollowUp={() => {
              setFollowUpTargetProjectId(undefined);
              setFollowUpModalOpen(true);
            }}
          />
        ) : currentNav === 'projects' ? (
          /* Projects Directory View (Spec #14, #15, #35, #36) */
          <ProjectsView
            projects={projects}
            team={team}
            clients={clients}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onOpenNewProject={() => {
              setEditingProject(null);
              setProjectModalOpen(true);
            }}
          />
        ) : currentNav === 'clients' ? (
          /* Clients View (Spec #20, #49) */
          <ClientsView
            clients={clients}
            projects={projects}
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
          /* Team Directory View (Spec #21-#23) */
          <TeamView
            team={team}
            projects={projects}
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
          /* Settings View (Spec #44-#46) */
          <SettingsView
            onRefreshAllData={loadAllData}
            company={company}
            onCompanyUpdated={(updated) => setCompany(updated)}
          />
        ) : null}
        </div>
      </main>

      {/* Global Quick Search Modal (Cmd+K) (Spec #37) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        projects={projects}
        clients={clients}
        team={team}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setIsSearchOpen(false);
        }}
        onSelectClient={(id) => {
          setCurrentNav('clients');
          setIsSearchOpen(false);
        }}
        onSelectTeamMember={(id) => {
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
      />

      <FollowUpModal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        onSave={handleSaveFollowUp}
        projects={projects}
        team={team}
        defaultProjectId={followUpTargetProjectId}
      />

      {taskTargetProjectId && (
        <TaskModal
          isOpen={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
          onSave={handleSaveTask}
          projectId={taskTargetProjectId}
          team={team}
        />
      )}

      {updateTargetProjectId && (
        <UpdateModal
          isOpen={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          onSave={handleSaveUpdate}
          projectId={updateTargetProjectId}
          team={team}
        />
      )}

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
    </div>
    </ErrorBoundary>
  );
}
