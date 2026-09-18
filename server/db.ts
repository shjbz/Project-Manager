import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { mysqlDb } from './mysql.js';
import type {
  CompanySettings,
  TeamMember,
  Client,
  Project,
  Task,
  FollowUp,
  Activity,
  HealthStatus,
} from '../src/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  settings: CompanySettings & { password_hash: string; salt: string; is_password_set?: boolean };
  team_members: TeamMember[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  follow_ups: FollowUp[];
  activities: Activity[];
}

// Password hashing helpers
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!password || !hash || !salt) return false;
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const testBuf = Buffer.from(testHash, 'hex');
    if (hashBuf.length !== testBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, testBuf);
  } catch {
    return false;
  }
}

function getInitialDatabase(): DatabaseSchema {
  const team: TeamMember[] = [
    {
      id: 'tm-1',
      name: 'Arif Hasan',
      designation: 'Principal Project Architect',
      email: 'arif@falconeng.com',
      phone: '+880 1711-000001',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      notes: 'Lead architect handling residential luxury & major structural renovations.',
      created_at: '2026-01-10T09:00:00.000Z',
      updated_at: '2026-09-10T10:00:00.000Z',
    },
    {
      id: 'tm-2',
      name: 'Shuvo Rahman',
      designation: 'Senior Interior Designer',
      email: 'shuvo@falconeng.com',
      phone: '+880 1711-000002',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      notes: 'Expert in commercial interiors, space planning, lighting design, and millwork details.',
      created_at: '2026-01-15T09:00:00.000Z',
      updated_at: '2026-09-12T10:00:00.000Z',
    },
    {
      id: 'tm-3',
      name: 'Nabil Ahmed',
      designation: 'Site & Structural Engineer',
      email: 'nabil@falconeng.com',
      phone: '+880 1711-000003',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      notes: 'Oversees site execution, RCC inspection, MEP coordination, and vendor supervision.',
      created_at: '2026-02-01T09:00:00.000Z',
      updated_at: '2026-09-08T10:00:00.000Z',
    },
    {
      id: 'tm-4',
      name: 'Tania Sultana',
      designation: 'BOQ & Material Specialist',
      email: 'tania@falconeng.com',
      phone: '+880 1711-000004',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      notes: 'Cost estimation, vendor negotiations, material sampling, and procurement tracking.',
      created_at: '2026-02-15T09:00:00.000Z',
      updated_at: '2026-09-14T10:00:00.000Z',
    },
    {
      id: 'tm-5',
      name: 'Fahim Chowdhury',
      designation: 'Junior Architect & 3D Visualizer',
      email: 'fahim@falconeng.com',
      phone: '+880 1711-000005',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      status: 'active',
      notes: 'Produces 3D renderings, municipal drawing submissions, and working drawings.',
      created_at: '2026-03-01T09:00:00.000Z',
      updated_at: '2026-09-11T10:00:00.000Z',
    },
  ];

  const clients: Client[] = [
    {
      id: 'cl-1',
      name: 'Mr. Rahman',
      company: 'Rahman Holdings Ltd.',
      phone: '+880 1819-112233',
      email: 'rahman@rahmanholdings.com',
      address: 'Plot 18, Road 45, Gulshan-2, Dhaka',
      notes: 'High-value repeat client with ongoing luxury residential and commercial developments.',
      status: 'active',
      created_at: '2026-01-20T08:00:00.000Z',
      updated_at: '2026-09-12T09:00:00.000Z',
    },
    {
      id: 'cl-2',
      name: 'Engr. Shafiul Islam',
      company: 'ABC Corporate Ltd.',
      phone: '+880 1912-334455',
      email: 'shafiul@abccorp.com',
      address: 'Tower 7, Kamal Ataturk Avenue, Banani, Dhaka',
      notes: 'Corporate client setting up a 12,000 sq ft modern technology office space.',
      status: 'active',
      created_at: '2026-02-10T08:00:00.000Z',
      updated_at: '2026-09-14T11:00:00.000Z',
    },
    {
      id: 'cl-3',
      name: 'Karim Ullah',
      company: 'Karim Properties & Estates',
      phone: '+880 1715-998877',
      email: 'karim@karimproperties.com',
      address: 'House 64, Road 27, Dhanmondi R/A, Dhaka',
      notes: 'Real estate investor with multiple duplex renovation and architectural projects.',
      status: 'active',
      created_at: '2026-02-28T08:00:00.000Z',
      updated_at: '2026-09-05T09:00:00.000Z',
    },
    {
      id: 'cl-4',
      name: 'Dr. Farhana Haque',
      company: 'Private Client',
      phone: '+880 1611-445566',
      email: 'farhana.haque@gmail.com',
      address: 'Sector 4, Road 7, Uttara, Dhaka',
      notes: '3-storey modern sustainable residential villa with landscaped rooftop.',
      status: 'active',
      created_at: '2026-03-05T08:00:00.000Z',
      updated_at: '2026-09-08T09:00:00.000Z',
    },
  ];

  const projects: Project[] = [
    {
      id: 'proj-1',
      project_name: 'Gulshan Residence',
      project_type: 'Residential Interior',
      location: 'Gulshan 2, Dhaka',
      description: '4,500 sq ft duplex luxury interior detailing, custom brass joinery, acoustic cinema room, and bespoke master suite.',
      client_id: 'cl-1',
      project_lead_id: 'tm-1',
      team_member_ids: ['tm-1', 'tm-2', 'tm-3'],
      priority: 'urgent',
      status: 'active',
      start_date: '2026-08-01',
      expected_completion_date: '2026-11-30',
      created_at: '2026-08-01T08:00:00.000Z',
      updated_at: '2026-09-12T14:30:00.000Z',
    },
    {
      id: 'proj-2',
      project_name: 'Banani Office',
      project_type: 'Commercial Interior',
      location: 'Banani C/A, Dhaka',
      description: 'Turnkey interior execution for tech corporate headquarters including open plan workstations, boardrooms, and lounge cafeteria.',
      client_id: 'cl-2',
      project_lead_id: 'tm-2',
      team_member_ids: ['tm-2', 'tm-1', 'tm-4'],
      priority: 'standard',
      status: 'active',
      start_date: '2026-07-15',
      expected_completion_date: '2026-10-31',
      created_at: '2026-07-15T08:00:00.000Z',
      updated_at: '2026-09-14T16:00:00.000Z',
    },
    {
      id: 'proj-3',
      project_name: 'Dhanmondi Interior',
      project_type: 'Renovation',
      location: 'Road 27, Dhanmondi, Dhaka',
      description: 'Complete floor overhaul, structural partition realignment, and imported sanitary fixture installations.',
      client_id: 'cl-3',
      project_lead_id: 'tm-3',
      team_member_ids: ['tm-3', 'tm-2'],
      priority: 'low',
      status: 'follow_up_pending',
      start_date: '2026-08-10',
      expected_completion_date: '2026-12-15',
      created_at: '2026-08-10T08:00:00.000Z',
      updated_at: '2026-09-05T11:00:00.000Z',
    },
    {
      id: 'proj-4',
      project_name: 'Uttara Villa',
      project_type: 'Architecture',
      location: 'Sector 4, Uttara, Dhaka',
      description: 'Modern residential villa architecture with exposed concrete fins, cantilevered terraces, and rainwater harvesting system.',
      client_id: 'cl-4',
      project_lead_id: 'tm-1',
      team_member_ids: ['tm-1', 'tm-5', 'tm-3'],
      priority: 'standard',
      status: 'active',
      start_date: '2026-06-01',
      expected_completion_date: '2027-02-28',
      created_at: '2026-06-01T08:00:00.000Z',
      updated_at: '2026-09-08T12:00:00.000Z',
    },
    {
      id: 'proj-5',
      project_name: 'Mirpur Residence',
      project_type: 'Architecture & Construction',
      location: 'Mirpur DOHS, Dhaka',
      description: 'Six-storied apartment complex architecture drawing submission and approval process.',
      client_id: 'cl-3',
      project_lead_id: 'tm-5',
      team_member_ids: ['tm-5', 'tm-1'],
      priority: 'urgent',
      status: 'at_risk',
      start_date: '2026-07-01',
      expected_completion_date: '2026-11-15',
      created_at: '2026-07-01T08:00:00.000Z',
      updated_at: '2026-09-01T15:00:00.000Z',
    },
    {
      id: 'proj-6',
      project_name: 'Bashundhara Penthouse',
      project_type: 'Interior',
      location: 'Block I, Bashundhara R/A, Dhaka',
      description: 'High-end minimalist penthouse interior with smart home automation and Italian marble flooring.',
      client_id: 'cl-1',
      project_lead_id: 'tm-2',
      team_member_ids: ['tm-2', 'tm-4'],
      priority: 'standard',
      status: 'completed',
      start_date: '2026-03-01',
      expected_completion_date: '2026-08-25',
      actual_completion_date: '2026-08-28',
      created_at: '2026-03-01T08:00:00.000Z',
      updated_at: '2026-08-28T18:00:00.000Z',
    },
  ];

  const tasks: Task[] = [
    {
      id: 'tsk-1',
      project_id: 'proj-1',
      title: 'Prepare revised kitchen layout & Final BOQ',
      description: 'Incorporate client feedback on island counter width and finalize vendor pricing for acrylic cabinets.',
      assigned_to: 'tm-2',
      priority: 'urgent',
      due_date: '2026-09-17',
      status: 'in_progress',
      created_at: '2026-09-12T10:00:00.000Z',
      updated_at: '2026-09-12T10:00:00.000Z',
    },
    {
      id: 'tsk-2',
      project_id: 'proj-2',
      title: 'Client Meeting for material selection',
      description: 'Present acoustic ceiling samples and carpet tiles at client head office.',
      assigned_to: 'tm-1',
      priority: 'standard',
      due_date: '2026-09-18',
      status: 'pending',
      created_at: '2026-09-14T09:00:00.000Z',
      updated_at: '2026-09-14T09:00:00.000Z',
    },
    {
      id: 'tsk-3',
      project_id: 'proj-3',
      title: 'Call Client regarding revised drawing approvals',
      description: 'Check if Mr. Karim has reviewed the bathroom plumbing and tile pattern layout.',
      assigned_to: 'tm-3',
      priority: 'low',
      due_date: '2026-09-16',
      status: 'pending',
      created_at: '2026-09-05T10:00:00.000Z',
      updated_at: '2026-09-05T10:00:00.000Z',
    },
    {
      id: 'tsk-4',
      project_id: 'proj-4',
      title: 'Site foundation inspection and soil report signoff',
      description: 'Perform structural core test inspection with structural consultant.',
      assigned_to: 'tm-3',
      priority: 'standard',
      due_date: '2026-09-20',
      status: 'pending',
      created_at: '2026-09-08T10:00:00.000Z',
      updated_at: '2026-09-08T10:00:00.000Z',
    },
    {
      id: 'tsk-5',
      project_id: 'proj-5',
      title: 'Municipal drawing submission & setback compliance report',
      description: 'Urgent submission required to prevent construction sanction delays.',
      assigned_to: 'tm-5',
      priority: 'urgent',
      due_date: '2026-09-14', // Overdue!
      status: 'pending',
      created_at: '2026-09-01T10:00:00.000Z',
      updated_at: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'tsk-6',
      project_id: 'proj-1',
      title: 'Electrical conduit routing verification',
      description: 'Ensure smart switches and dimmer points align with false ceiling layout.',
      assigned_to: 'tm-3',
      priority: 'standard',
      due_date: '2026-09-22',
      status: 'pending',
      created_at: '2026-09-12T11:00:00.000Z',
      updated_at: '2026-09-12T11:00:00.000Z',
    },
  ];

  const follow_ups: FollowUp[] = [
    {
      id: 'fu-1',
      project_id: 'proj-1',
      follow_up_date: '2026-09-17',
      method: 'Meeting',
      notes: 'Review revised kitchen layout and final BOQ sign-off at Rahman Holdings office.',
      created_by: 'tm-1',
      status: 'pending',
      created_at: '2026-09-12T14:30:00.000Z',
    },
    {
      id: 'fu-2',
      project_id: 'proj-2',
      follow_up_date: '2026-09-16',
      method: 'WhatsApp',
      notes: 'Confirm attendee list and agenda for the upcoming HVAC & lighting presentation.',
      created_by: 'tm-2',
      status: 'pending',
      created_at: '2026-09-14T16:00:00.000Z',
    },
    {
      id: 'fu-3',
      project_id: 'proj-3',
      follow_up_date: '2026-09-15', // Due Today!
      method: 'Phone',
      notes: 'Follow up with Mr. Karim to confirm marble procurement budget.',
      created_by: 'tm-3',
      status: 'pending',
      created_at: '2026-09-05T11:00:00.000Z',
    },
    {
      id: 'fu-4',
      project_id: 'proj-5',
      follow_up_date: '2026-09-13', // Overdue!
      method: 'Site Visit',
      notes: 'Follow up on structural engineer recommendation regarding retaining wall.',
      created_by: 'tm-5',
      status: 'pending',
      created_at: '2026-09-01T15:00:00.000Z',
    },
    {
      id: 'fu-5',
      project_id: 'proj-4',
      follow_up_date: '2026-09-17',
      method: 'Phone',
      notes: 'Call Dr. Farhana regarding landscape architect recommendation.',
      created_by: 'tm-1',
      status: 'pending',
      created_at: '2026-09-08T12:00:00.000Z',
    },
  ];

  const activities: Activity[] = [
    {
      id: 'act-1',
      project_id: 'proj-1',
      team_member_id: 'tm-1',
      activity_type: 'Approval',
      description: 'Client approved revised floor plan and electrical lighting layout.',
      activity_date: '2026-09-17',
      created_at: '2026-09-17T11:00:00.000Z',
    },
    {
      id: 'act-2',
      project_id: 'proj-1',
      team_member_id: 'tm-2',
      activity_type: 'Design',
      description: 'Updated furniture layout and 3D perspectives for master bedroom suite.',
      activity_date: '2026-09-15',
      created_at: '2026-09-15T15:20:00.000Z',
    },
    {
      id: 'act-3',
      project_id: 'proj-1',
      team_member_id: 'tm-1',
      activity_type: 'Client Communication',
      description: 'Followed up with client regarding BOQ materials breakdown and kitchen marble choice.',
      activity_date: '2026-09-12',
      created_at: '2026-09-12T14:30:00.000Z',
    },
    {
      id: 'act-4',
      project_id: 'proj-1',
      team_member_id: 'tm-3',
      activity_type: 'Site Visit',
      description: 'Site measurement completed; verified ceiling heights and electrical duct passages.',
      activity_date: '2026-09-09',
      created_at: '2026-09-09T10:00:00.000Z',
    },
    {
      id: 'act-5',
      project_id: 'proj-1',
      team_member_id: 'tm-1',
      activity_type: 'Meeting',
      description: 'Initial client briefing and concept moodboard presentation at office.',
      activity_date: '2026-08-05',
      created_at: '2026-08-05T14:00:00.000Z',
    },
    {
      id: 'act-6',
      project_id: 'proj-2',
      team_member_id: 'tm-2',
      activity_type: 'BOQ',
      description: 'Prepared revised BOQ for 12,000 sqft modular acoustic partitions.',
      activity_date: '2026-09-14',
      created_at: '2026-09-14T16:00:00.000Z',
    },
    {
      id: 'act-7',
      project_id: 'proj-2',
      team_member_id: 'tm-4',
      activity_type: 'Material',
      description: 'Received sample carpet tiles and glass film specifications from supplier.',
      activity_date: '2026-09-11',
      created_at: '2026-09-11T12:00:00.000Z',
    },
    {
      id: 'act-8',
      project_id: 'proj-3',
      team_member_id: 'tm-3',
      activity_type: 'Client Communication',
      description: 'Sent revised bathroom plumbing layout to Mr. Karim for review.',
      activity_date: '2026-09-05',
      created_at: '2026-09-05T11:00:00.000Z',
    },
    {
      id: 'act-9',
      project_id: 'proj-4',
      team_member_id: 'tm-1',
      activity_type: 'Site Visit',
      description: 'Conducted contour survey & tree preservation mapping on site.',
      activity_date: '2026-09-08',
      created_at: '2026-09-08T12:00:00.000Z',
    },
    {
      id: 'act-10',
      project_id: 'proj-5',
      team_member_id: 'tm-5',
      activity_type: 'Drawing',
      description: 'Completed setback revision drawings and structural load calculations.',
      activity_date: '2026-09-01',
      created_at: '2026-09-01T15:00:00.000Z',
    },
  ];

  return {
    settings: {
      id: 'company-main',
      company_name: 'Falcon Engineering & Construction',
      company_address: 'Falcon Tower, Level 8, 45 Commercial Avenue, Dhaka 1212',
      company_phone: '+880 1711-234567',
      company_email: 'contact@falconeng.com',
      currency_symbol: '৳',
      is_password_set: false,
      password_hash: '',
      salt: '',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-09-16T00:00:00.000Z',
    },
    team_members: team,
    clients,
    projects,
    tasks,
    follow_ups,
    activities,
  };
}

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDatabase();
      this.saveDataDirect(initial);
      return initial;
    }
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('Failed to read db.json, recreating initial:', err);
      const initial = getInitialDatabase();
      this.saveDataDirect(initial);
      return initial;
    }
  }

  private saveDataDirect(data: DatabaseSchema) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  private mysqlSyncTimer: NodeJS.Timeout | null = null;

  public async initMySQL(): Promise<void> {
    try {
      const ok = await mysqlDb.init();
      if (ok) {
        const mysqlData = await mysqlDb.loadAll();
        if (mysqlData && mysqlData.settings) {
          console.log('[MySQL] Loaded existing data from Hostinger MySQL');
          this.data = mysqlData;
          this.saveDataDirect(this.data);
        } else {
          console.log('[MySQL] Seeding Hostinger MySQL tables with workspace data...');
          await mysqlDb.seedAll(this.data);
        }
      }
    } catch (err) {
      console.error('[MySQL] initMySQL error:', err);
    }
  }

  private scheduleMySQLSync() {
    if (this.mysqlSyncTimer) {
      clearTimeout(this.mysqlSyncTimer);
    }
    this.mysqlSyncTimer = setTimeout(() => {
      mysqlDb.syncAll(this.data).catch((err) => {
        console.error('[MySQL] Background sync error:', err);
      });
    }, 150);
  }

  public save() {
    this.saveDataDirect(this.data);
    this.scheduleMySQLSync();
  }

  public getRaw(): DatabaseSchema {
    return this.data;
  }

  public restore(imported: DatabaseSchema) {
    if (!imported.settings || !Array.isArray(imported.projects)) {
      throw new Error('Invalid database format');
    }
    this.data = imported;
    this.save();
  }

  public reset(): DatabaseSchema {
    const initial = getInitialDatabase();
    this.data = initial;
    this.save();
    return this.data;
  }

  // --- Settings & Auth ---
  public isPasswordSet(): boolean {
    return Boolean(
      this.data.settings.is_password_set &&
      this.data.settings.password_hash &&
      this.data.settings.salt
    );
  }

  public getSettings(): CompanySettings {
    const { password_hash, salt, ...safe } = this.data.settings;
    return {
      ...safe,
      is_password_set: this.isPasswordSet(),
    };
  }

  public updateSettings(updates: Partial<CompanySettings>): CompanySettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.getSettings();
  }

  public verifyCompanyPassword(password: string): boolean {
    if (!this.isPasswordSet()) {
      return false;
    }
    return verifyPassword(password, this.data.settings.password_hash, this.data.settings.salt);
  }

  public setInitialPassword(password: string): boolean {
    const { hash, salt } = hashPassword(password);
    this.data.settings.password_hash = hash;
    this.data.settings.salt = salt;
    this.data.settings.is_password_set = true;
    this.data.settings.updated_at = new Date().toISOString();
    this.save();
    return true;
  }

  public changeCompanyPassword(currentPassword: string, newPassword: string): boolean {
    if (!this.isPasswordSet()) {
      return this.setInitialPassword(newPassword);
    }
    if (!this.verifyCompanyPassword(currentPassword)) {
      return false;
    }
    const { hash, salt } = hashPassword(newPassword);
    this.data.settings.password_hash = hash;
    this.data.settings.salt = salt;
    this.data.settings.is_password_set = true;
    this.data.settings.updated_at = new Date().toISOString();
    this.save();
    return true;
  }

  // --- Clients ---
  public getClients(): Client[] {
    return this.data.clients.map((c) => {
      const clientProjects = this.data.projects.filter((p) => p.client_id === c.id);
      return {
        ...c,
        projectCount: clientProjects.length,
        projects: clientProjects.map((p) => ({
          id: p.id,
          project_name: p.project_name,
          project_type: p.project_type,
          status: p.status,
          priority: p.priority,
        })),
      };
    });
  }

  public getClientById(id: string): Client | undefined {
    return this.getClients().find((c) => c.id === id);
  }

  public createClient(input: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client {
    const newClient: Client = {
      id: 'cl-' + Date.now(),
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.clients.unshift(newClient);
    this.save();
    return newClient;
  }

  public updateClient(id: string, updates: Partial<Client>): Client | null {
    const idx = this.data.clients.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.data.clients[idx] = {
      ...this.data.clients[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.clients[idx];
  }

  public deleteClient(id: string): boolean {
    const initialLen = this.data.clients.length;
    this.data.clients = this.data.clients.filter((c) => c.id !== id);
    if (this.data.clients.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Team Members ---
  public getTeam(): TeamMember[] {
    const todayStr = '2026-09-15';
    return this.data.team_members.map((m) => {
      const assigned = this.data.projects.filter(
        (p) => p.project_lead_id === m.id || (p.team_member_ids && p.team_member_ids.includes(m.id))
      );
      const active = assigned.filter((p) => p.status === 'active' || p.status === 'at_risk');
      const urgent = assigned.filter((p) => p.priority === 'urgent' && p.status !== 'completed' && p.status !== 'cancelled');
      const followUp = assigned.filter((p) => p.status === 'follow_up_pending');

      const overdueProjects = assigned.filter((p) => {
        if (p.status === 'completed' || p.status === 'cancelled') return false;
        // check if project has overdue task or followup
        const projectTasks = this.data.tasks.filter((t) => t.project_id === p.id && t.status !== 'completed');
        const hasOverdueTask = projectTasks.some((t) => t.due_date < todayStr);
        const projectFollowUps = this.data.follow_ups.filter((f) => f.project_id === p.id && f.status !== 'completed');
        const hasOverdueFollowUp = projectFollowUps.some((f) => f.follow_up_date < todayStr);
        return hasOverdueTask || hasOverdueFollowUp;
      });

      return {
        ...m,
        totalProjectsCount: assigned.length,
        activeProjectsCount: active.length,
        urgentProjectsCount: urgent.length,
        followUpPendingCount: followUp.length,
        overdueProjectsCount: overdueProjects.length,
      };
    });
  }

  public getTeamMemberById(id: string): TeamMember | undefined {
    return this.getTeam().find((m) => m.id === id);
  }

  public createTeamMember(input: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>): TeamMember {
    const newMember: TeamMember = {
      id: 'tm-' + Date.now(),
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.team_members.push(newMember);
    this.save();
    return newMember;
  }

  public updateTeamMember(id: string, updates: Partial<TeamMember>): TeamMember | null {
    const idx = this.data.team_members.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    this.data.team_members[idx] = {
      ...this.data.team_members[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.team_members[idx];
  }

  public deleteTeamMember(id: string, reassignToMemberId?: string): boolean {
    const initialLen = this.data.team_members.length;
    this.data.team_members = this.data.team_members.filter((m) => m.id !== id);
    if (this.data.team_members.length !== initialLen) {
      if (reassignToMemberId) {
        // Reassign project leads and team memberships
        this.data.projects.forEach((p) => {
          if (p.project_lead_id === id) {
            p.project_lead_id = reassignToMemberId;
            if (!p.team_member_ids) p.team_member_ids = [];
            if (!p.team_member_ids.includes(reassignToMemberId)) {
              p.team_member_ids.push(reassignToMemberId);
            }
          }
          if (p.team_member_ids && p.team_member_ids.includes(id)) {
            p.team_member_ids = p.team_member_ids.filter((mid) => mid !== id);
            if (!p.team_member_ids.includes(reassignToMemberId)) {
              p.team_member_ids.push(reassignToMemberId);
            }
          }
        });
        // Reassign tasks
        this.data.tasks.forEach((t) => {
          if (t.assigned_to === id) {
            t.assigned_to = reassignToMemberId;
          }
        });
      } else {
        // Remove from team_member_ids without replacement
        this.data.projects.forEach((p) => {
          if (p.team_member_ids && p.team_member_ids.includes(id)) {
            p.team_member_ids = p.team_member_ids.filter((mid) => mid !== id);
          }
        });
      }
      this.save();
      return true;
    }
    return false;
  }

  // --- Projects ---
  public getProjects(filter?: {
    search?: string;
    priority?: string;
    status?: string;
    leadId?: string;
    clientId?: string;
    projectType?: string;
    dueDate?: string;
    sortBy?: string;
  }): Project[] {
    const todayStr = '2026-09-15';
    const teamMap = new Map(this.data.team_members.map((m) => [m.id, m]));
    const clientMap = new Map(this.data.clients.map((c) => [c.id, c]));

    let list = this.data.projects.map((p) => {
      const client = clientMap.get(p.client_id);
      const lead = teamMap.get(p.project_lead_id);
      const members = (p.team_member_ids || []).map((mid) => teamMap.get(mid)).filter(Boolean) as TeamMember[];

      const projectTasks = this.data.tasks
        .filter((t) => t.project_id === p.id)
        .map((t) => ({ ...t, assigned_member: t.assigned_to ? teamMap.get(t.assigned_to) : undefined }))
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      const projectFollowUps = this.data.follow_ups
        .filter((f) => f.project_id === p.id)
        .map((f) => ({ ...f, creator_member: f.created_by ? teamMap.get(f.created_by) : undefined }))
        .sort((a, b) => b.follow_up_date.localeCompare(a.follow_up_date));

      const projectActivities = this.data.activities
        .filter((a) => a.project_id === p.id)
        .map((a) => ({ ...a, team_member: a.team_member_id ? teamMap.get(a.team_member_id) : undefined }))
        .sort((a, b) => b.activity_date.localeCompare(a.activity_date) || b.created_at.localeCompare(a.created_at));

      // Latest past follow-up (<= todayStr)
      const pastFollowUps = projectFollowUps.filter((f) => f.follow_up_date <= todayStr);
      const last_follow_up = pastFollowUps[0] || projectFollowUps[projectFollowUps.length - 1];

      // Next upcoming or pending follow-up
      const pendingFollowUps = projectFollowUps.filter((f) => f.status !== 'completed');
      const next_follow_up = pendingFollowUps.find((f) => f.follow_up_date >= todayStr) || pendingFollowUps[0];

      // Next pending task
      const pendingTasks = projectTasks.filter((t) => t.status !== 'completed');
      const next_task = pendingTasks[0];

      // Check overdue status
      const hasOverdueTask = pendingTasks.some((t) => t.due_date < todayStr);
      const hasOverdueFollowUp = pendingFollowUps.some((f) => f.follow_up_date < todayStr);
      const is_overdue = p.status !== 'completed' && p.status !== 'cancelled' && (hasOverdueTask || hasOverdueFollowUp);

      // Automated Project Health status logic (spec #45):
      // On Track: No overdue tasks or follow-ups.
      // Follow-up Needed: Follow-up date has arrived or is approaching (today or within 2 days), or status is follow_up_pending.
      // At Risk: Important task/deadline approaching without completion, or explicit status at_risk.
      // Overdue: Task or follow-up deadline has passed.
      let health_status: HealthStatus = 'on_track';
      if (p.status === 'completed') {
        health_status = 'completed';
      } else if (is_overdue) {
        health_status = 'overdue';
      } else if (p.status === 'at_risk') {
        health_status = 'at_risk';
      } else if (p.status === 'follow_up_pending' || (next_follow_up && next_follow_up.follow_up_date <= todayStr)) {
        health_status = 'follow_up_needed';
      }

      return {
        ...p,
        client,
        project_lead: lead,
        team_members: members,
        tasks: projectTasks,
        follow_ups: projectFollowUps,
        activities: projectActivities,
        last_follow_up,
        next_follow_up,
        next_task,
        health_status,
        is_overdue,
      };
    });

    // Apply filters
    if (filter) {
      if (filter.search) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(
          (p) =>
            p.project_name.toLowerCase().includes(q) ||
            p.location.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            (p.client && (p.client.name.toLowerCase().includes(q) || (p.client.company && p.client.company.toLowerCase().includes(q)))) ||
            (p.project_lead && p.project_lead.name.toLowerCase().includes(q)) ||
            (p.team_members && p.team_members.some((m) => m.name.toLowerCase().includes(q)))
        );
      }
      if (filter.priority && filter.priority !== 'all') {
        list = list.filter((p) => p.priority === filter.priority);
      }
      if (filter.status && filter.status !== 'all') {
        list = list.filter((p) => p.status === filter.status);
      }
      if (filter.leadId && filter.leadId !== 'all') {
        list = list.filter((p) => p.project_lead_id === filter.leadId || p.team_member_ids?.includes(filter.leadId!));
      }
      if (filter.clientId && filter.clientId !== 'all') {
        list = list.filter((p) => p.client_id === filter.clientId);
      }
      if (filter.projectType && filter.projectType !== 'all') {
        list = list.filter((p) => p.project_type.toLowerCase() === filter.projectType?.toLowerCase());
      }
      if (filter.dueDate) {
        if (filter.dueDate === 'overdue') {
          list = list.filter((p) => p.is_overdue);
        } else if (filter.dueDate === 'today') {
          list = list.filter((p) => p.next_task?.due_date === todayStr || p.next_follow_up?.follow_up_date === todayStr);
        } else if (filter.dueDate === 'this_week') {
          // Within 7 days of 2026-09-15
          list = list.filter(
            (p) =>
              (p.next_task?.due_date && p.next_task.due_date >= todayStr && p.next_task.due_date <= '2026-09-22') ||
              (p.next_follow_up?.follow_up_date && p.next_follow_up.follow_up_date >= todayStr && p.next_follow_up.follow_up_date <= '2026-09-22')
          );
        }
      }

      // Sorting (Spec #36: Default: Urgent -> Standard -> Low, within each priority: Overdue -> Due Soon -> Normal)
      const sortBy = filter.sortBy || 'default';
      list.sort((a, b) => {
        if (sortBy === 'default') {
          const prioScore: Record<string, number> = { urgent: 3, standard: 2, low: 1 };
          const pDiff = (prioScore[b.priority] || 0) - (prioScore[a.priority] || 0);
          if (pDiff !== 0) return pDiff;

          // within priority, overdue comes first
          if (a.is_overdue && !b.is_overdue) return -1;
          if (!a.is_overdue && b.is_overdue) return 1;

          // Next sort by next task due date if available
          const dueA = a.next_task?.due_date || '9999-99-99';
          const dueB = b.next_task?.due_date || '9999-99-99';
          return dueA.localeCompare(dueB);
        } else if (sortBy === 'name') {
          return a.project_name.localeCompare(b.project_name);
        } else if (sortBy === 'client') {
          return (a.client?.name || '').localeCompare(b.client?.name || '');
        } else if (sortBy === 'lead') {
          return (a.project_lead?.name || '').localeCompare(b.project_lead?.name || '');
        } else if (sortBy === 'start_date') {
          return b.start_date.localeCompare(a.start_date);
        } else if (sortBy === 'due_date') {
          const dueA = a.next_task?.due_date || a.expected_completion_date || '9999-99-99';
          const dueB = b.next_task?.due_date || b.expected_completion_date || '9999-99-99';
          return dueA.localeCompare(dueB);
        } else if (sortBy === 'status') {
          return a.status.localeCompare(b.status);
        } else if (sortBy === 'recently_updated') {
          return b.updated_at.localeCompare(a.updated_at);
        }
        return 0;
      });
    }

    return list;
  }

  public getProjectById(id: string): Project | undefined {
    const list = this.getProjects();
    return list.find((p) => p.id === id);
  }

  public createProject(
    input: Omit<Project, 'id' | 'created_at' | 'updated_at'> & {
      initial_task?: { title: string; due_date: string; assigned_to?: string; priority?: string };
      initial_follow_up?: { date: string; method: string; notes: string; created_by?: string };
    }
  ): Project {
    const newProj: Project = {
      id: 'proj-' + Date.now(),
      project_name: input.project_name,
      project_type: input.project_type,
      location: input.location,
      description: input.description || '',
      client_id: input.client_id,
      project_lead_id: input.project_lead_id,
      team_member_ids: input.team_member_ids || [input.project_lead_id],
      priority: input.priority || 'standard',
      status: input.status || 'active',
      start_date: input.start_date || '2026-09-15',
      expected_completion_date: input.expected_completion_date,
      actual_completion_date: input.actual_completion_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.projects.unshift(newProj);

    // Initial activity log (Spec #44)
    this.data.activities.unshift({
      id: 'act-' + Date.now(),
      project_id: newProj.id,
      team_member_id: newProj.project_lead_id,
      activity_type: 'General Update',
      description: `Project "${newProj.project_name}" initialized with priority ${newProj.priority.toUpperCase()}.`,
      activity_date: '2026-09-15',
      created_at: new Date().toISOString(),
    });

    // Optional initial task
    if (input.initial_task && input.initial_task.title) {
      this.data.tasks.push({
        id: 'tsk-' + (Date.now() + 1),
        project_id: newProj.id,
        title: input.initial_task.title,
        description: '',
        assigned_to: input.initial_task.assigned_to || newProj.project_lead_id,
        priority: (input.initial_task.priority as any) || newProj.priority,
        due_date: input.initial_task.due_date || '2026-09-20',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Optional initial follow-up
    if (input.initial_follow_up && input.initial_follow_up.date) {
      this.data.follow_ups.push({
        id: 'fu-' + (Date.now() + 2),
        project_id: newProj.id,
        follow_up_date: input.initial_follow_up.date,
        method: (input.initial_follow_up.method as any) || 'Phone',
        notes: input.initial_follow_up.notes || 'Initial kick-off follow-up',
        created_by: input.initial_follow_up.created_by || newProj.project_lead_id,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }

    this.save();
    return this.getProjectById(newProj.id)!;
  }

  public updateProject(id: string, updates: Partial<Project>, actingMemberId?: string): Project | null {
    const idx = this.data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const old = this.data.projects[idx];

    // Activity tracking on key field changes (Spec #44)
    if (updates.priority && updates.priority !== old.priority) {
      this.data.activities.unshift({
        id: 'act-' + Date.now(),
        project_id: id,
        team_member_id: actingMemberId || old.project_lead_id,
        activity_type: 'Priority Changed',
        description: `Priority changed from ${old.priority.toUpperCase()} to ${updates.priority.toUpperCase()}.`,
        activity_date: '2026-09-15',
        created_at: new Date().toISOString(),
      });
    }

    if (updates.status && updates.status !== old.status) {
      this.data.activities.unshift({
        id: 'act-' + (Date.now() + 1),
        project_id: id,
        team_member_id: actingMemberId || old.project_lead_id,
        activity_type: 'Status Changed',
        description: `Status updated from ${old.status.replace('_', ' ')} to ${updates.status.replace('_', ' ')}.`,
        activity_date: '2026-09-15',
        created_at: new Date().toISOString(),
      });
    }

    if (updates.project_lead_id && updates.project_lead_id !== old.project_lead_id) {
      const newLead = this.data.team_members.find((m) => m.id === updates.project_lead_id);
      this.data.activities.unshift({
        id: 'act-' + (Date.now() + 2),
        project_id: id,
        team_member_id: updates.project_lead_id,
        activity_type: 'Team Changed',
        description: `Project lead assigned to ${newLead?.name || 'new member'}.`,
        activity_date: '2026-09-15',
        created_at: new Date().toISOString(),
      });
    }

    this.data.projects[idx] = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.getProjectById(id) || null;
  }

  public deleteProject(id: string): boolean {
    const len = this.data.projects.length;
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    if (this.data.projects.length !== len) {
      // also cleanup dependent tasks, followups, activities
      this.data.tasks = this.data.tasks.filter((t) => t.project_id !== id);
      this.data.follow_ups = this.data.follow_ups.filter((f) => f.project_id !== id);
      this.data.activities = this.data.activities.filter((a) => a.project_id !== id);
      this.save();
      return true;
    }
    return false;
  }

  public archiveProject(id: string): Project | null {
    const idx = this.data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.projects[idx] = {
      ...this.data.projects[idx],
      is_archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.activities.unshift({
      id: 'act-' + Date.now(),
      project_id: id,
      team_member_id: this.data.projects[idx].project_lead_id,
      activity_type: 'General Update',
      description: `Project "${this.data.projects[idx].project_name}" moved to Project Archive.`,
      activity_date: '2026-09-15',
      created_at: new Date().toISOString(),
    });
    this.save();
    return this.getProjectById(id) || null;
  }

  public restoreProject(id: string): Project | null {
    const idx = this.data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.data.projects[idx] = {
      ...this.data.projects[idx],
      is_archived: false,
      archived_at: undefined,
      updated_at: new Date().toISOString(),
    };
    this.data.activities.unshift({
      id: 'act-' + Date.now(),
      project_id: id,
      team_member_id: this.data.projects[idx].project_lead_id,
      activity_type: 'General Update',
      description: `Project "${this.data.projects[idx].project_name}" restored from Archive to active projects.`,
      activity_date: '2026-09-15',
      created_at: new Date().toISOString(),
    });
    this.save();
    return this.getProjectById(id) || null;
  }

  // --- Tasks ---
  public createTask(input: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Task {
    const newTask: Task = {
      id: 'tsk-' + Date.now(),
      ...input,
      status: input.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.data.tasks.unshift(newTask);

    // Activity log
    this.data.activities.unshift({
      id: 'act-' + Date.now(),
      project_id: newTask.project_id,
      team_member_id: newTask.assigned_to,
      activity_type: 'General Update',
      description: `Task assigned: "${newTask.title}" (Due: ${newTask.due_date}).`,
      activity_date: '2026-09-15',
      created_at: new Date().toISOString(),
    });

    this.save();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const idx = this.data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const old = this.data.tasks[idx];

    if (updates.status === 'completed' && old.status !== 'completed') {
      this.data.activities.unshift({
        id: 'act-' + Date.now(),
        project_id: old.project_id,
        team_member_id: old.assigned_to,
        activity_type: 'General Update',
        description: `Task completed: "${old.title}".`,
        activity_date: '2026-09-15',
        created_at: new Date().toISOString(),
      });
    }

    this.data.tasks[idx] = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.save();
    return this.data.tasks[idx];
  }

  public deleteTask(id: string): boolean {
    const len = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    if (this.data.tasks.length !== len) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Follow-ups ---
  public createFollowUp(input: Omit<FollowUp, 'id' | 'created_at'>): FollowUp {
    const newFu: FollowUp = {
      id: 'fu-' + Date.now(),
      ...input,
      status: input.status || 'pending',
      created_at: new Date().toISOString(),
    };
    this.data.follow_ups.unshift(newFu);

    // Auto-update project updated_at
    const pIdx = this.data.projects.findIndex((p) => p.id === newFu.project_id);
    if (pIdx !== -1) {
      this.data.projects[pIdx].updated_at = new Date().toISOString();
    }

    // Activity log
    this.data.activities.unshift({
      id: 'act-' + Date.now(),
      project_id: newFu.project_id,
      team_member_id: newFu.created_by,
      activity_type: 'Client Communication',
      description: `Follow-up scheduled for ${newFu.follow_up_date} via ${newFu.method}: "${newFu.notes}".`,
      activity_date: '2026-09-15',
      created_at: new Date().toISOString(),
    });

    this.save();
    return newFu;
  }

  public updateFollowUp(id: string, updates: Partial<FollowUp>): FollowUp | null {
    const idx = this.data.follow_ups.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    const old = this.data.follow_ups[idx];

    if (updates.status === 'completed' && old.status !== 'completed') {
      this.data.activities.unshift({
        id: 'act-' + Date.now(),
        project_id: old.project_id,
        team_member_id: old.created_by,
        activity_type: 'Client Communication',
        description: `Follow-up marked completed (${old.method}): "${old.notes}".`,
        activity_date: '2026-09-15',
        created_at: new Date().toISOString(),
      });
    }

    this.data.follow_ups[idx] = {
      ...old,
      ...updates,
    };
    this.save();
    return this.data.follow_ups[idx];
  }

  public deleteFollowUp(id: string): boolean {
    const len = this.data.follow_ups.length;
    this.data.follow_ups = this.data.follow_ups.filter((f) => f.id !== id);
    if (this.data.follow_ups.length !== len) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Activities ---
  public createActivity(input: Omit<Activity, 'id' | 'created_at'>): Activity {
    const newAct: Activity = {
      id: 'act-' + Date.now(),
      ...input,
      activity_date: input.activity_date || '2026-09-15',
      created_at: new Date().toISOString(),
    };
    this.data.activities.unshift(newAct);

    // update project updated_at
    const pIdx = this.data.projects.findIndex((p) => p.id === newAct.project_id);
    if (pIdx !== -1) {
      this.data.projects[pIdx].updated_at = new Date().toISOString();
    }

    this.save();
    return newAct;
  }

  // --- Dashboard Data & Statistics ---
  public getDashboardStats() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const allProjects = this.getProjects();

    const active = allProjects.filter((p) => p.status === 'active');
    const urgent = allProjects.filter((p) => p.priority === 'urgent' && p.status !== 'completed' && p.status !== 'cancelled');
    const followUpPending = allProjects.filter((p) => p.status === 'follow_up_pending' || (p.next_follow_up && p.next_follow_up.follow_up_date <= todayStr));
    const overdueProjects = allProjects.filter((p) => p.is_overdue);

    // Due soon: next task due between today and next 5 days
    const nextFiveDays = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dueSoon = allProjects.filter((p) => {
      if (p.status === 'completed' || p.status === 'cancelled') return false;
      const due = p.next_task?.due_date;
      return due && due >= todayStr && due <= nextFiveDays;
    });

    const completedMonth = allProjects.filter((p) => p.status === 'completed');

    // Status breakdown
    const onTrack = allProjects.filter((p) => p.health_status === 'on_track').length;
    const followUpNeeded = allProjects.filter((p) => p.health_status === 'follow_up_needed').length;
    const atRisk = allProjects.filter((p) => p.health_status === 'at_risk').length;
    const overdueCount = allProjects.filter((p) => p.health_status === 'overdue').length;
    const completed = allProjects.filter((p) => p.health_status === 'completed').length;

    // Follow-ups requiring attention (pending, sorted by date)
    const followUpsRequiringAttention = this.data.follow_ups
      .filter((f) => f.status !== 'completed')
      .map((f) => {
        const proj = allProjects.find((p) => p.id === f.project_id);
        const creator = this.data.team_members.find((m) => m.id === f.created_by);
        return {
          ...f,
          project_name: proj?.project_name || 'Project',
          client_name: proj?.client?.name || 'Client',
          creator_member: creator,
          is_overdue: f.follow_up_date < todayStr,
          is_today: f.follow_up_date === todayStr,
        };
      })
      .sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date));

    // Upcoming tasks
    const upcomingTasks = this.data.tasks
      .filter((t) => t.status !== 'completed' && t.due_date >= todayStr)
      .map((t) => {
        const proj = allProjects.find((p) => p.id === t.project_id);
        const member = this.data.team_members.find((m) => m.id === t.assigned_to);
        return {
          ...t,
          project_name: proj?.project_name || 'Project',
          assigned_member: member,
        };
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 8);

    // Overdue items (tasks and follow-ups)
    const overdueTasks = this.data.tasks
      .filter((t) => t.status !== 'completed' && t.due_date < todayStr)
      .map((t) => {
        const proj = allProjects.find((p) => p.id === t.project_id);
        return {
          id: t.id,
          type: 'task' as const,
          project_id: t.project_id,
          project_name: proj?.project_name || 'Project',
          title: t.title,
          due_date: t.due_date,
          assigned_member: this.data.team_members.find((m) => m.id === t.assigned_to),
        };
      });

    const overdueFollowUps = this.data.follow_ups
      .filter((f) => f.status !== 'completed' && f.follow_up_date < todayStr)
      .map((f) => {
        const proj = allProjects.find((p) => p.id === f.project_id);
        return {
          id: f.id,
          type: 'follow_up' as const,
          project_id: f.project_id,
          project_name: proj?.project_name || 'Project',
          title: `Client follow-up: ${f.notes}`,
          due_date: f.follow_up_date,
          assigned_member: this.data.team_members.find((m) => m.id === f.created_by),
        };
      });

    const combinedOverdue = [...overdueTasks, ...overdueFollowUps].sort((a, b) =>
      a.due_date.localeCompare(b.due_date)
    );

    // Team workload
    const teamWorkload = this.getTeam()
      .filter((m) => m.status === 'active')
      .map((m) => ({
        id: m.id,
        name: m.name,
        designation: m.designation,
        totalProjects: m.totalProjectsCount || 0,
        activeProjects: m.activeProjectsCount || 0,
        urgentProjects: m.urgentProjectsCount || 0,
        followUpPending: m.followUpPendingCount || 0,
        overdueProjects: m.overdueProjectsCount || 0,
      }))
      .sort((a, b) => b.totalProjects - a.totalProjects);

    return {
      stats: {
        activeProjects: active.length,
        followUpPending: followUpPending.length,
        dueSoon: dueSoon.length,
        overdue: overdueProjects.length,
        urgentProjects: urgent.length,
        completedThisMonth: completedMonth.length,
        totalProjects: allProjects.length,
        statusBreakdown: {
          onTrack,
          followUpNeeded,
          atRisk,
          overdue: overdueCount,
          completed,
        },
      },
      followUpsRequiringAttention,
      upcomingTasks,
      overdueItems: combinedOverdue,
      teamWorkload,
    };
  }
}

export const db = new Database();
