<?php
// Authentication endpoints

require_once '../config.php';

$middleware = new Middleware();
$auth = new Auth();

// Handle different endpoints
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Parse the request path
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));
$endpoint = end($pathParts);

try {
    switch ($endpoint) {
        case 'login':
            $middleware->validateMethod(['POST']);
            
            $input = json_decode(file_get_contents('php://input'), true);
            $middleware->validateInput($input, [
                'email' => ['required' => true, 'type' => 'email'],
                'password' => ['required' => true, 'min_length' => 1]
            ]);
            
            $result = $auth->login($input['email'], $input['password']);
            Utils::sendResponse($result);
            break;
            
        case 'register':
            $middleware->validateMethod(['POST']);
            
            $input = json_decode(file_get_contents('php://input'), true);
            $middleware->validateInput($input, [
                'email' => ['required' => true, 'type' => 'email'],
                'password' => ['required' => true, 'min_length' => Config::PASSWORD_MIN_LENGTH],
                'fullName' => ['required' => true, 'type' => 'string', 'max_length' => 255],
                'traderName' => ['required' => true, 'type' => 'string', 'max_length' => 255]
            ]);
            
            $result = $auth->register(
                $input['email'],
                $input['password'],
                $input['fullName'],
                $input['traderName']
            );
            Utils::sendResponse($result, 201);
            break;
            
        case 'logout':
            $middleware->validateMethod(['POST']);
            
            $user = $middleware->authenticate();
            $headers = getallheaders();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
            preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches);
            $token = $matches[1];
            
            $result = $auth->logout($token);
            Utils::sendResponse($result);
            break;
            
        case 'me':
            $middleware->validateMethod(['GET']);
            
            $user = $middleware->authenticate();
            
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("
                SELECT u.id, u.email, u.last_login, 
                       p.full_name, p.trader_name, p.role, 
                       p.registration_status, p.is_active
                FROM users u 
                JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = ?
            ");
            $stmt->execute([$user['user_id']]);
            $userData = $stmt->fetch();
            
            if (!$userData) {
                Utils::sendError('User not found', 404);
            }
            
            Utils::sendResponse([
                'user' => $userData
            ]);
            break;
            
        case 'refresh':
            $middleware->validateMethod(['POST']);
            
            $user = $middleware->authenticate();
            
            // Generate new token
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("
                SELECT u.*, p.role, p.trader_name 
                FROM users u 
                JOIN profiles p ON u.id = p.user_id 
                WHERE u.id = ?
            ");
            $stmt->execute([$user['user_id']]);
            $userData = $stmt->fetch();
            
            if (!$userData) {
                Utils::sendError('User not found', 404);
            }
            
            $newToken = $auth->generateJWT($userData);
            $auth->storeSession($userData['id'], $newToken);
            
            Utils::sendResponse([
                'token' => $newToken,
                'user' => [
                    'id' => $userData['id'],
                    'email' => $userData['email'],
                    'role' => $userData['role'],
                    'trader_name' => $userData['trader_name']
                ]
            ]);
            break;
            
        default:
            Utils::sendError('Endpoint not found', 404);
    }
    
} catch (Exception $e) {
    error_log("Auth endpoint error: " . $e->getMessage());
    Utils::sendError($e->getMessage(), 500);
}
?>