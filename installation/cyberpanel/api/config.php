<?php
// Trading Fund Management System - API Configuration
// CyberPanel/MySQL Version

// Error reporting for development (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers for React frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
class Config {
    // Database settings (update these during installation)
    const DB_HOST = 'localhost';
    const DB_NAME = 'your_database_name';
    const DB_USER = 'your_database_user';
    const DB_PASS = 'your_database_password';
    
    // JWT settings
    const JWT_SECRET = 'your_jwt_secret_key_here_change_this';
    const JWT_EXPIRE = 86400; // 24 hours
    
    // Email settings
    const SMTP_HOST = 'your_smtp_host';
    const SMTP_PORT = 587;
    const SMTP_USER = 'your_smtp_user';
    const SMTP_PASS = 'your_smtp_password';
    const FROM_EMAIL = 'noreply@yourdomain.com';
    const FROM_NAME = 'Trading Fund Management';
    
    // Application settings
    const APP_NAME = 'Trading Fund Management System';
    const APP_URL = 'https://yourdomain.com';
    const ADMIN_EMAIL = 'admin@yourdomain.com';
    
    // Security settings
    const PASSWORD_MIN_LENGTH = 8;
    const MAX_LOGIN_ATTEMPTS = 5;
    const LOGIN_LOCKOUT_TIME = 900; // 15 minutes
}

// Database connection
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host=" . Config::DB_HOST . ";dbname=" . Config::DB_NAME . ";charset=utf8mb4",
                Config::DB_USER,
                Config::DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['error' => 'Database connection failed']);
            exit();
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
}

// Utility functions
class Utils {
    public static function generateUUID() {
        return sprintf(
            '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
    
    public static function sanitizeInput($input) {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }
    
    public static function validateEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL);
    }
    
    public static function sendResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit();
    }
    
    public static function sendError($message, $status = 400) {
        http_response_code($status);
        echo json_encode(['error' => $message]);
        exit();
    }
}

// Include required classes
require_once 'auth.php';
require_once 'middleware.php';
?>