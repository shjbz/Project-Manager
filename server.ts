import express from 'express';
import path from 'path';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { mysqlDb } from './server/mysql.js';

interface SessionRecord {
  createdAt: number;
  lastActive: number;
}

const activeSessions = new Map<string, SessionRecord>();
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Rate limiting for password attempts
interface RateLimitRecord {
  attempts: number;
  blockedUntil: number;
}
const loginAttempts = new Map<string, RateLimitRecord>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return false;
  if (record.blockedUntil > now) return true;
  return false;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { attempts: 0, blockedUntil: 0 };
  record.attempts += 1;
  if (record.attempts >= 5) {
    // block for 30 seconds after 5 failed attempts
    record.blockedUntil = now + 30000;
  }
  loginAttempts.set(ip, record);
}

function resetAttempts(ip: string) {
  loginAttempts.delete(ip);
}

function createSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    createdAt: Date.now(),
    lastActive: Date.now(),
  });
  return token;
}

function validateSession(token?: string): boolean {
  if (!token) return false;
  const sess = activeSessions.get(token);
  if (!sess) return false;
  if (Date.now() - sess.lastActive > SESSION_TTL_MS) {
    activeSessions.delete(token);
    return false;
  }
  sess.lastActive = Date.now();
  return true;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // CORS support for separate frontend and backend origins
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Initialize Hostinger MySQL connection & synchronization (background)
  db.initMySQL().catch((err: any) => console.warn('[MySQL] Background init caught:', err?.message || err));

  // Database Connection Health & Status Endpoint
  app.get('/api/db/status', (_req, res) => {
    const mysqlStatus = mysqlDb.getStatus();

    res.json({
      engine: mysqlStatus.connected ? 'mysql' : 'file',
      connected: mysqlStatus.connected,
      mysql: mysqlStatus,
      database: mysqlStatus.database,
      user: mysqlStatus.user,
      host: mysqlStatus.host,
      port: mysqlStatus.port,
      error: mysqlStatus.error,
      whitelistHint: '82.180.143.163',
    });
  });

  // Public company identity (for login gate branding and title)
  app.get('/api/company/public', (_req, res) => {
    const s = db.getSettings();
    res.json({
      company_name: s.company_name,
      company_logo: s.company_logo || s.logo_url,
      logo_url: s.logo_url || s.company_logo,
      tagline: s.tagline || 'Centralized Workspace & Operations Command',
      isPasswordSet: db.isPasswordSet(),
    });
  });

  // Simple auth middleware for protected API routes
  const requireAuth: express.RequestHandler = (req, res, next) => {
    const cookieToken = req.cookies?.company_session;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = cookieToken || headerToken;

    if (!validateSession(token)) {
      res.status(401).json({ error: 'Unauthorized. Company session required.' });
      return;
    }
    next();
  };

  // --- Auth Endpoints ---
  app.get('/api/auth/status', (_req, res) => {
    const s = db.getSettings();
    res.json({
      isPasswordSet: db.isPasswordSet(),
      company_name: s.company_name,
      company_logo: s.company_logo || s.logo_url,
      logo_url: s.logo_url || s.company_logo,
      tagline: s.tagline || 'Centralized Workspace & Operations Command',
    });
  });

  app.post('/api/auth/setup-password', (req, res) => {
    if (db.isPasswordSet()) {
      res.status(400).json({ error: 'Company password has already been configured. Please log in.' });
      return;
    }

    const { password } = req.body;
    if (!password || typeof password !== 'string' || !password.trim()) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    if (password.trim().length < 4) {
      res.status(400).json({ error: 'Password must be at least 4 characters long' });
      return;
    }

    db.setInitialPassword(password.trim());
    const token = createSession();

    res.cookie('company_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS,
      path: '/',
    });

    res.json({
      success: true,
      token,
      company: db.getSettings(),
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many failed attempts. Please wait 30 seconds.' });
      return;
    }

    if (!db.isPasswordSet()) {
      res.status(400).json({
        error: 'Master password has not been set yet. Please configure the master password.',
        needsSetup: true,
      });
      return;
    }

    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const valid = db.verifyCompanyPassword(password.trim());
    if (!valid) {
      recordFailedAttempt(ip);
      res.status(401).json({ error: 'Incorrect company password' });
      return;
    }

    resetAttempts(ip);
    const token = createSession();

    // Set secure HTTP-only cookie
    res.cookie('company_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS,
      path: '/',
    });

    res.json({
      success: true,
      token,
      company: db.getSettings(),
    });
  });

  app.get('/api/auth/session', (req, res) => {
    const isPasswordSet = db.isPasswordSet();
    const cookieToken = req.cookies?.company_session;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = cookieToken || headerToken;

    if (!validateSession(token)) {
      res.status(401).json({ authenticated: false, isPasswordSet });
      return;
    }

    res.json({
      authenticated: true,
      isPasswordSet,
      company: db.getSettings(),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const cookieToken = req.cookies?.company_session;
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const token = cookieToken || headerToken;
    if (token) {
      activeSessions.delete(token);
    }
    res.clearCookie('company_session', { path: '/' });
    res.json({ success: true });
  });

  app.post('/api/auth/change-password', requireAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters' });
      return;
    }

    if (db.isPasswordSet() && (!currentPassword || typeof currentPassword !== 'string')) {
      res.status(400).json({ error: 'Current password is required' });
      return;
    }

    const changed = db.changeCompanyPassword(currentPassword ? currentPassword.trim() : '', newPassword.trim());
    if (!changed) {
      res.status(400).json({ error: 'Current password verification failed' });
      return;
    }

    res.json({ success: true, message: 'Company password updated successfully' });
  });

  // --- Company Settings (Spec #43, #59) ---
  app.get('/api/company', requireAuth, (req, res) => {
    res.json(db.getSettings());
  });

  app.put('/api/company', requireAuth, (req, res) => {
    const updated = db.updateSettings(req.body);
    res.json(updated);
  });

  // --- Dashboard Data (Spec #10 - #13, #31 - #34, #46) ---
  app.get('/api/dashboard', requireAuth, (req, res) => {
    const dashboardData = db.getDashboardStats();
    res.json(dashboardData);
  });

  app.get('/api/dashboard/stats', requireAuth, (req, res) => {
    const dashboardData = db.getDashboardStats();
    res.json(dashboardData);
  });

  // --- Projects (Spec #14 - #18, #22 - #24, #35 - #37) ---
  app.get('/api/projects', requireAuth, (req, res) => {
    const { search, priority, status, leadId, clientId, projectType, dueDate, sortBy } = req.query;
    const list = db.getProjects({
      search: typeof search === 'string' ? search : undefined,
      priority: typeof priority === 'string' ? priority : undefined,
      status: typeof status === 'string' ? status : undefined,
      leadId: typeof leadId === 'string' ? leadId : undefined,
      clientId: typeof clientId === 'string' ? clientId : undefined,
      projectType: typeof projectType === 'string' ? projectType : undefined,
      dueDate: typeof dueDate === 'string' ? dueDate : undefined,
      sortBy: typeof sortBy === 'string' ? sortBy : undefined,
    });
    res.json(list);
  });

  app.get('/api/projects/:id', requireAuth, (req, res) => {
    const project = db.getProjectById(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  });

  app.post('/api/projects', requireAuth, (req, res) => {
    try {
      const created = db.createProject(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create project' });
    }
  });

  app.put('/api/projects/:id', requireAuth, (req, res) => {
    const { actingMemberId, ...updates } = req.body;
    const updated = db.updateProject(req.params.id, updates, actingMemberId);
    if (!updated) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/projects/:id', requireAuth, (req, res) => {
    const deleted = db.deleteProject(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ success: true });
  });

  app.post('/api/projects/:id/archive', requireAuth, (req, res) => {
    const proj = db.archiveProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(proj);
  });

  app.post('/api/projects/:id/restore', requireAuth, (req, res) => {
    const proj = db.restoreProject(req.params.id);
    if (!proj) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(proj);
  });

  // --- Clients (Spec #19, #20, #49) ---
  app.get('/api/clients', requireAuth, (req, res) => {
    res.json(db.getClients());
  });

  app.post('/api/clients', requireAuth, (req, res) => {
    try {
      const created = db.createClient(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/clients/:id', requireAuth, (req, res) => {
    const updated = db.updateClient(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/clients/:id', requireAuth, (req, res) => {
    const deleted = db.deleteClient(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    res.json({ success: true });
  });

  // --- Team Members (Spec #21, #50) ---
  app.get('/api/team', requireAuth, (req, res) => {
    res.json(db.getTeam());
  });

  app.post('/api/team', requireAuth, (req, res) => {
    try {
      const created = db.createTeamMember(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/team/:id', requireAuth, (req, res) => {
    const updated = db.updateTeamMember(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/team/:id', requireAuth, (req, res) => {
    const { reassignTo } = req.body || {};
    const deleted = db.deleteTeamMember(req.params.id, reassignTo);
    if (!deleted) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    res.json({ success: true });
  });

  // --- Tasks (Spec #26) ---
  app.post('/api/tasks', requireAuth, (req, res) => {
    const task = db.createTask(req.body);
    res.status(201).json(task);
  });

  app.put('/api/tasks/:id', requireAuth, (req, res) => {
    const updated = db.updateTask(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/tasks/:id', requireAuth, (req, res) => {
    const deleted = db.deleteTask(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ success: true });
  });

  // --- Follow-ups (Spec #25) ---
  app.post('/api/followups', requireAuth, (req, res) => {
    const fu = db.createFollowUp(req.body);
    res.status(201).json(fu);
  });

  app.put('/api/followups/:id', requireAuth, (req, res) => {
    const updated = db.updateFollowUp(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Follow-up not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/followups/:id', requireAuth, (req, res) => {
    const deleted = db.deleteFollowUp(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Follow-up not found' });
      return;
    }
    res.json({ success: true });
  });

  // --- Project Updates & Activities (Spec #27, #28) ---
  app.post('/api/activities', requireAuth, (req, res) => {
    const act = db.createActivity(req.body);
    res.status(201).json(act);
  });

  // --- Gantt Charts ---
  app.get('/api/gantt', requireAuth, (_req, res) => {
    res.json(db.getGanttCharts());
  });

  app.get('/api/gantt/:id', requireAuth, (req, res) => {
    const chart = db.getGanttChart(req.params.id);
    if (!chart) {
      res.status(404).json({ error: 'Gantt chart not found' });
      return;
    }
    res.json(chart);
  });

  app.post('/api/gantt', requireAuth, (req, res) => {
    try {
      const created = db.createGanttChart(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create Gantt chart' });
    }
  });

  app.put('/api/gantt/:id', requireAuth, (req, res) => {
    const updated = db.updateGanttChart(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Gantt chart not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/gantt/:id', requireAuth, (req, res) => {
    const deleted = db.deleteGanttChart(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Gantt chart not found' });
      return;
    }
    res.json({ success: true });
  });

  // --- Backup & Restore (Spec #56, #59) ---
  app.get('/api/backup', requireAuth, (req, res) => {
    const data = db.getRaw();
    const { password_hash, salt, ...safeSettings } = data.settings;
    const exportData = {
      ...data,
      settings: safeSettings,
      exportedAt: new Date().toISOString(),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="company-project-backup.json"');
    res.json(exportData);
  });

  app.post('/api/backup/restore', requireAuth, (req, res) => {
    try {
      const incoming = req.body;
      const currentRaw = db.getRaw();
      // preserve password hash and salt if incoming doesn't have it
      incoming.settings.password_hash = incoming.settings.password_hash || currentRaw.settings.password_hash;
      incoming.settings.salt = incoming.settings.salt || currentRaw.settings.salt;
      db.restore(incoming);
      res.json({ success: true, message: 'Database restored successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to restore backup' });
    }
  });

  app.post('/api/backup/reset', requireAuth, (_req, res) => {
    try {
      db.reset();
      res.json({ success: true, message: 'Database reset to initial demo state' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reset database' });
    }
  });

  // --- Vite Middleware for Development / Static for Production ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Company Project Management server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
