import mysql from 'mysql2/promise';
import type { DatabaseSchema } from './db.js';
import type {
  CompanySettings,
  TeamMember,
  Client,
  Project,
  Task,
  FollowUp,
  Activity,
  GanttChart,
} from '../src/types.js';

export interface MySQLStatus {
  engine: 'mysql';
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  error: string | null;
  tablesReady: boolean;
}

class MySQLService {
  private pool: mysql.Pool | null = null;
  private isConnected = false;
  private tablesReady = false;
  private lastError: string | null = null;
  private initPromise: Promise<boolean> | null = null;

  public readonly config = {
    host: process.env.MYSQL_HOST || '82.180.143.163',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'u345742528_shuzaul',
    password: process.env.MYSQL_PASSWORD || 'Shajib1501025',
    database: process.env.MYSQL_DATABASE || 'u345742528_manage_falcon',
  };

  public getStatus(): MySQLStatus {
    return {
      engine: 'mysql',
      connected: this.isConnected,
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      error: this.lastError,
      tablesReady: this.tablesReady,
    };
  }

  public async init(): Promise<boolean> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const pool = mysql.createPool({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          database: this.config.database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 5000,
        });

        // Test connection
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();

        this.pool = pool;
        this.isConnected = true;
        this.lastError = null;

        console.log(`[MySQL] Successfully connected to Hostinger MySQL: ${this.config.user}@${this.config.host}/${this.config.database}`);

        // Create tables if they do not exist
        await this.createTablesIfNotExist();
        this.tablesReady = true;

