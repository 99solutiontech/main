<?php
// Authentication system for CyberPanel installation

require_once 'config.php';

class Auth {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }
    
    // Register new user
    public function register($email, $password, $fullName, $traderName) {
        try {
            // Validate input
            if (!Utils::validateEmail($email)) {
                throw new Exception('Invalid email format');
            }
            
            if (strlen($password) < Config::PASSWORD_MIN_LENGTH) {
                throw new Exception('Password must be at least ' . Config::PASSWORD_MIN_LENGTH . ' characters');
            }
            
            // Check if user already exists
            $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                throw new Exception('Email already registered');
            }
            
            // Create user
            $userId = Utils::generateUUID();
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $verificationToken = bin2hex(random_bytes(32));
            
            $this->db->beginTransaction();
            
            // Insert user
            $stmt = $this->db->prepare("
                INSERT INTO users (id, email, password_hash, verification_token) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$userId, $email, $passwordHash, $verificationToken]);
            
            // Insert profile
            $profileId = Utils::generateUUID();
            $stmt = $this->db->prepare("
                INSERT INTO profiles (id, user_id, full_name, trader_name, role, registration_status) 
                VALUES (?, ?, ?, ?, 'user', 'pending')
            ");
            $stmt->execute([$profileId, $userId, $fullName, $traderName]);
            
            $this->db->commit();
            
            // Send admin notification
            $this->sendAdminNotification('user_registration', 'New User Registration', 
                "New user registered: $traderName ($email)", $traderName);
            
            return [
                'success' => true,
                'message' => 'Registration successful. Please wait for admin approval.',
                'userId' => $userId
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }
    
    // Login user
    public function login($email, $password) {
        try {
            // Get user
            $stmt = $this->db->prepare("
                SELECT u.*, p.role, p.registration_status, p.is_active, p.trader_name 
                FROM users u 
                JOIN profiles p ON u.id = p.user_id 
                WHERE u.email = ?
            ");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if (!$user || !password_verify($password, $user['password_hash'])) {
                throw new Exception('Invalid email or password');
            }
            
            if ($user['registration_status'] !== 'approved') {
                throw new Exception('Account pending admin approval');
            }
            
            if (!$user['is_active']) {
                throw new Exception('Account has been deactivated');
            }
            
            // Update last login
            $stmt = $this->db->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
            $stmt->execute([$user['id']]);
            
            // Generate JWT token
            $token = $this->generateJWT($user);
            
            // Store session
            $this->storeSession($user['id'], $token);
            
            return [
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'trader_name' => $user['trader_name']
                ]
            ];
            
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    // Generate JWT token
    private function generateJWT($user) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'exp' => time() + Config::JWT_EXPIRE
        ]);
        
        $headerEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $payloadEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
        
        $signature = hash_hmac('sha256', $headerEncoded . "." . $payloadEncoded, Config::JWT_SECRET, true);
        $signatureEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
        
        return $headerEncoded . "." . $payloadEncoded . "." . $signatureEncoded;
    }
    
    // Verify JWT token
    public function verifyJWT($token) {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }
            
            $header = $parts[0];
            $payload = $parts[1];
            $signature = $parts[2];
            
            $expectedSignature = hash_hmac('sha256', $header . "." . $payload, Config::JWT_SECRET, true);
            $expectedSignatureEncoded = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expectedSignature));
            
            if ($signature !== $expectedSignatureEncoded) {
                return false;
            }
            
            $payloadDecoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
            
            if (!$payloadDecoded || $payloadDecoded['exp'] < time()) {
                return false;
            }
            
            return $payloadDecoded;
            
        } catch (Exception $e) {
            return false;
        }
    }
    
    // Store session
    private function storeSession($userId, $token) {
        $tokenHash = hash('sha256', $token);
        $expiresAt = date('Y-m-d H:i:s', time() + Config::JWT_EXPIRE);
        
        $stmt = $this->db->prepare("
            INSERT INTO sessions (id, user_id, token_hash, expires_at) 
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([Utils::generateUUID(), $userId, $tokenHash, $expiresAt]);
        
        // Clean expired sessions
        $stmt = $this->db->prepare("DELETE FROM sessions WHERE expires_at < NOW()");
        $stmt->execute();
    }
    
    // Send admin notification
    private function sendAdminNotification($type, $title, $message, $traderName = null) {
        $stmt = $this->db->prepare("
            INSERT INTO admin_notifications (id, type, title, message, trader_name) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([Utils::generateUUID(), $type, $title, $message, $traderName]);
    }
    
    // Logout user
    public function logout($token) {
        $tokenHash = hash('sha256', $token);
        $stmt = $this->db->prepare("DELETE FROM sessions WHERE token_hash = ?");
        $stmt->execute([$tokenHash]);
        
        return ['success' => true, 'message' => 'Logged out successfully'];
    }
}
?>