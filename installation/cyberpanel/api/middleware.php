<?php
// Middleware for authentication and authorization

require_once 'config.php';

class Middleware {
    private $auth;
    
    public function __construct() {
        $this->auth = new Auth();
    }
    
    // Authenticate user from token
    public function authenticate() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            Utils::sendError('Authentication required', 401);
        }
        
        $token = $matches[1];
        $payload = $this->auth->verifyJWT($token);
        
        if (!$payload) {
            Utils::sendError('Invalid or expired token', 401);
        }
        
        // Check if session exists
        $db = Database::getInstance()->getConnection();
        $tokenHash = hash('sha256', $token);
        $stmt = $db->prepare("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > NOW()");
        $stmt->execute([$tokenHash]);
        
        if (!$stmt->fetch()) {
            Utils::sendError('Session expired', 401);
        }
        
        return $payload;
    }
    
    // Check if user has required role
    public function requireRole($requiredRole) {
        $user = $this->authenticate();
        
        if ($user['role'] !== $requiredRole && $user['role'] !== 'super_admin') {
            Utils::sendError('Insufficient permissions', 403);
        }
        
        return $user;
    }
    
    // Check if user is super admin
    public function requireAdmin() {
        return $this->requireRole('super_admin');
    }
    
    // Validate request method
    public function validateMethod($allowedMethods) {
        $method = $_SERVER['REQUEST_METHOD'];
        
        if (!in_array($method, $allowedMethods)) {
            Utils::sendError('Method not allowed', 405);
        }
    }
    
    // Rate limiting (basic implementation)
    public function rateLimit($maxRequests = 100, $timeWindow = 3600) {
        $ip = $_SERVER['REMOTE_ADDR'];
        $cacheFile = sys_get_temp_dir() . '/rate_limit_' . md5($ip);
        
        $requests = [];
        if (file_exists($cacheFile)) {
            $requests = json_decode(file_get_contents($cacheFile), true) ?? [];
        }
        
        $now = time();
        $requests = array_filter($requests, function($timestamp) use ($now, $timeWindow) {
            return $timestamp > ($now - $timeWindow);
        });
        
        if (count($requests) >= $maxRequests) {
            Utils::sendError('Rate limit exceeded', 429);
        }
        
        $requests[] = $now;
        file_put_contents($cacheFile, json_encode($requests));
    }
    
    // CSRF protection
    public function validateCSRF() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT' || $_SERVER['REQUEST_METHOD'] === 'DELETE') {
            $headers = getallheaders();
            $contentType = $headers['Content-Type'] ?? '';
            
            // Allow JSON requests (they can't be made from forms)
            if (strpos($contentType, 'application/json') !== false) {
                return true;
            }
            
            // Check for CSRF token in other requests
            $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
            $sessionToken = $_SESSION['csrf_token'] ?? '';
            
            if (!$token || !$sessionToken || !hash_equals($sessionToken, $token)) {
                Utils::sendError('CSRF token mismatch', 403);
            }
        }
    }
    
    // Input validation
    public function validateInput($data, $rules) {
        $errors = [];
        
        foreach ($rules as $field => $rule) {
            $value = $data[$field] ?? null;
            
            if (isset($rule['required']) && $rule['required'] && empty($value)) {
                $errors[$field] = $field . ' is required';
                continue;
            }
            
            if (!empty($value)) {
                if (isset($rule['type'])) {
                    switch ($rule['type']) {
                        case 'email':
                            if (!Utils::validateEmail($value)) {
                                $errors[$field] = $field . ' must be a valid email';
                            }
                            break;
                        case 'numeric':
                            if (!is_numeric($value)) {
                                $errors[$field] = $field . ' must be numeric';
                            }
                            break;
                        case 'string':
                            if (!is_string($value)) {
                                $errors[$field] = $field . ' must be a string';
                            }
                            break;
                    }
                }
                
                if (isset($rule['min_length']) && strlen($value) < $rule['min_length']) {
                    $errors[$field] = $field . ' must be at least ' . $rule['min_length'] . ' characters';
                }
                
                if (isset($rule['max_length']) && strlen($value) > $rule['max_length']) {
                    $errors[$field] = $field . ' must not exceed ' . $rule['max_length'] . ' characters';
                }
            }
        }
        
        if (!empty($errors)) {
            Utils::sendError($errors, 422);
        }
        
        return true;
    }
}
?>