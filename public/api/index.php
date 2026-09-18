<?php
/**
 * Hostinger MySQL Native API Handler for Falcon Engineering & Construction
 * 
 * Automatically connects to Hostinger MySQL database using PDO,
 * creates required tables on first run, and handles all REST API routes.
 */

error_reporting(0);
ini_set('display_errors', 0);

// Set JSON headers and CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Database Credentials for Hostinger MySQL
$dbHost = getenv('MYSQL_HOST') ?: 'localhost';
$dbPort = getenv('MYSQL_PORT') ?: '3306';
$dbName = getenv('MYSQL_DATABASE') ?: 'u345742528_manage_falcon';
$dbUser = getenv('MYSQL_USER') ?: 'u345742528_shuzaul';
$dbPass = getenv('MYSQL_PASSWORD') ?: 'Shajib1501025';

try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed: ' . $e->getMessage(),
        'hint' => 'Verify MySQL Database name, user and password in Hostinger MySQL settings.'
    ]);
    exit;
}

// Initialize tables if needed
function ensureTables($pdo) {
    $queries = [
        "CREATE TABLE IF NOT EXISTS company_settings (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "CREATE TABLE IF NOT EXISTS team_members (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "CREATE TABLE IF NOT EXISTS clients (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "CREATE TABLE IF NOT EXISTS projects (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "CREATE TABLE IF NOT EXISTS tasks (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "CREATE TABLE IF NOT EXISTS follow_ups (
            id VARCHAR(64) PRIMARY KEY,
            project_id VARCHAR(64) NOT NULL,
            follow_up_date VARCHAR(64),
            method VARCHAR(64),
            notes TEXT,
            created_by VARCHAR(64),
            status VARCHAR(32) DEFAULT 'pending',
            created_at VARCHAR(64)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "CREATE TABLE IF NOT EXISTS activities (
            id VARCHAR(64) PRIMARY KEY,
            project_id VARCHAR(64) NOT NULL,
            team_member_id VARCHAR(64),
            activity_type VARCHAR(64),
            description TEXT,
            activity_date VARCHAR(64),
            created_at VARCHAR(64)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "CREATE TABLE IF NOT EXISTS auth_sessions (
            token VARCHAR(128) PRIMARY KEY,
            created_at INT,
            last_active INT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

        "CREATE TABLE IF NOT EXISTS gantt_charts (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
    ];

    foreach ($queries as $q) {
        $pdo->exec($q);
    }

    // Defensively migrate column lengths for large base64 avatars and branding logos
    try {
        $pdo->exec("ALTER TABLE team_members MODIFY COLUMN avatar MEDIUMTEXT");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE company_settings MODIFY COLUMN company_logo MEDIUMTEXT");
    } catch (Exception $e) {}
    try {
        $pdo->exec("ALTER TABLE company_settings MODIFY COLUMN logo_url MEDIUMTEXT");
    } catch (Exception $e) {}

    // Check if initial settings exist
    $stmt = $pdo->query("SELECT id FROM company_settings WHERE id = 'company-main' LIMIT 1");
    if (!$stmt->fetch()) {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $insert = $pdo->prepare("INSERT INTO company_settings (id, company_name, company_address, company_phone, company_email, tagline, currency_symbol, is_password_set, created_at, updated_at) 
            VALUES ('company-main', 'Falcon Engineering & Construction', 'House 42, Road 11, Block D, Banani, Dhaka-1213', '+880 1711-000000', 'operations@falconeng.com', 'Centralized Workspace & Operations Command', '৳', 0, :c, :u)");
        $insert->execute([':c' => $now, ':u' => $now]);
    }

    // Check if initial gantt charts exist
    try {
        $ganttCount = (int)$pdo->query("SELECT COUNT(*) FROM gantt_charts")->fetchColumn();
        if ($ganttCount === 0) {
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $initialTasks = json_encode([
                [
                    'id' => 'gtask-1',
                    'title' => 'Structural Survey & Soil Investigation',
                    'start_date' => '2026-09-01',
                    'end_date' => '2026-09-12',
                    'progress' => 100,
                    'status' => 'completed',
                    'assigned_to' => 'team-1',
                    'color' => '#10b981'
                ],
                [
                    'id' => 'gtask-2',
                    'title' => 'Sub-structure Piling & Deep Excavation',
                    'start_date' => '2026-09-13',
                    'end_date' => '2026-09-28',
                    'progress' => 65,
                    'status' => 'in_progress',
                    'assigned_to' => 'team-2',
                    'color' => '#3b82f6'
                ],
                [
                    'id' => 'gtask-3',
                    'title' => 'Raft Foundation Casting & Waterproofing',
                    'start_date' => '2026-09-29',
                    'end_date' => '2026-10-15',
                    'progress' => 20,
                    'status' => 'pending',
                    'assigned_to' => 'team-3',
                    'color' => '#f59e0b'
                ],
                [
                    'id' => 'gtask-4',
                    'title' => 'Superstructure Column & Slab Casting',
                    'start_date' => '2026-10-16',
                    'end_date' => '2026-10-31',
                    'progress' => 0,
                    'status' => 'pending',
                    'assigned_to' => 'team-4',
                    'color' => '#8b5cf6'
                ],
                [
                    'id' => 'gtask-5',
                    'title' => 'Final Inspection, Quality Audit & Handover',
                    'start_date' => '2026-11-01',
                    'end_date' => '2026-11-15',
                    'progress' => 0,
                    'status' => 'pending',
                    'assigned_to' => 'team-1',
                    'color' => '#ef4444'
                ]
            ]);
            $ins = $pdo->prepare("INSERT INTO gantt_charts (id, project_id, project_name, title, start_date, end_date, notes, tasks, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $ins->execute([
                'gantt-1',
                'proj-1',
                'Banani Commercial Tower',
                'Master Construction Timeline',
                '2026-09-01',
                '2026-11-15',
                'Operational timeline persisted in Hostinger MySQL.',
                $initialTasks,
                $now,
                $now
            ]);
        }
    } catch (Exception $e) {}
}

ensureTables($pdo);

// Helper Functions
function getJsonInput() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?: [];
}

function generateToken() {
    return bin2hex(random_bytes(32));
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Deeply enriches an array of projects with resolved clients, project leads,
 * team members, tasks, follow-ups, activities, and computed health metrics.
 */
function enrichProjects($projects, $pdo) {
    if (empty($projects)) return [];

    // Map clients
    $clientsStmt = $pdo->query("SELECT * FROM clients");
    $clientMap = [];
    foreach ($clientsStmt->fetchAll() as $c) {
        $clientMap[$c['id']] = $c;
    }

    // Map team members
    $teamStmt = $pdo->query("SELECT * FROM team_members");
    $teamMap = [];
    foreach ($teamStmt->fetchAll() as $t) {
        $teamMap[$t['id']] = $t;
    }

    // Map tasks by project
    $tasksStmt = $pdo->query("SELECT * FROM tasks ORDER BY due_date ASC, created_at ASC");
    $tasksByProj = [];
    foreach ($tasksStmt->fetchAll() as $t) {
        $t['assigned_member'] = !empty($t['assigned_to']) ? ($teamMap[$t['assigned_to']] ?? null) : null;
        $tasksByProj[$t['project_id']][] = $t;
    }

    // Map follow-ups by project
    $fStmt = $pdo->query("SELECT * FROM follow_ups ORDER BY follow_up_date ASC, created_at ASC");
    $followUpsByProj = [];
    foreach ($fStmt->fetchAll() as $f) {
        $f['creator_member'] = !empty($f['created_by']) ? ($teamMap[$f['created_by']] ?? null) : null;
        $followUpsByProj[$f['project_id']][] = $f;
    }

    // Map activities by project
    $aStmt = $pdo->query("SELECT * FROM activities ORDER BY created_at DESC");
    $activitiesByProj = [];
    foreach ($aStmt->fetchAll() as $a) {
        $a['team_member'] = !empty($a['team_member_id']) ? ($teamMap[$a['team_member_id']] ?? null) : null;
        $activitiesByProj[$a['project_id']][] = $a;
    }

    $today = date('Y-m-d');

    foreach ($projects as &$p) {
        $p['is_archived'] = (bool)$p['is_archived'];
        if (isset($p['team_member_ids']) && is_string($p['team_member_ids'])) {
            $p['team_member_ids'] = json_decode($p['team_member_ids'], true) ?: [];
        } elseif (!isset($p['team_member_ids']) || !is_array($p['team_member_ids'])) {
            $p['team_member_ids'] = [];
        }

        // 1. Resolve client
        $p['client'] = !empty($p['client_id']) ? ($clientMap[$p['client_id']] ?? null) : null;

        // 2. Resolve project lead
        $p['project_lead'] = !empty($p['project_lead_id']) ? ($teamMap[$p['project_lead_id']] ?? null) : null;

        // 3. Resolve team members
        $p['team_members'] = [];
        foreach ($p['team_member_ids'] as $mid) {
            if (isset($teamMap[$mid])) {
                $p['team_members'][] = $teamMap[$mid];
            }
        }

        // 4. Resolve tasks, follow-ups, activities
        $p['tasks'] = $tasksByProj[$p['id']] ?? [];
        $p['follow_ups'] = $followUpsByProj[$p['id']] ?? [];
        $p['activities'] = $activitiesByProj[$p['id']] ?? [];

        // 5. Computed health & next actions
        $pendingTasks = array_values(array_filter($p['tasks'], fn($t) => $t['status'] !== 'completed'));
        $pendingFollowUps = array_values(array_filter($p['follow_ups'], fn($f) => $f['status'] !== 'completed' && $f['status'] !== 'cancelled'));

        $p['is_overdue'] = false;
        foreach ($pendingTasks as $t) {
            if (!empty($t['due_date']) && $t['due_date'] < $today) {
                $p['is_overdue'] = true;
                break;
            }
        }
        if (!$p['is_overdue']) {
            foreach ($pendingFollowUps as $f) {
                if (!empty($f['follow_up_date']) && $f['follow_up_date'] < $today) {
                    $p['is_overdue'] = true;
                    break;
                }
            }
        }

        $p['health_status'] = $p['is_overdue'] ? 'critical' : ($p['priority'] === 'urgent' ? 'warning' : 'healthy');
        $p['next_task'] = count($pendingTasks) > 0 ? $pendingTasks[0] : null;
        $p['next_follow_up'] = count($pendingFollowUps) > 0 ? $pendingFollowUps[0] : null;
        $p['last_follow_up'] = count($p['follow_ups']) > 0 ? end($p['follow_ups']) : null;
    }

    return $projects;
}

function enrichSingleProject($project, $pdo) {
    if (!$project) return null;
    $res = enrichProjects([$project], $pdo);
    return $res[0] ?? null;
}

// Request path parsing
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$uriPath = parse_url($requestUri, PHP_URL_PATH);
// Strip /api prefix
$endpoint = preg_replace('#^.*?/api/#', '', $uriPath);
$endpoint = trim($endpoint, '/');
$method = $_SERVER['REQUEST_METHOD'];

// Route Dispatcher
try {
    // 1. GET db status
    if ($endpoint === 'db/status') {
        echo json_encode([
            'engine' => 'mysql',
            'connected' => true,
            'database' => $dbName,
            'user' => $dbUser,
            'host' => $dbHost,
            'port' => (int)$dbPort,
            'error' => null
        ]);
        exit;
    }

    // 2. GET auth status
    if ($endpoint === 'auth/status') {
        $stmt = $pdo->query("SELECT company_name, company_logo, logo_url, tagline, is_password_set FROM company_settings WHERE id = 'company-main' LIMIT 1");
        $row = $stmt->fetch() ?: [];
        echo json_encode([
            'isPasswordSet' => (bool)($row['is_password_set'] ?? false),
            'company_name' => $row['company_name'] ?? 'Falcon Engineering & Construction',
            'logo_url' => $row['logo_url'] ?? $row['company_logo'] ?? null,
            'company_logo' => $row['company_logo'] ?? $row['logo_url'] ?? null,
            'tagline' => $row['tagline'] ?? 'Centralized Workspace & Operations Command'
        ]);
        exit;
    }

    // 3. POST auth/setup-password
    if ($endpoint === 'auth/setup-password' && $method === 'POST') {
        $input = getJsonInput();
        $password = trim($input['password'] ?? '');
        if (strlen($password) < 4) {
            http_response_code(400);
            echo json_encode(['error' => 'Password must be at least 4 characters long']);
            exit;
        }

        $hash = hashPassword($password);
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $stmt = $pdo->prepare("UPDATE company_settings SET password_hash = :h, is_password_set = 1, updated_at = :u WHERE id = 'company-main'");
        $stmt->execute([':h' => $hash, ':u' => $now]);

        $token = generateToken();
        $pdo->prepare("INSERT INTO auth_sessions (token, created_at, last_active) VALUES (?, ?, ?)")
            ->execute([$token, time(), time()]);

        $settings = $pdo->query("SELECT * FROM company_settings WHERE id = 'company-main'")->fetch();
        unset($settings['password_hash'], $settings['salt']);
        $settings['is_password_set'] = true;

        echo json_encode([
            'success' => true,
            'token' => $token,
            'company' => $settings
        ]);
        exit;
    }

    // 4. POST auth/login
    if ($endpoint === 'auth/login' && $method === 'POST') {
        $input = getJsonInput();
        $password = trim($input['password'] ?? '');

        $stmt = $pdo->query("SELECT * FROM company_settings WHERE id = 'company-main' LIMIT 1");
        $settings = $stmt->fetch();

        if (!$settings || empty($settings['password_hash'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Password has not been set yet']);
            exit;
        }

        if (!verifyPassword($password, $settings['password_hash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Incorrect password']);
            exit;
        }

        $token = generateToken();
        $pdo->prepare("INSERT INTO auth_sessions (token, created_at, last_active) VALUES (?, ?, ?)")
            ->execute([$token, time(), time()]);

        unset($settings['password_hash'], $settings['salt']);
        $settings['is_password_set'] = true;

        echo json_encode([
            'success' => true,
            'token' => $token,
            'company' => $settings
        ]);
        exit;
    }

    // 5. POST auth/logout
    if ($endpoint === 'auth/logout') {
        echo json_encode(['success' => true]);
        exit;
    }

    // 6. GET & PUT company
    if ($endpoint === 'company') {
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM company_settings WHERE id = 'company-main'");
            $row = $stmt->fetch() ?: [];
            unset($row['password_hash'], $row['salt']);
            $row['is_password_set'] = (bool)($row['is_password_set'] ?? false);
            echo json_encode($row);
            exit;
        }

        if ($method === 'PUT') {
            $input = getJsonInput();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare("UPDATE company_settings SET 
                company_name = COALESCE(:name, company_name),
                company_address = COALESCE(:addr, company_address),
                company_phone = COALESCE(:phone, company_phone),
                company_email = COALESCE(:email, company_email),
                company_logo = COALESCE(:logo, company_logo),
                logo_url = COALESCE(:logo_url, logo_url),
                tagline = COALESCE(:tagline, tagline),
                updated_at = :u
                WHERE id = 'company-main'");
            $stmt->execute([
                ':name' => $input['company_name'] ?? null,
                ':addr' => $input['company_address'] ?? null,
                ':phone' => $input['company_phone'] ?? null,
                ':email' => $input['company_email'] ?? null,
                ':logo' => $input['company_logo'] ?? $input['logo_url'] ?? null,
                ':logo_url' => $input['logo_url'] ?? $input['company_logo'] ?? null,
                ':tagline' => $input['tagline'] ?? null,
                ':u' => $now
            ]);

            $row = $pdo->query("SELECT * FROM company_settings WHERE id = 'company-main'")->fetch();
            unset($row['password_hash'], $row['salt']);
            $row['is_password_set'] = (bool)($row['is_password_set'] ?? false);
            echo json_encode($row);
            exit;
        }
    }

    // 7. GET dashboard & dashboard/stats
    if ($endpoint === 'dashboard' || $endpoint === 'dashboard/stats') {
        $today = date('Y-m-d');
        $activeProjects = (int)$pdo->query("SELECT COUNT(*) FROM projects WHERE status = 'active' AND is_archived = 0")->fetchColumn();
        $urgentProjects = (int)$pdo->query("SELECT COUNT(*) FROM projects WHERE priority = 'urgent' AND is_archived = 0")->fetchColumn();
        $totalProjects = (int)$pdo->query("SELECT COUNT(*) FROM projects WHERE is_archived = 0")->fetchColumn();
        $dueSoon = (int)$pdo->query("SELECT COUNT(*) FROM tasks WHERE status != 'completed'")->fetchColumn();
        $overdueTasks = (int)$pdo->query("SELECT COUNT(*) FROM tasks WHERE status != 'completed' AND due_date < '$today'")->fetchColumn();
        $followUpPending = (int)$pdo->query("SELECT COUNT(*) FROM follow_ups WHERE status != 'completed' AND status != 'cancelled'")->fetchColumn();
        $completedThisMonth = (int)$pdo->query("SELECT COUNT(*) FROM projects WHERE status = 'completed' AND is_archived = 0")->fetchColumn();
        $atRisk = (int)$pdo->query("SELECT COUNT(*) FROM projects WHERE status = 'at_risk' AND is_archived = 0")->fetchColumn();

        $stats = [
            'activeProjects' => $activeProjects,
            'followUpPending' => $followUpPending,
            'dueSoon' => $dueSoon,
            'overdue' => $overdueTasks,
            'urgentProjects' => $urgentProjects,
            'completedThisMonth' => $completedThisMonth,
            'totalProjects' => $totalProjects,
            'statusBreakdown' => [
                'onTrack' => $activeProjects,
                'followUpNeeded' => $followUpPending,
                'atRisk' => $atRisk,
                'overdue' => $overdueTasks,
                'completed' => $completedThisMonth
            ]
        ];

        if ($endpoint === 'dashboard') {
            $stmt = $pdo->query("SELECT * FROM projects WHERE is_archived = 0 ORDER BY created_at DESC LIMIT 6");
            $projects = $stmt->fetchAll();
            $enrichedProjects = enrichProjects($projects, $pdo);

            // Fetch recent activities with team member
            $actStmt = $pdo->query("SELECT * FROM activities ORDER BY created_at DESC LIMIT 10");
            $recentActs = $actStmt->fetchAll();
            $teamStmt = $pdo->query("SELECT * FROM team_members");
            $teamMembersAll = $teamStmt->fetchAll();
            $teamMap = [];
            foreach ($teamMembersAll as $t) {
                $teamMap[$t['id']] = $t;
            }
            foreach ($recentActs as &$act) {
                $act['team_member'] = !empty($act['team_member_id']) ? ($teamMap[$act['team_member_id']] ?? null) : null;
            }

            // Project & Client Lookup Map
            $allProjectsStmt = $pdo->query("SELECT p.id, p.project_name, p.project_lead_id, p.team_member_ids, p.priority, p.status, c.name as client_name 
                FROM projects p 
                LEFT JOIN clients c ON p.client_id = c.id 
                WHERE p.is_archived = 0");
            $allProjectsRows = $allProjectsStmt->fetchAll();
            $projMap = [];
            foreach ($allProjectsRows as $p) {
                $projMap[$p['id']] = $p;
            }

            // Follow-ups requiring attention (pending or scheduled)
            $fuStmt = $pdo->query("SELECT * FROM follow_ups WHERE status != 'completed' AND status != 'cancelled' ORDER BY follow_up_date ASC LIMIT 25");
            $pendingFu = $fuStmt->fetchAll();
            $followUpsAttention = [];
            foreach ($pendingFu as $fu) {
                $pInfo = $projMap[$fu['project_id']] ?? null;
                $creator = !empty($fu['created_by']) ? ($teamMap[$fu['created_by']] ?? null) : null;
                $fDate = $fu['follow_up_date'] ?? '';
                $followUpsAttention[] = [
                    'id' => $fu['id'],
                    'project_id' => $fu['project_id'],
                    'project_name' => $pInfo['project_name'] ?? 'Project',
                    'client_name' => $pInfo['client_name'] ?? 'Client',
                    'follow_up_date' => $fDate,
                    'method' => $fu['method'] ?? 'Phone',
                    'notes' => $fu['notes'] ?? '',
                    'status' => $fu['status'],
                    'creator_member' => $creator,
                    'is_overdue' => ($fDate < $today),
                    'is_today' => ($fDate === $today)
                ];
            }

            // Upcoming tasks: pending tasks ordered by due_date
            $taskStmt = $pdo->query("SELECT * FROM tasks WHERE status != 'completed' ORDER BY due_date ASC LIMIT 30");
            $tasksRows = $taskStmt->fetchAll();
            $upcomingTasks = [];
            $overdueItems = [];
            foreach ($tasksRows as $t) {
                $pInfo = $projMap[$t['project_id']] ?? null;
                $assigned = !empty($t['assigned_to']) ? ($teamMap[$t['assigned_to']] ?? null) : null;
                $dueDate = $t['due_date'] ?? '';
                $taskObj = [
                    'id' => $t['id'],
                    'project_id' => $t['project_id'],
                    'project_name' => $pInfo['project_name'] ?? 'Project',
                    'title' => $t['title'],
                    'due_date' => $dueDate,
                    'priority' => $t['priority'] ?? 'standard',
                    'status' => $t['status'],
                    'assigned_to' => $t['assigned_to'] ?? null,
                    'assigned_member' => $assigned,
                    'is_overdue' => ($dueDate < $today)
                ];
                if ($dueDate >= $today) {
                    $upcomingTasks[] = $taskObj;
                } else {
                    $overdueItems[] = [
                        'id' => $t['id'],
                        'type' => 'task',
                        'project_id' => $t['project_id'],
                        'project_name' => $pInfo['project_name'] ?? 'Project',
                        'title' => $t['title'],
                        'due_date' => $dueDate,
                        'assigned_member' => $assigned
                    ];
                }
            }

            // Team Workload calculation
            $teamWorkload = [];
            foreach ($teamMembersAll as $m) {
                if (($m['status'] ?? 'active') !== 'active') continue;
                $mid = $m['id'];
                $totalProj = 0;
                $activeProj = 0;
                $urgentProj = 0;
                $followUpPendingCount = 0;
                $overdueProjCount = 0;

                foreach ($allProjectsRows as $p) {
                    $mids = json_decode($p['team_member_ids'] ?? '[]', true) ?: [];
                    if ($p['project_lead_id'] === $mid || in_array($mid, $mids)) {
                        $totalProj++;
                        if ($p['status'] === 'active' || $p['status'] === 'at_risk') {
                            $activeProj++;
                        }
                        if ($p['priority'] === 'urgent' && $p['status'] !== 'completed') {
                            $urgentProj++;
                        }
                        if ($p['status'] === 'follow_up_pending') {
                            $followUpPendingCount++;
                        }
                    }
                }

                $teamWorkload[] = [
                    'id' => $m['id'],
                    'name' => $m['name'],
                    'designation' => $m['designation'] ?? 'Staff',
                    'avatar' => $m['avatar'] ?? null,
                    'totalProjects' => $totalProj,
                    'activeProjects' => $activeProj,
                    'urgentProjects' => $urgentProj,
                    'followUpPending' => $followUpPendingCount,
                    'overdueProjects' => $overdueProjCount
                ];
            }
            usort($teamWorkload, function($a, $b) {
                return $b['totalProjects'] - $a['totalProjects'];
            });

            echo json_encode([
                'stats' => $stats,
                'recentProjects' => $enrichedProjects,
                'activities' => $recentActs,
                'followUpsRequiringAttention' => $followUpsAttention,
                'upcomingTasks' => $upcomingTasks,
                'overdueItems' => $overdueItems,
                'teamWorkload' => $teamWorkload
            ]);
        } else {
            echo json_encode($stats);
        }
        exit;
    }

    // 8. Projects: GET & POST projects
    if ($endpoint === 'projects') {
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM projects WHERE is_archived = 0 ORDER BY created_at DESC");
            $rows = $stmt->fetchAll();
            echo json_encode(enrichProjects($rows, $pdo));
            exit;
        }

        if ($method === 'POST') {
            $input = getJsonInput();
            $id = 'proj-' . bin2hex(random_bytes(6));
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $teamMemberIds = $input['team_member_ids'] ?? [];
            if (!empty($input['project_lead_id']) && !in_array($input['project_lead_id'], $teamMemberIds)) {
                $teamMemberIds[] = $input['project_lead_id'];
            }

            $stmt = $pdo->prepare("INSERT INTO projects (id, project_name, project_type, location, description, client_id, project_lead_id, team_member_ids, priority, status, start_date, expected_completion_date, actual_completion_date, is_archived, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)");
            $stmt->execute([
                $id,
                $input['project_name'] ?? 'New Project',
                $input['project_type'] ?? 'Architecture',
                $input['location'] ?? '',
                $input['description'] ?? null,
                $input['client_id'] ?? '',
                $input['project_lead_id'] ?? '',
                json_encode($teamMemberIds),
                $input['priority'] ?? 'standard',
                $input['status'] ?? 'active',
                $input['start_date'] ?? date('Y-m-d'),
                $input['expected_completion_date'] ?? null,
                $input['actual_completion_date'] ?? null,
                $now,
                $now
            ]);

            // Initial Activity Log
            $actId = 'act-' . bin2hex(random_bytes(6));
            $pName = $input['project_name'] ?? 'New Project';
            $pPriority = strtoupper($input['priority'] ?? 'standard');
            $pdo->prepare("INSERT INTO activities (id, project_id, team_member_id, activity_type, description, activity_date, created_at)
                VALUES (?, ?, ?, 'General Update', ?, ?, ?)")->execute([
                    $actId,
                    $id,
                    $input['project_lead_id'] ?? null,
                    "Project \"$pName\" initialized with priority $pPriority.",
                    date('Y-m-d'),
                    $now
                ]);

            // Optional initial task
            if (!empty($input['initial_task']) && !empty($input['initial_task']['title'])) {
                $tId = 'tsk-' . bin2hex(random_bytes(6));
                $pdo->prepare("INSERT INTO tasks (id, project_id, title, description, assigned_to, priority, due_date, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)")->execute([
                        $tId,
                        $id,
                        $input['initial_task']['title'],
                        $input['initial_task']['description'] ?? '',
                        $input['initial_task']['assigned_to'] ?? ($input['project_lead_id'] ?? null),
                        $input['initial_task']['priority'] ?? ($input['priority'] ?? 'standard'),
                        $input['initial_task']['due_date'] ?? date('Y-m-d', strtotime('+5 days')),
                        $now,
                        $now
                    ]);
            }

            // Optional initial follow-up
            if (!empty($input['initial_follow_up']) && (!empty($input['initial_follow_up']['date']) || !empty($input['initial_follow_up']['follow_up_date']))) {
                $fuId = 'fu-' . bin2hex(random_bytes(6));
                $fDate = $input['initial_follow_up']['date'] ?? ($input['initial_follow_up']['follow_up_date'] ?? date('Y-m-d', strtotime('+3 days')));
                $pdo->prepare("INSERT INTO follow_ups (id, project_id, follow_up_date, method, notes, created_by, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)")->execute([
                        $fuId,
                        $id,
                        $fDate,
                        $input['initial_follow_up']['method'] ?? 'Phone',
                        $input['initial_follow_up']['notes'] ?? 'Initial project kick-off follow-up',
                        $input['initial_follow_up']['created_by'] ?? ($input['project_lead_id'] ?? null),
                        $now
                    ]);
            }

            $createdRow = $pdo->query("SELECT * FROM projects WHERE id = '$id'")->fetch();
            echo json_encode(enrichSingleProject($createdRow, $pdo));
            exit;
        }
    }

    // 9. Archived projects
    if ($endpoint === 'projects/archived') {
        $stmt = $pdo->query("SELECT * FROM projects WHERE is_archived = 1 ORDER BY updated_at DESC");
        $rows = $stmt->fetchAll();
        echo json_encode(enrichProjects($rows, $pdo));
        exit;
    }

    // 10. Single project operations: projects/{id}
    if (preg_match('#^projects/([a-zA-Z0-9_\-]+)$#', $endpoint, $matches)) {
        $projId = $matches[1];

        if ($method === 'GET') {
            $stmt = $pdo->prepare("SELECT * FROM projects WHERE id = ?");
            $stmt->execute([$projId]);
            $r = $stmt->fetch();
            if (!$r) {
                http_response_code(404);
                echo json_encode(['error' => 'Project not found']);
                exit;
            }
            echo json_encode(enrichSingleProject($r, $pdo));
            exit;
        }

        if ($method === 'PUT') {
            $input = getJsonInput();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare("UPDATE projects SET
                project_name = COALESCE(:name, project_name),
                project_type = COALESCE(:type, project_type),
                location = COALESCE(:loc, location),
                description = COALESCE(:desc, description),
                client_id = COALESCE(:client, client_id),
                project_lead_id = COALESCE(:lead, project_lead_id),
                team_member_ids = COALESCE(:members, team_member_ids),
                priority = COALESCE(:priority, priority),
                status = COALESCE(:status, status),
                start_date = COALESCE(:start, start_date),
                expected_completion_date = COALESCE(:exp, expected_completion_date),
                actual_completion_date = COALESCE(:act, actual_completion_date),
                updated_at = :u
                WHERE id = :id");
            $stmt->execute([
                ':name' => $input['project_name'] ?? null,
                ':type' => $input['project_type'] ?? null,
                ':loc' => $input['location'] ?? null,
                ':desc' => $input['description'] ?? null,
                ':client' => $input['client_id'] ?? null,
                ':lead' => $input['project_lead_id'] ?? null,
                ':members' => isset($input['team_member_ids']) ? json_encode($input['team_member_ids']) : null,
                ':priority' => $input['priority'] ?? null,
                ':status' => $input['status'] ?? null,
                ':start' => $input['start_date'] ?? null,
                ':exp' => $input['expected_completion_date'] ?? null,
                ':act' => $input['actual_completion_date'] ?? null,
                ':u' => $now,
                ':id' => $projId
            ]);

            $updatedRow = $pdo->query("SELECT * FROM projects WHERE id = '$projId'")->fetch();
            echo json_encode(enrichSingleProject($updatedRow, $pdo));
            exit;
        }

        if ($method === 'DELETE') {
            $pdo->prepare("DELETE FROM projects WHERE id = ?")->execute([$projId]);
            $pdo->prepare("DELETE FROM tasks WHERE project_id = ?")->execute([$projId]);
            $pdo->prepare("DELETE FROM follow_ups WHERE project_id = ?")->execute([$projId]);
            $pdo->prepare("DELETE FROM activities WHERE project_id = ?")->execute([$projId]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    // 11. Archive / Unarchive project
    if (preg_match('#^projects/([a-zA-Z0-9_\-]+)/archive$#', $endpoint, $matches)) {
        $projId = $matches[1];
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $pdo->prepare("UPDATE projects SET is_archived = 1, archived_at = ?, updated_at = ? WHERE id = ?")
            ->execute([$now, $now, $projId]);
        $r = $pdo->query("SELECT * FROM projects WHERE id = '$projId'")->fetch();
        $r['is_archived'] = true;
        $r['team_member_ids'] = json_decode($r['team_member_ids'] ?? '[]', true) ?: [];
        echo json_encode($r);
        exit;
    }

    if (preg_match('#^projects/([a-zA-Z0-9_\-]+)/unarchive$#', $endpoint, $matches)) {
        $projId = $matches[1];
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $pdo->prepare("UPDATE projects SET is_archived = 0, archived_at = NULL, updated_at = ? WHERE id = ?")
            ->execute([$now, $projId]);
        $r = $pdo->query("SELECT * FROM projects WHERE id = '$projId'")->fetch();
        $r['is_archived'] = false;
        $r['team_member_ids'] = json_decode($r['team_member_ids'] ?? '[]', true) ?: [];
        echo json_encode($r);
        exit;
    }

    // 12. Clients: GET & POST
    if ($endpoint === 'clients') {
        if ($method === 'GET') {
            $rows = $pdo->query("SELECT * FROM clients ORDER BY name ASC")->fetchAll();
            echo json_encode($rows);
            exit;
        }

        if ($method === 'POST') {
            $input = getJsonInput();
            $id = 'cli-' . bin2hex(random_bytes(6));
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare("INSERT INTO clients (id, name, company, phone, email, address, notes, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id,
                $input['name'] ?? 'New Client',
                $input['company'] ?? null,
                $input['phone'] ?? '',
                $input['email'] ?? null,
                $input['address'] ?? null,
                $input['notes'] ?? null,
                $input['status'] ?? 'active',
                $now,
                $now
            ]);
            echo json_encode($pdo->query("SELECT * FROM clients WHERE id = '$id'")->fetch());
            exit;
        }
    }

    if (preg_match('#^clients/([a-zA-Z0-9_\-]+)$#', $endpoint, $matches)) {
        $id = $matches[1];
        if ($method === 'PUT') {
            $input = getJsonInput();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare("UPDATE clients SET
                name = COALESCE(:name, name),
                company = COALESCE(:company, company),
                phone = COALESCE(:phone, phone),
                email = COALESCE(:email, email),
                address = COALESCE(:addr, address),
                notes = COALESCE(:notes, notes),
                status = COALESCE(:status, status),
                updated_at = :u
                WHERE id = :id");
            $stmt->execute([
                ':name' => $input['name'] ?? null,
                ':company' => $input['company'] ?? null,
                ':phone' => $input['phone'] ?? null,
                ':email' => $input['email'] ?? null,
                ':addr' => $input['address'] ?? null,
                ':notes' => $input['notes'] ?? null,
                ':status' => $input['status'] ?? null,
                ':u' => $now,
                ':id' => $id
            ]);
            echo json_encode($pdo->query("SELECT * FROM clients WHERE id = '$id'")->fetch());
            exit;
        }
        if ($method === 'DELETE') {
            $pdo->prepare("DELETE FROM clients WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    // 13. Team Members: GET & POST
    if ($endpoint === 'team') {
        if ($method === 'GET') {
            $rows = $pdo->query("SELECT * FROM team_members ORDER BY name ASC")->fetchAll();
            echo json_encode($rows);
            exit;
        }

        if ($method === 'POST') {
            $input = getJsonInput();
            $id = 'tm-' . bin2hex(random_bytes(6));
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare("INSERT INTO team_members (id, name, designation, email, phone, avatar, notes, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id,
                $input['name'] ?? 'New Member',
                $input['designation'] ?? 'Staff',
                $input['email'] ?? '',
                $input['phone'] ?? '',
                $input['avatar'] ?? null,
                $input['notes'] ?? null,
                $input['status'] ?? 'active',
                $now,
                $now
            ]);
            echo json_encode($pdo->query("SELECT * FROM team_members WHERE id = '$id'")->fetch());
            exit;
        }
    }

    if (preg_match('#^team/([a-zA-Z0-9_\-]+)$#', $endpoint, $matches)) {
        $id = $matches[1];
        if ($method === 'PUT') {
            $input = getJsonInput();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare("UPDATE team_members SET
                name = COALESCE(:name, name),
                designation = COALESCE(:desig, designation),
                email = COALESCE(:email, email),
                phone = COALESCE(:phone, phone),
                avatar = COALESCE(:avatar, avatar),
                notes = COALESCE(:notes, notes),
                status = COALESCE(:status, status),
                updated_at = :u
                WHERE id = :id");
            $stmt->execute([
                ':name' => $input['name'] ?? null,
                ':desig' => $input['designation'] ?? null,
                ':email' => $input['email'] ?? null,
                ':phone' => $input['phone'] ?? null,
                ':avatar' => $input['avatar'] ?? null,
                ':notes' => $input['notes'] ?? null,
                ':status' => $input['status'] ?? null,
                ':u' => $now,
                ':id' => $id
            ]);
            echo json_encode($pdo->query("SELECT * FROM team_members WHERE id = '$id'")->fetch());
            exit;
        }
        if ($method === 'DELETE') {
            $pdo->prepare("DELETE FROM team_members WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    // 14. Tasks: POST, PUT, DELETE
    if ($endpoint === 'tasks' && $method === 'POST') {
        $input = getJsonInput();
        $id = 'tsk-' . bin2hex(random_bytes(6));
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $stmt = $pdo->prepare("INSERT INTO tasks (id, project_id, title, description, assigned_to, priority, due_date, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id,
            $input['project_id'] ?? '',
            $input['title'] ?? 'Task',
            $input['description'] ?? null,
            $input['assigned_to'] ?? null,
            $input['priority'] ?? 'standard',
            $input['due_date'] ?? date('Y-m-d'),
            $input['status'] ?? 'pending',
            $now,
            $now
        ]);
        echo json_encode($pdo->query("SELECT * FROM tasks WHERE id = '$id'")->fetch());
        exit;
    }

    if (preg_match('#^tasks/([a-zA-Z0-9_\-]+)$#', $endpoint, $matches)) {
        $id = $matches[1];
        if ($method === 'PUT') {
            $input = getJsonInput();
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $stmt = $pdo->prepare("UPDATE tasks SET
                title = COALESCE(:title, title),
                description = COALESCE(:desc, description),
                assigned_to = COALESCE(:assign, assigned_to),
                priority = COALESCE(:priority, priority),
                due_date = COALESCE(:due, due_date),
                status = COALESCE(:status, status),
                updated_at = :u
                WHERE id = :id");
            $stmt->execute([
                ':title' => $input['title'] ?? null,
                ':desc' => $input['description'] ?? null,
                ':assign' => $input['assigned_to'] ?? null,
                ':priority' => $input['priority'] ?? null,
                ':due' => $input['due_date'] ?? null,
                ':status' => $input['status'] ?? null,
                ':u' => $now,
                ':id' => $id
            ]);
            echo json_encode($pdo->query("SELECT * FROM tasks WHERE id = '$id'")->fetch());
            exit;
        }
        if ($method === 'DELETE') {
            $pdo->prepare("DELETE FROM tasks WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    // 15. Follow-ups
    if ($endpoint === 'followups' && $method === 'POST') {
        $input = getJsonInput();
        $id = 'fu-' . bin2hex(random_bytes(6));
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $stmt = $pdo->prepare("INSERT INTO follow_ups (id, project_id, follow_up_date, method, notes, created_by, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id,
            $input['project_id'] ?? '',
            $input['follow_up_date'] ?? date('Y-m-d'),
            $input['method'] ?? 'Phone',
            $input['notes'] ?? '',
            $input['created_by'] ?? null,
            $input['status'] ?? 'pending',
            $now
        ]);
        echo json_encode($pdo->query("SELECT * FROM follow_ups WHERE id = '$id'")->fetch());
        exit;
    }

    if (preg_match('#^followups/([a-zA-Z0-9_\-]+)$#', $endpoint, $matches)) {
        $id = $matches[1];
        if ($method === 'PUT') {
            $input = getJsonInput();
            $stmt = $pdo->prepare("UPDATE follow_ups SET
                follow_up_date = COALESCE(:fdate, follow_up_date),
                method = COALESCE(:method, method),
                notes = COALESCE(:notes, notes),
                status = COALESCE(:status, status)
                WHERE id = :id");
            $stmt->execute([
                ':fdate' => $input['follow_up_date'] ?? null,
                ':method' => $input['method'] ?? null,
                ':notes' => $input['notes'] ?? null,
                ':status' => $input['status'] ?? null,
                ':id' => $id
            ]);
            $updated = $pdo->query("SELECT * FROM follow_ups WHERE id = '$id'")->fetch();
            if (($input['status'] ?? '') === 'completed') {
                $now = gmdate('Y-m-d\TH:i:s\Z');
                $pdo->prepare("INSERT INTO activities (id, project_id, team_member_id, activity_type, description, activity_date, created_at)
                    VALUES (?, ?, ?, 'Follow-up Completed', ?, ?, ?)")->execute([
                        'act-' . bin2hex(random_bytes(6)),
                        $updated['project_id'],
                        $updated['created_by'] ?? null,
                        "Follow-up completed via " . ($updated['method'] ?? 'Phone'),
                        date('Y-m-d'),
                        $now
                    ]);
            }
            echo json_encode($updated);
            exit;
        }

        if ($method === 'DELETE') {
            $pdo->prepare("DELETE FROM follow_ups WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    // 16. Activities
    if ($endpoint === 'activities' && $method === 'POST') {
        $input = getJsonInput();
        $id = 'act-' . bin2hex(random_bytes(6));
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $stmt = $pdo->prepare("INSERT INTO activities (id, project_id, team_member_id, activity_type, description, activity_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id,
            $input['project_id'] ?? '',
            $input['team_member_id'] ?? null,
            $input['activity_type'] ?? 'General Update',
            $input['description'] ?? '',
            $input['activity_date'] ?? date('Y-m-d'),
            $now
        ]);
        echo json_encode($pdo->query("SELECT * FROM activities WHERE id = '$id'")->fetch());
        exit;
    }

    // 17. Gantt Charts
    if (($endpoint === 'gantt' || $endpoint === 'gantt-charts') && $method === 'GET') {
        $projectId = $_GET['projectId'] ?? null;
        if ($projectId) {
            $stmt = $pdo->prepare("SELECT * FROM gantt_charts WHERE project_id = ? ORDER BY created_at DESC");
            $stmt->execute([$projectId]);
            $charts = $stmt->fetchAll();
        } else {
            $charts = $pdo->query("SELECT * FROM gantt_charts ORDER BY created_at DESC")->fetchAll();
        }
        foreach ($charts as &$c) {
            $c['tasks'] = json_decode($c['tasks'] ?? '[]', true) ?: [];
        }
        echo json_encode($charts);
        exit;
    }

    if (($endpoint === 'gantt' || $endpoint === 'gantt-charts') && $method === 'POST') {
        $input = getJsonInput();
        $id = $input['id'] ?? ('gantt-' . round(microtime(true) * 1000));
        $projectId = $input['project_id'] ?? '';
        
        $projectName = $input['project_name'] ?? '';
        if (empty($projectName) && !empty($projectId)) {
            $pStmt = $pdo->prepare("SELECT project_name FROM projects WHERE id = ?");
            $pStmt->execute([$projectId]);
            $projectName = $pStmt->fetchColumn() ?: 'Project';
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        $tasksJson = json_encode($input['tasks'] ?? []);

        $stmt = $pdo->prepare("INSERT INTO gantt_charts (id, project_id, project_name, title, start_date, end_date, notes, tasks, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $id,
            $projectId,
            $projectName,
            $input['title'] ?? 'Untitled Gantt Chart',
            $input['start_date'] ?? date('Y-m-d'),
            $input['end_date'] ?? date('Y-m-d', strtotime('+30 days')),
            $input['notes'] ?? '',
            $tasksJson,
            $now,
            $now
        ]);

        $row = $pdo->query("SELECT * FROM gantt_charts WHERE id = '$id'")->fetch();
        if ($row) {
            $row['tasks'] = json_decode($row['tasks'] ?? '[]', true) ?: [];
        }
        http_response_code(201);
        echo json_encode($row);
        exit;
    }

    if (preg_match('#^(gantt|gantt-charts)/([a-zA-Z0-9_\-]+)$#', $endpoint, $matches) || preg_match('#^projects/([a-zA-Z0-9_\-]+)/gantt$#', $endpoint, $matches)) {
        $id = $matches[2] ?? $matches[1];
        if ($method === 'GET') {
            $stmt = $pdo->prepare("SELECT * FROM gantt_charts WHERE id = ? OR project_id = ? LIMIT 1");
            $stmt->execute([$id, $id]);
            $chart = $stmt->fetch();
            if (!$chart) {
                http_response_code(404);
                echo json_encode(['error' => 'Gantt chart not found']);
                exit;
            }
            $chart['tasks'] = json_decode($chart['tasks'] ?? '[]', true) ?: [];
            echo json_encode($chart);
            exit;
        }

        if ($method === 'PUT') {
            $input = getJsonInput();
            $existing = $pdo->prepare("SELECT * FROM gantt_charts WHERE id = ?");
            $existing->execute([$id]);
            $current = $existing->fetch();
            if (!$current) {
                http_response_code(404);
                echo json_encode(['error' => 'Gantt chart not found']);
                exit;
            }

            $title = $input['title'] ?? $current['title'];
            $projectId = $input['project_id'] ?? $current['project_id'];
            $projectName = $input['project_name'] ?? $current['project_name'];
            $startDate = $input['start_date'] ?? $current['start_date'];
            $endDate = $input['end_date'] ?? $current['end_date'];
            $notes = array_key_exists('notes', $input) ? $input['notes'] : $current['notes'];
            $tasks = array_key_exists('tasks', $input) ? json_encode($input['tasks']) : $current['tasks'];
            $now = gmdate('Y-m-d\TH:i:s\Z');

            $stmt = $pdo->prepare("UPDATE gantt_charts SET title = ?, project_id = ?, project_name = ?, start_date = ?, end_date = ?, notes = ?, tasks = ?, updated_at = ? WHERE id = ?");
            $stmt->execute([$title, $projectId, $projectName, $startDate, $endDate, $notes, $tasks, $now, $id]);

            $updated = $pdo->query("SELECT * FROM gantt_charts WHERE id = '$id'")->fetch();
            if ($updated) {
                $updated['tasks'] = json_decode($updated['tasks'] ?? '[]', true) ?: [];
            }
            echo json_encode($updated);
            exit;
        }

        if ($method === 'DELETE') {
            $stmt = $pdo->prepare("DELETE FROM gantt_charts WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    // 18. Backup & Restore
    if ($endpoint === 'backup') {
        $settings = $pdo->query("SELECT * FROM company_settings WHERE id = 'company-main'")->fetch();
        unset($settings['password_hash'], $settings['salt']);
        $settings['is_password_set'] = (bool)($settings['is_password_set'] ?? false);

        $team = $pdo->query("SELECT * FROM team_members")->fetchAll();
        $clients = $pdo->query("SELECT * FROM clients")->fetchAll();
        $projects = $pdo->query("SELECT * FROM projects")->fetchAll();
        foreach ($projects as &$p) {
            $p['is_archived'] = (bool)$p['is_archived'];
            $p['team_member_ids'] = json_decode($p['team_member_ids'] ?? '[]', true) ?: [];
        }
        $tasks = $pdo->query("SELECT * FROM tasks")->fetchAll();
        $followups = $pdo->query("SELECT * FROM follow_ups")->fetchAll();
        $activities = $pdo->query("SELECT * FROM activities")->fetchAll();
        $ganttCharts = $pdo->query("SELECT * FROM gantt_charts")->fetchAll();
        foreach ($ganttCharts as &$gc) {
            $gc['tasks'] = json_decode($gc['tasks'] ?? '[]', true) ?: [];
        }

        echo json_encode([
            'settings' => $settings,
            'team_members' => $team,
            'clients' => $clients,
            'projects' => $projects,
            'tasks' => $tasks,
            'follow_ups' => $followups,
            'activities' => $activities,
            'gantt_charts' => $ganttCharts,
        ]);
        exit;
    }

    // Fallback 404
    http_response_code(404);
    echo json_encode(['error' => "Endpoint not found: $endpoint"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