        return true;
      } catch (err: any) {
        this.isConnected = false;
        this.tablesReady = false;
        const msg = err?.message || String(err);
        this.lastError = msg;
        console.warn('[MySQL] Hostinger MySQL connection status:', msg);

        if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('Access denied')) {
          console.warn(
            `[MySQL] Note: If accessing Hostinger MySQL from outside Hostinger, ensure Remote MySQL is enabled in Hostinger hPanel for user "${this.config.user}".`
          );
        }

        this.initPromise = null;
        return false;
      }
    })();

    return this.initPromise;
  }

  private async createTablesIfNotExist(): Promise<void> {
    if (!this.pool) return;

    const queries = [
      `CREATE TABLE IF NOT EXISTS company_settings (
        id VARCHAR(64) PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        company_address TEXT,
        company_phone VARCHAR(100),
        company_email VARCHAR(255),
        company_logo MEDIUMTEXT,
        logo_url MEDIUMTEXT,
        tagline VARCHAR(255),
        currency_symbol VARCHAR(16) DEFAULT '৳',
        is_password_set TINYINT(1) DEFAULT 0,
        password_hash VARCHAR(255),
        salt VARCHAR(255),
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(100),
        avatar MEDIUMTEXT,
        notes TEXT,
        status VARCHAR(32) DEFAULT 'active',
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        phone VARCHAR(100),
        email VARCHAR(255),
        address TEXT,
        notes TEXT,
        status VARCHAR(32) DEFAULT 'active',
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(64) PRIMARY KEY,
        project_name VARCHAR(255) NOT NULL,
        project_type VARCHAR(100),
        location VARCHAR(255),
        description TEXT,
        client_id VARCHAR(64),
        project_lead_id VARCHAR(64),
        team_member_ids TEXT,
        priority VARCHAR(32) DEFAULT 'standard',
        status VARCHAR(32) DEFAULT 'active',
        start_date VARCHAR(64),
        expected_completion_date VARCHAR(64),
        actual_completion_date VARCHAR(64),
        is_archived TINYINT(1) DEFAULT 0,
        archived_at VARCHAR(64),
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_to VARCHAR(64),
        priority VARCHAR(32) DEFAULT 'standard',
        due_date VARCHAR(64),
        status VARCHAR(32) DEFAULT 'pending',
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS follow_ups (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) NOT NULL,
        follow_up_date VARCHAR(64),
        method VARCHAR(64),
        notes TEXT,
        created_by VARCHAR(64),
        status VARCHAR(32) DEFAULT 'pending',
        created_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS activities (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) NOT NULL,
        team_member_id VARCHAR(64),
        activity_type VARCHAR(64),
        description TEXT,
        activity_date VARCHAR(64),
        created_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS gantt_charts (
        id VARCHAR(64) PRIMARY KEY,
        project_id VARCHAR(64) NOT NULL,
        project_name VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        start_date VARCHAR(64),
        end_date VARCHAR(64),
        notes TEXT,
        tasks LONGTEXT,
        created_at VARCHAR(64),
        updated_at VARCHAR(64)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ];

    for (const q of queries) {
      await this.pool.query(q);
    }

    // Migrate column types if needed for large images/avatars
    try {
      await this.pool.query('ALTER TABLE team_members MODIFY COLUMN avatar MEDIUMTEXT');
    } catch (_) {}
    try {
      await this.pool.query('ALTER TABLE company_settings MODIFY COLUMN company_logo MEDIUMTEXT');
    } catch (_) {}
    try {
      await this.pool.query('ALTER TABLE company_settings MODIFY COLUMN logo_url MEDIUMTEXT');
    } catch (_) {}

    console.log('[MySQL] All Hostinger MySQL tables verified / created successfully');
  }

  /**
   * Load all records from Hostinger MySQL tables into memory schema.
   */
  public async loadAll(): Promise<DatabaseSchema | null> {
    if (!this.pool || !this.isConnected) {
      const ok = await this.init();
      if (!ok || !this.pool) return null;
    }

    try {
      const [settingsRows]: [any[], any] = await this.pool.query(
        'SELECT * FROM company_settings WHERE id = "company-main" LIMIT 1'
      );

      if (!settingsRows || settingsRows.length === 0) {
        return null; // Empty tables; signal caller to seed
      }

      const s = settingsRows[0];
      const settings: CompanySettings & { password_hash: string; salt: string; is_password_set?: boolean } = {
        id: s.id,
        company_name: s.company_name,
        company_address: s.company_address || '',
        company_phone: s.company_phone || '',
        company_email: s.company_email || '',
        company_logo: s.company_logo || undefined,
        logo_url: s.logo_url || undefined,
        tagline: s.tagline || undefined,
        currency_symbol: s.currency_symbol || '৳',
        is_password_set: Boolean(s.is_password_set),
        password_hash: s.password_hash || '',
        salt: s.salt || '',
        created_at: s.created_at || new Date().toISOString(),
        updated_at: s.updated_at || new Date().toISOString(),
      };

      const [teamRows]: [any[], any] = await this.pool.query('SELECT * FROM team_members');
      const [clientRows]: [any[], any] = await this.pool.query('SELECT * FROM clients');
      const [projectRows]: [any[], any] = await this.pool.query('SELECT * FROM projects');
      const [taskRows]: [any[], any] = await this.pool.query('SELECT * FROM tasks');
      const [followUpRows]: [any[], any] = await this.pool.query('SELECT * FROM follow_ups');
      const [activityRows]: [any[], any] = await this.pool.query('SELECT * FROM activities ORDER BY created_at DESC');

      const team_members: TeamMember[] = teamRows.map((r) => ({
        id: r.id,
        name: r.name,
        designation: r.designation || '',
        email: r.email || '',
        phone: r.phone || '',
        avatar: r.avatar || undefined,
        notes: r.notes || undefined,
        status: r.status || 'active',
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      const clients: Client[] = clientRows.map((r) => ({
        id: r.id,
        name: r.name,
        company: r.company || undefined,
        phone: r.phone || '',
        email: r.email || undefined,
        address: r.address || undefined,
        notes: r.notes || undefined,
        status: r.status || 'active',
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      const projects: Project[] = projectRows.map((r) => {
        let teamMemberIds: string[] = [];
        try {
          teamMemberIds = r.team_member_ids ? JSON.parse(r.team_member_ids) : [];
        } catch {
          teamMemberIds = [];
        }

        return {
          id: r.id,
          project_name: r.project_name,
          project_type: r.project_type || 'Architecture',
          location: r.location || '',
          description: r.description || undefined,
          client_id: r.client_id || '',
          project_lead_id: r.project_lead_id || '',
          team_member_ids: teamMemberIds,
          priority: r.priority || 'standard',
          status: r.status || 'active',
          start_date: r.start_date || '',
          expected_completion_date: r.expected_completion_date || undefined,
          actual_completion_date: r.actual_completion_date || undefined,
          is_archived: Boolean(r.is_archived),
          archived_at: r.archived_at || undefined,
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
      });

      const tasks: Task[] = taskRows.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        title: r.title,
        description: r.description || undefined,
        assigned_to: r.assigned_to || undefined,
        priority: r.priority || 'standard',
        due_date: r.due_date || '',
        status: r.status || 'pending',
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      const follow_ups: FollowUp[] = followUpRows.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        follow_up_date: r.follow_up_date || '',
        method: r.method || 'Phone',
        notes: r.notes || '',
        created_by: r.created_by || undefined,
        status: r.status || 'pending',
        created_at: r.created_at,
      }));

      const activities: Activity[] = activityRows.map((r) => ({
        id: r.id,
        project_id: r.project_id,
        team_member_id: r.team_member_id || undefined,
        activity_type: r.activity_type || 'General Update',
        description: r.description || '',
        activity_date: r.activity_date || '',
        created_at: r.created_at,
      }));

      let gantt_charts: GanttChart[] = [];
      try {
        const [ganttRows]: [any[], any] = await this.pool.query(
          'SELECT * FROM gantt_charts ORDER BY created_at ASC'
        );
        gantt_charts = (ganttRows || []).map((r) => ({
          id: r.id,
          project_id: r.project_id,
          project_name: r.project_name || undefined,
          title: r.title,
          start_date: r.start_date,
          end_date: r.end_date,
          notes: r.notes || '',
          tasks: typeof r.tasks === 'string' ? JSON.parse(r.tasks || '[]') : (r.tasks || []),
          created_at: r.created_at,
          updated_at: r.updated_at,
        }));
      } catch (gErr) {
        console.warn('[MySQL] Could not read gantt_charts table:', gErr);
      }

      return {
        settings,
        team_members,
        clients,
        projects,
        tasks,
        follow_ups,
        activities,
        gantt_charts,
      };
    } catch (err) {
      console.error('[MySQL] Error reading data from Hostinger MySQL:', err);
      return null;
    }
  }

  /**
   * Seeds or overwrites all Hostinger MySQL tables with the schema.
   */
  public async seedAll(schema: DatabaseSchema): Promise<void> {
    if (!this.pool || !this.isConnected) {
      const ok = await this.init();
      if (!ok || !this.pool) return;
    }

    try {
      const s = schema.settings;
      await this.pool.query(
        `INSERT INTO company_settings (id, company_name, company_address, company_phone, company_email, company_logo, logo_url, tagline, currency_symbol, is_password_set, password_hash, salt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           company_name = VALUES(company_name),
           company_address = VALUES(company_address),
           company_phone = VALUES(company_phone),
           company_email = VALUES(company_email),
           company_logo = VALUES(company_logo),
           logo_url = VALUES(logo_url),
           tagline = VALUES(tagline),
           currency_symbol = VALUES(currency_symbol),
           is_password_set = VALUES(is_password_set),
           password_hash = VALUES(password_hash),
           salt = VALUES(salt),
           updated_at = VALUES(updated_at)`,
        [
          s.id || 'company-main',
          s.company_name,
          s.company_address || '',
          s.company_phone || '',
          s.company_email || '',
          s.company_logo || null,
          s.logo_url || null,
          s.tagline || null,
          s.currency_symbol || '৳',
          s.is_password_set ? 1 : 0,
          s.password_hash || '',
          s.salt || '',
          s.created_at || new Date().toISOString(),
          s.updated_at || new Date().toISOString(),
        ]
      );

      // Clean tables for full restore/seed
      await this.pool.query('DELETE FROM team_members');
      await this.pool.query('DELETE FROM clients');
      await this.pool.query('DELETE FROM projects');
      await this.pool.query('DELETE FROM tasks');
      await this.pool.query('DELETE FROM follow_ups');
      await this.pool.query('DELETE FROM activities');
      await this.pool.query('DELETE FROM gantt_charts');

      for (const m of schema.team_members) {
        await this.pool.query(
          `INSERT INTO team_members (id, name, designation, email, phone, avatar, notes, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [m.id, m.name, m.designation, m.email, m.phone, m.avatar || null, m.notes || null, m.status, m.created_at, m.updated_at]
        );
      }

      for (const c of schema.clients) {
        await this.pool.query(
          `INSERT INTO clients (id, name, company, phone, email, address, notes, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.id, c.name, c.company || null, c.phone, c.email || null, c.address || null, c.notes || null, c.status, c.created_at, c.updated_at]
        );
      }

      for (const p of schema.projects) {
        await this.pool.query(
          `INSERT INTO projects (id, project_name, project_type, location, description, client_id, project_lead_id, team_member_ids, priority, status, start_date, expected_completion_date, actual_completion_date, is_archived, archived_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.project_name,
            p.project_type,
            p.location,
            p.description || null,
            p.client_id,
            p.project_lead_id,
            JSON.stringify(p.team_member_ids || []),
            p.priority,
            p.status,
            p.start_date,
            p.expected_completion_date || null,
            p.actual_completion_date || null,
            p.is_archived ? 1 : 0,
            p.archived_at || null,
            p.created_at,
            p.updated_at,
          ]
        );
      }

      for (const t of schema.tasks) {
        await this.pool.query(
          `INSERT INTO tasks (id, project_id, title, description, assigned_to, priority, due_date, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.id, t.project_id, t.title, t.description || null, t.assigned_to || null, t.priority, t.due_date, t.status, t.created_at, t.updated_at]
        );
      }

      for (const f of schema.follow_ups) {
        await this.pool.query(
          `INSERT INTO follow_ups (id, project_id, follow_up_date, method, notes, created_by, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [f.id, f.project_id, f.follow_up_date, f.method, f.notes, f.created_by || null, f.status || 'pending', f.created_at]
        );
      }

      for (const a of schema.activities) {
        await this.pool.query(
          `INSERT INTO activities (id, project_id, team_member_id, activity_type, description, activity_date, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [a.id, a.project_id, a.team_member_id || null, a.activity_type, a.description, a.activity_date, a.created_at]
        );
      }

      for (const g of schema.gantt_charts || []) {
        await this.pool.query(
          `INSERT INTO gantt_charts (id, project_id, project_name, title, start_date, end_date, notes, tasks, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            g.id,
            g.project_id,
            g.project_name || null,
            g.title,
            g.start_date,
            g.end_date,
            g.notes || null,
            JSON.stringify(g.tasks || []),
            g.created_at,
            g.updated_at,
          ]
        );
      }

      console.log('[MySQL] Synced all database records to Hostinger MySQL');
    } catch (err) {
      console.error('[MySQL] Error writing records to Hostinger MySQL:', err);
    }
  }

  /**
   * Safe incremental synchronization using upserts (does NOT delete existing data).
   */
  public async syncAll(schema: DatabaseSchema): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      if (schema.settings) {
        await this.syncSettings(schema.settings);
      }
      for (const m of schema.team_members || []) {
        await this.syncTeamMember(m);
      }
      for (const c of schema.clients || []) {
        await this.syncClient(c);
      }
      for (const p of schema.projects || []) {
        await this.syncProject(p);
      }
      for (const t of schema.tasks || []) {
        await this.syncTask(t);
      }
      for (const f of schema.follow_ups || []) {
        await this.syncFollowUp(f);
      }
      for (const a of schema.activities || []) {
        await this.syncActivity(a);
      }
      for (const g of schema.gantt_charts || []) {
        await this.syncGanttChart(g);
      }
    } catch (err) {
      console.error('[MySQL] Safe syncAll error:', err);
    }
  }

  // --- Granular Operations ---

  public async syncSettings(s: any): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO company_settings (id, company_name, company_address, company_phone, company_email, company_logo, logo_url, tagline, currency_symbol, is_password_set, password_hash, salt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           company_name = VALUES(company_name),
           company_address = VALUES(company_address),
           company_phone = VALUES(company_phone),
           company_email = VALUES(company_email),
           company_logo = VALUES(company_logo),
           logo_url = VALUES(logo_url),
           tagline = VALUES(tagline),
           currency_symbol = VALUES(currency_symbol),
           is_password_set = VALUES(is_password_set),
           password_hash = VALUES(password_hash),
           salt = VALUES(salt),
           updated_at = VALUES(updated_at)`,
        [
          s.id || 'company-main',
          s.company_name,
          s.company_address || '',
          s.company_phone || '',
          s.company_email || '',
          s.company_logo || null,
          s.logo_url || null,
          s.tagline || null,
          s.currency_symbol || '৳',
          s.is_password_set ? 1 : 0,
          s.password_hash || '',
          s.salt || '',
          s.created_at || new Date().toISOString(),
          s.updated_at || new Date().toISOString(),
        ]
      );
    } catch (err) {
      console.error('[MySQL] syncSettings error:', err);
    }
  }

  public async syncProject(p: Project): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO projects (id, project_name, project_type, location, description, client_id, project_lead_id, team_member_ids, priority, status, start_date, expected_completion_date, actual_completion_date, is_archived, archived_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           project_name = VALUES(project_name),
           project_type = VALUES(project_type),
           location = VALUES(location),
           description = VALUES(description),
           client_id = VALUES(client_id),
           project_lead_id = VALUES(project_lead_id),
           team_member_ids = VALUES(team_member_ids),
           priority = VALUES(priority),
           status = VALUES(status),
           start_date = VALUES(start_date),
           expected_completion_date = VALUES(expected_completion_date),
           actual_completion_date = VALUES(actual_completion_date),
           is_archived = VALUES(is_archived),
           archived_at = VALUES(archived_at),
           updated_at = VALUES(updated_at)`,
        [
          p.id,
          p.project_name,
          p.project_type,
          p.location,
          p.description || null,
          p.client_id,
          p.project_lead_id,
          JSON.stringify(p.team_member_ids || []),
          p.priority,
          p.status,
          p.start_date,
          p.expected_completion_date || null,
          p.actual_completion_date || null,
          p.is_archived ? 1 : 0,
          p.archived_at || null,
          p.created_at,
          p.updated_at,
        ]
      );
    } catch (err) {
      console.error('[MySQL] syncProject error:', err);
    }
  }

  public async removeProject(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM projects WHERE id = ?', [id]);
      await this.pool.query('DELETE FROM tasks WHERE project_id = ?', [id]);
      await this.pool.query('DELETE FROM follow_ups WHERE project_id = ?', [id]);
      await this.pool.query('DELETE FROM activities WHERE project_id = ?', [id]);
      await this.pool.query('DELETE FROM gantt_charts WHERE project_id = ?', [id]);
    } catch (err) {
      console.error('[MySQL] removeProject error:', err);
    }
  }

  public async syncClient(c: Client): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO clients (id, name, company, phone, email, address, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           company = VALUES(company),
           phone = VALUES(phone),
           email = VALUES(email),
           address = VALUES(address),
           notes = VALUES(notes),
           status = VALUES(status),
           updated_at = VALUES(updated_at)`,
        [c.id, c.name, c.company || null, c.phone, c.email || null, c.address || null, c.notes || null, c.status, c.created_at, c.updated_at]
      );
    } catch (err) {
      console.error('[MySQL] syncClient error:', err);
    }
  }

  public async removeClient(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM clients WHERE id = ?', [id]);
    } catch (err) {
      console.error('[MySQL] removeClient error:', err);
    }
  }

  public async syncTeamMember(m: TeamMember): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO team_members (id, name, designation, email, phone, avatar, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           designation = VALUES(designation),
           email = VALUES(email),
           phone = VALUES(phone),
           avatar = VALUES(avatar),
           notes = VALUES(notes),
           status = VALUES(status),
           updated_at = VALUES(updated_at)`,
        [m.id, m.name, m.designation, m.email, m.phone, m.avatar || null, m.notes || null, m.status, m.created_at, m.updated_at]
      );
    } catch (err) {
      console.error('[MySQL] syncTeamMember error:', err);
    }
  }

  public async removeTeamMember(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM team_members WHERE id = ?', [id]);
    } catch (err) {
      console.error('[MySQL] removeTeamMember error:', err);
    }
  }

  public async syncTask(t: Task): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO tasks (id, project_id, title, description, assigned_to, priority, due_date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           description = VALUES(description),
           assigned_to = VALUES(assigned_to),
           priority = VALUES(priority),
           due_date = VALUES(due_date),
           status = VALUES(status),
           updated_at = VALUES(updated_at)`,
        [t.id, t.project_id, t.title, t.description || null, t.assigned_to || null, t.priority, t.due_date, t.status, t.created_at, t.updated_at]
      );
    } catch (err) {
      console.error('[MySQL] syncTask error:', err);
    }
  }

  public async removeTask(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    } catch (err) {
      console.error('[MySQL] removeTask error:', err);
    }
  }

  public async syncFollowUp(f: FollowUp): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO follow_ups (id, project_id, follow_up_date, method, notes, created_by, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           follow_up_date = VALUES(follow_up_date),
           method = VALUES(method),
           notes = VALUES(notes),
           status = VALUES(status)`,
        [f.id, f.project_id, f.follow_up_date, f.method, f.notes, f.created_by || null, f.status || 'pending', f.created_at]
      );
    } catch (err) {
      console.error('[MySQL] syncFollowUp error:', err);
    }
  }

  public async removeFollowUp(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM follow_ups WHERE id = ?', [id]);
    } catch (err) {
      console.error('[MySQL] removeFollowUp error:', err);
    }
  }

  public async syncActivity(a: Activity): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO activities (id, project_id, team_member_id, activity_type, description, activity_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           description = VALUES(description),
           activity_type = VALUES(activity_type),
           activity_date = VALUES(activity_date)`,
        [a.id, a.project_id, a.team_member_id || null, a.activity_type, a.description, a.activity_date, a.created_at]
      );
    } catch (err) {
      console.error('[MySQL] syncActivity error:', err);
    }
  }

  public async syncGanttChart(g: GanttChart): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        `INSERT INTO gantt_charts (id, project_id, project_name, title, start_date, end_date, notes, tasks, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           project_id = VALUES(project_id),
           project_name = VALUES(project_name),
           title = VALUES(title),
           start_date = VALUES(start_date),
           end_date = VALUES(end_date),
           notes = VALUES(notes),
           tasks = VALUES(tasks),
           updated_at = VALUES(updated_at)`,
        [
          g.id,
          g.project_id,
          g.project_name || null,
          g.title,
          g.start_date,
          g.end_date,
          g.notes || null,
          JSON.stringify(g.tasks || []),
          g.created_at,
          g.updated_at,
        ]
      );
    } catch (err) {
      console.error('[MySQL] syncGanttChart error:', err);
    }
  }

  public async removeGanttChart(id: string): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query('DELETE FROM gantt_charts WHERE id = ? OR project_id = ?', [id, id]);
    } catch (err) {
      console.error('[MySQL] removeGanttChart error:', err);
    }
  }
}

export const mysqlDb = new MySQLService();
