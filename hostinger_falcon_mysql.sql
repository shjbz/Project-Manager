-- Falcon Engineering & Construction
-- Hostinger MySQL Database Schema & Initial Data
-- Database: u345742528_manage_falcon
-- User: u345742528_shuzaul

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- Table structure for table `company_settings`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` varchar(64) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `company_address` text DEFAULT NULL,
  `company_phone` varchar(100) DEFAULT NULL,
  `company_email` varchar(255) DEFAULT NULL,
  `company_logo` mediumtext DEFAULT NULL,
  `logo_url` mediumtext DEFAULT NULL,
  `tagline` varchar(255) DEFAULT NULL,
  `currency_symbol` varchar(16) DEFAULT '৳',
  `is_password_set` tinyint(1) DEFAULT 0,
  `password_hash` varchar(255) DEFAULT NULL,
  `salt` varchar(255) DEFAULT NULL,
  `created_at` varchar(64) DEFAULT NULL,
  `updated_at` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `team_members`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `avatar` mediumtext DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(32) DEFAULT 'active',
  `created_at` varchar(64) DEFAULT NULL,
  `updated_at` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `clients`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clients` (
  `id` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `company` varchar(255) DEFAULT NULL,
  `phone` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(32) DEFAULT 'active',
  `created_at` varchar(64) DEFAULT NULL,
  `updated_at` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `projects`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `id` varchar(64) NOT NULL,
  `project_name` varchar(255) NOT NULL,
  `project_type` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `client_id` varchar(64) DEFAULT NULL,
  `project_lead_id` varchar(64) DEFAULT NULL,
  `team_member_ids` text DEFAULT NULL,
  `priority` varchar(32) DEFAULT 'standard',
  `status` varchar(32) DEFAULT 'active',
  `start_date` varchar(64) DEFAULT NULL,
  `expected_completion_date` varchar(64) DEFAULT NULL,
  `actual_completion_date` varchar(64) DEFAULT NULL,
  `is_archived` tinyint(1) DEFAULT 0,
  `archived_at` varchar(64) DEFAULT NULL,
  `created_at` varchar(64) DEFAULT NULL,
  `updated_at` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_client` (`client_id`),
  KEY `idx_lead` (`project_lead_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `tasks`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `assigned_to` varchar(64) DEFAULT NULL,
  `priority` varchar(32) DEFAULT 'standard',
  `due_date` varchar(64) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'pending',
  `created_at` varchar(64) DEFAULT NULL,
  `updated_at` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `follow_ups`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `follow_ups` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `follow_up_date` varchar(64) DEFAULT NULL,
  `method` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` varchar(64) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'pending',
  `created_at` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `activities`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `activities` (
  `id` varchar(64) NOT NULL,
  `project_id` varchar(64) NOT NULL,
  `team_member_id` varchar(64) DEFAULT NULL,
  `activity_type` varchar(64) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `activity_date` varchar(64) DEFAULT NULL,
  `created_at` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `auth_sessions`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auth_sessions` (
  `token` varchar(128) NOT NULL,
  `created_at` int(11) DEFAULT NULL,
  `last_active` int(11) DEFAULT NULL,
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
