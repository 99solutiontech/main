-- Trading Fund Management System - MySQL Schema
-- Compatible with CyberPanel/phpMyAdmin

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- Create database (replace 'your_database_name' with actual database name)
-- CREATE DATABASE IF NOT EXISTS your_database_name;
-- USE your_database_name;

-- Profiles table
CREATE TABLE `profiles` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `user_id` varchar(36) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `trader_name` varchar(255) NOT NULL,
  `role` enum('user','super_admin') DEFAULT 'user',
  `registration_status` enum('pending','approved','rejected') DEFAULT 'approved',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fund data table
CREATE TABLE `fund_data` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `user_id` varchar(36) NOT NULL,
  `mode` enum('diamond','gold') NOT NULL,
  `sub_user_name` varchar(255) DEFAULT NULL,
  `initial_capital` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_capital` decimal(15,2) NOT NULL DEFAULT 0.00,
  `active_fund` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reserve_fund` decimal(15,2) NOT NULL DEFAULT 0.00,
  `profit_fund` decimal(15,2) NOT NULL DEFAULT 0.00,
  `target_reserve_fund` decimal(15,2) NOT NULL DEFAULT 0.00,
  `risk_percent` decimal(5,2) DEFAULT 40.00,
  `lot_base_capital` decimal(15,2) DEFAULT 1000.00,
  `lot_base_lot` decimal(8,2) DEFAULT 0.40,
  `profit_dist_profit` int(11) DEFAULT 25,
  `profit_dist_reserve` int(11) DEFAULT 25,
  `profit_dist_active` int(11) DEFAULT 50,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_mode` (`user_id`, `mode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Trading history table
CREATE TABLE `trading_history` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `user_id` varchar(36) NOT NULL,
  `mode` enum('diamond','gold') NOT NULL,
  `sub_user_name` varchar(255) DEFAULT NULL,
  `type` enum('Win','Loss','Deposit','Withdrawal','Transfer') NOT NULL,
  `amount` decimal(15,2) DEFAULT NULL,
  `end_balance` decimal(15,2) NOT NULL,
  `details` text NOT NULL,
  `trade_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_mode_date` (`user_id`, `mode`, `trade_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction history table
CREATE TABLE `transaction_history` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `user_id` varchar(36) NOT NULL,
  `mode` enum('diamond','gold') NOT NULL,
  `sub_user_name` varchar(255) DEFAULT NULL,
  `transaction_type` enum('deposit','withdrawal','transfer','trade_win','trade_loss','profit_distribution') NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `from_fund` enum('active','reserve','profit') DEFAULT NULL,
  `to_fund` enum('active','reserve','profit') DEFAULT NULL,
  `description` text NOT NULL,
  `balance_before` decimal(15,2) NOT NULL,
  `balance_after` decimal(15,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_mode` (`user_id`, `mode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin notifications table
CREATE TABLE `admin_notifications` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `user_id` varchar(36) DEFAULT NULL,
  `type` enum('user_registration','trade_alert','system_alert','approval_request') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `trader_name` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type_read` (`type`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table for authentication
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email_verified` tinyint(1) DEFAULT 0,
  `verification_token` varchar(255) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_expires` timestamp NULL DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table for JWT token management
CREATE TABLE `sessions` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `user_id` varchar(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_token` (`user_id`, `token_hash`),
  KEY `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for better performance
CREATE INDEX idx_profiles_trader_name ON profiles(trader_name);
CREATE INDEX idx_fund_data_updated ON fund_data(updated_at);
CREATE INDEX idx_trading_history_created ON trading_history(created_at);
CREATE INDEX idx_transaction_history_created ON transaction_history(created_at);
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at);

COMMIT;