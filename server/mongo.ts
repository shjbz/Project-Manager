import { MongoClient, Db } from 'mongodb';
import type { DatabaseSchema } from './db.js';
import type {
  CompanySettings,
  TeamMember,
  Client,
  Project,
  Task,
  FollowUp,
  Activity,
} from '../src/types.js';

export interface MongoStatus {
  uriConfigured: boolean;
  connected: boolean;
  databaseName: string | null;
  error: string | null;
}

class MongoService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;
  private connectionPromise: Promise<boolean> | null = null;
  private lastError: string | null = null;
  private dbName: string | null = null;

  constructor() {
    // Lazy or immediate connection attempt
    const uri = process.env.MONGODB_URI;
    if (uri && uri.trim()) {
      this.initConnection(uri.trim());
    }
  }

  public getStatus(): MongoStatus {
    return {
      uriConfigured: Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim()),
      connected: this.isConnected,
      databaseName: this.dbName,
      error: this.lastError,
    };
  }

  public async initConnection(uri?: string): Promise<boolean> {
    const mongoUri = uri || process.env.MONGODB_URI;
    if (!mongoUri || !mongoUri.trim()) {
      this.lastError = 'MONGODB_URI environment variable is not set';
      return false;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        const client = new MongoClient(mongoUri.trim(), {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
        });

        await client.connect();
        this.client = client;
        const targetDbName = process.env.MONGODB_DB_NAME || client.db().databaseName || 'falcon_db';
        this.db = client.db(targetDbName);
        this.dbName = targetDbName;
        this.isConnected = true;
        this.lastError = null;

        console.log(`[MongoDB] Successfully connected to database: "${this.dbName}"`);
        return true;
      } catch (err: any) {
        this.isConnected = false;
        const msg = err?.message || String(err);
        this.lastError = msg;
        console.error('[MongoDB] Connection error:', msg);

        if (msg.includes('whitelisted') || msg.includes('whitelist') || msg.includes('IP') || msg.includes('timed out')) {
          console.warn('[MongoDB] IMPORTANT: Verify your server IP (e.g. 82.180.143.163) or 0.0.0.0/0 is whitelisted in MongoDB Atlas → Network Access.');
        }

        this.connectionPromise = null;
        return false;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Loads all data from MongoDB. If MongoDB collections are empty,
   * returns null so the caller can seed MongoDB with initial/current data.
   */
  public async loadAll(): Promise<DatabaseSchema | null> {
    if (!this.isConnected || !this.db) {
      const ok = await this.initConnection();
      if (!ok || !this.db) return null;
    }

    try {
      const settingsColl = this.db.collection('settings');
      const settingsDoc = await settingsColl.findOne({ id: 'company-main' });

      // If settings does not exist in MongoDB, collections are considered empty
      if (!settingsDoc) {
        return null;
      }

      const teamColl = this.db.collection<TeamMember>('team_members');
      const clientsColl = this.db.collection<Client>('clients');
      const projectsColl = this.db.collection<Project>('projects');
      const tasksColl = this.db.collection<Task>('tasks');
      const followUpsColl = this.db.collection<FollowUp>('follow_ups');
      const activitiesColl = this.db.collection<Activity>('activities');

      const [team_members, clients, projects, tasks, follow_ups, activities] = await Promise.all([
        teamColl.find({}).toArray(),
        clientsColl.find({}).toArray(),
        projectsColl.find({}).toArray(),
        tasksColl.find({}).toArray(),
        followUpsColl.find({}).toArray(),
        activitiesColl.find({}).toArray(),
      ]);

      // Strip mongo _id from objects to match application schema
      const clean = (item: any) => {
        const { _id, ...rest } = item;
        return rest;
      };

      const { _id, ...cleanSettings } = settingsDoc as any;

      return {
        settings: cleanSettings,
        team_members: team_members.map(clean),
        clients: clients.map(clean),
        projects: projects.map(clean),
        tasks: tasks.map(clean),
        follow_ups: follow_ups.map(clean),
        activities: activities.map(clean),
      };
    } catch (err) {
      console.error('[MongoDB] Error reading from collections:', err);
      return null;
    }
  }

  /**
   * Seeds or replaces all MongoDB collections with the provided schema.
   */
  public async seedAll(schema: DatabaseSchema): Promise<void> {
    if (!this.isConnected || !this.db) {
      const ok = await this.initConnection();
      if (!ok || !this.db) return;
    }

    try {
      const settingsColl = this.db.collection('settings');
      const teamColl = this.db.collection('team_members');
      const clientsColl = this.db.collection('clients');
      const projectsColl = this.db.collection('projects');
      const tasksColl = this.db.collection('tasks');
      const followUpsColl = this.db.collection('follow_ups');
      const activitiesColl = this.db.collection('activities');

      // Upsert settings
      await settingsColl.replaceOne({ id: schema.settings.id }, schema.settings, { upsert: true });

      // Overwrite or bulk sync other collections
      await Promise.all([
        teamColl.deleteMany({}),
        clientsColl.deleteMany({}),
        projectsColl.deleteMany({}),
        tasksColl.deleteMany({}),
        followUpsColl.deleteMany({}),
        activitiesColl.deleteMany({}),
      ]);

      if (schema.team_members.length) await teamColl.insertMany(schema.team_members.map((x) => ({ ...x })));
      if (schema.clients.length) await clientsColl.insertMany(schema.clients.map((x) => ({ ...x })));
      if (schema.projects.length) await projectsColl.insertMany(schema.projects.map((x) => ({ ...x })));
      if (schema.tasks.length) await tasksColl.insertMany(schema.tasks.map((x) => ({ ...x })));
      if (schema.follow_ups.length) await followUpsColl.insertMany(schema.follow_ups.map((x) => ({ ...x })));
      if (schema.activities.length) await activitiesColl.insertMany(schema.activities.map((x) => ({ ...x })));

      console.log('[MongoDB] Successfully synced all collections to MongoDB Atlas');
    } catch (err) {
      console.error('[MongoDB] Error writing all collections:', err);
    }
  }

  // --- Granular Persistence Operations ---

  public async syncSettings(settings: any): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('settings').replaceOne({ id: settings.id }, settings, { upsert: true });
    } catch (err) {
      console.error('[MongoDB] Error updating settings:', err);
    }
  }

  public async syncProject(project: Project): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('projects').replaceOne({ id: project.id }, project, { upsert: true });
    } catch (err) {
      console.error('[MongoDB] Error saving project:', err);
    }
  }

  public async removeProject(id: string): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('projects').deleteOne({ id });
      await this.db.collection('tasks').deleteMany({ project_id: id });
      await this.db.collection('follow_ups').deleteMany({ project_id: id });
      await this.db.collection('activities').deleteMany({ project_id: id });
    } catch (err) {
      console.error('[MongoDB] Error removing project:', err);
    }
  }

  public async syncClient(client: Client): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('clients').replaceOne({ id: client.id }, client, { upsert: true });
    } catch (err) {
      console.error('[MongoDB] Error saving client:', err);
    }
  }

  public async removeClient(id: string): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('clients').deleteOne({ id });
    } catch (err) {
      console.error('[MongoDB] Error removing client:', err);
    }
  }

  public async syncTeamMember(member: TeamMember): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('team_members').replaceOne({ id: member.id }, member, { upsert: true });
    } catch (err) {
      console.error('[MongoDB] Error saving team member:', err);
    }
  }

  public async removeTeamMember(id: string): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('team_members').deleteOne({ id });
    } catch (err) {
      console.error('[MongoDB] Error removing team member:', err);
    }
  }

  public async syncTask(task: Task): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('tasks').replaceOne({ id: task.id }, task, { upsert: true });
    } catch (err) {
      console.error('[MongoDB] Error saving task:', err);
    }
  }

  public async removeTask(id: string): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('tasks').deleteOne({ id });
    } catch (err) {
      console.error('[MongoDB] Error removing task:', err);
    }
  }

  public async syncFollowUp(fu: FollowUp): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('follow_ups').replaceOne({ id: fu.id }, fu, { upsert: true });
    } catch (err) {
      console.error('[MongoDB] Error saving follow-up:', err);
    }
  }

  public async removeFollowUp(id: string): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('follow_ups').deleteOne({ id });
    } catch (err) {
      console.error('[MongoDB] Error removing follow-up:', err);
    }
  }

  public async syncActivity(act: Activity): Promise<void> {
    if (!this.isConnected || !this.db) return;
    try {
      await this.db.collection('activities').replaceOne({ id: act.id }, act, { upsert: true });
    } catch (err) {
      console.error('[MongoDB] Error saving activity:', err);
    }
  }
}

export const mongo = new MongoService();
