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
            avatar TEXT,
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
    ];

    foreach ($queries as $q) {
        $pdo->exec($q);
    }

    // Check if initial settings exist
    $stmt = $pdo->query("SELECT id FROM company_settings WHERE id = 'company-main' LIMIT 1");
    if (!$stmt->fetch()) {
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $insert = $pdo->prepare("INSERT INTO company_settings (id, company_name, company_address, company_phone, company_email, tagline, currency_symbol, is_password_set, created_at, updated_at) 
            VALUES ('company-main', 'Falcon Engineering & Construction', 'House 42, Road 11, Block D, Banani, Dhaka-1213', '+880 1711-000000', 'operations@falconeng.com', 'Centralized Workspace & Operations Command', '৳', 0, :c, :u)");
        $insert->execute([':c' => $now, ':u' => $now]);
    }
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
        $activeProjects = (int)$pdo->query("SELECT COUNT(*) FROM projects WHERE status = 'active' AND is_archived = 0")->fetchColumn();
        $urgentProjects = (int)$pdo->query("SELECT COUNT(*) FROM projects WHERE priority = 'urgent' AND is_archived = 0")->fetchColumn();
        $totalProjects = (int)$pdo->query("SELECT COUNT(*) FROM projects WHERE is_archived = 0")->fetchColumn();
        $dueSoon = (int)$pdo->query("SELECT COUNT(*) FROM tasks WHERE status != 'completed'")->fetchColumn();
        $overdue = (int)$pdo->query("SELECT COUNT(*) FROM tasks WHERE status != 'completed' AND due_date < CURDATE()")->fetchColumn();

        $stats = [
            'activeProjects' => $activeProjects,
            'followUpPending' => 0,
            'dueSoon' => $dueSoon,
            'overdue' => $overdue,
            'urgentProjects' => $urgentProjects,
            'completedThisMonth' => 0,
            'totalProjects' => $totalProjects,
            'statusBreakdown' => [
                'onTrack' => $activeProjects,
                'followUpNeeded' => 0,
                'atRisk' => 0,
                'overdue' => $overdue,
                'completed' => 0
            ]
        ];

        if ($endpoint === 'dashboard') {
            $stmt = $pdo->query("SELECT * FROM projects WHERE is_archived = 0 ORDER BY created_at DESC LIMIT 6");
            $projects = $stmt->fetchAll();
            foreach ($projects as &$p) {
                if (isset($p['team_member_ids']) && is_string($p['team_member_ids'])) {
                    $p['team_member_ids'] = json_decode($p['team_member_ids'], true) ?: [];
                }
            }
            echo json_encode([
                'stats' => $stats,
                'recentProjects' => $projects,
                'activities' => []
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
            foreach ($rows as &$r) {
                $r['is_archived'] = (bool)$r['is_archived'];
                $r['team_member_ids'] = json_decode($r['team_member_ids'] ?? '[]', true) ?: [];
            }
            echo json_encode($rows);
            exit;
        }

        if ($method === 'POST') {
            $input = getJsonInput();
            $id = 'proj-' . bin2hex(random_bytes(6));
            $now = gmdate('Y-m-d\TH:i:s\Z');
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
                json_encode($input['team_member_ids'] ?? []),
                $input['priority'] ?? 'standard',
                $input['status'] ?? 'active',
                $input['start_date'] ?? date('Y-m-d'),
                $input['expected_completion_date'] ?? null,
                $input['actual_completion_date'] ?? null,
                $now,
                $now
            ]);

            $r = $pdo->query("SELECT * FROM projects WHERE id = '$id'")->fetch();
            $r['is_archived'] = (bool)$r['is_archived'];
            $r['team_member_ids'] = json_decode($r['team_member_ids'] ?? '[]', true) ?: [];
            echo json_encode($r);
            exit;
        }
    }

    // 9. Archived projects
    if ($endpoint === 'projects/archived') {
        $stmt = $pdo->query("SELECT * FROM projects WHERE is_archived = 1 ORDER BY updated_at DESC");
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['is_archived'] = (bool)$r['is_archived'];
            $r['team_member_ids'] = json_decode($r['team_member_ids'] ?? '[]', true) ?: [];
        }
        echo json_encode($rows);
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
            $r['is_archived'] = (bool)$r['is_archived'];
            $r['team_member_ids'] = json_decode($r['team_member_ids'] ?? '[]', true) ?: [];

            // Fetch tasks, followups, activities
            $tasks = $pdo->prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY due_date ASC");
            $tasks->execute([$projId]);
            $r['tasks'] = $tasks->fetchAll();

            $followups = $pdo->prepare("SELECT * FROM follow_ups WHERE project_id = ? ORDER BY follow_up_date ASC");
            $followups->execute([$projId]);
            $r['follow_ups'] = $followups->fetchAll();

            $activities = $pdo->prepare("SELECT * FROM activities WHERE project_id = ? ORDER BY created_at DESC");
            $activities->execute([$projId]);
            $r['activities'] = $activities->fetchAll();

            echo json_encode($r);
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

            $r = $pdo->query("SELECT * FROM projects WHERE id = '$projId'")->fetch();
            $r['is_archived'] = (bool)$r['is_archived'];
            $r['team_member_ids'] = json_decode($r['team_member_ids'] ?? '[]', true) ?: [];
            echo json_encode($r);
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

    // 17. Backup & Restore
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

        echo json_encode([
            'settings' => $settings,
            'team_members' => $team,
            'clients' => $clients,
            'projects' => $projects,
            'tasks' => $tasks,
            'follow_ups' => $followups,
            'activities' => $activities,
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
