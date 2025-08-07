<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Fund Management System - Installation</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
        .container { max-width: 800px; margin: 50px auto; background: white; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { padding: 30px; }
        .step { display: none; }
        .step.active { display: block; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: 600; color: #333; }
        input, select, textarea { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 5px; font-size: 14px; }
        input:focus, select:focus, textarea:focus { border-color: #667eea; outline: none; }
        .btn { background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; margin-right: 10px; }
        .btn:hover { background: #5a6fd8; }
        .btn-secondary { background: #6c757d; }
        .btn-secondary:hover { background: #5a6268; }
        .progress { background: #e9ecef; height: 6px; border-radius: 3px; margin-bottom: 30px; overflow: hidden; }
        .progress-bar { background: #667eea; height: 100%; transition: width 0.3s ease; }
        .alert { padding: 15px; margin: 15px 0; border-radius: 5px; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .alert-info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .feature-list { list-style: none; }
        .feature-list li { padding: 8px 0; }
        .feature-list li:before { content: "✓ "; color: #28a745; font-weight: bold; }
        .navigation { padding: 20px 30px; border-top: 1px solid #eee; background: #f8f9fa; border-radius: 0 0 10px 10px; }
        .step-indicator { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .step-item { flex: 1; text-align: center; position: relative; }
        .step-item:not(:last-child):after { content: ''; position: absolute; top: 20px; right: -50%; width: 100%; height: 2px; background: #ddd; z-index: -1; }
        .step-number { width: 40px; height: 40px; border-radius: 50%; background: #ddd; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-weight: bold; }
        .step-item.completed .step-number { background: #28a745; }
        .step-item.active .step-number { background: #667eea; }
        .step-title { font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Trading Fund Management System</h1>
            <p>CyberPanel Installation Wizard</p>
        </div>
        
        <div class="content">
            <div class="step-indicator">
                <div class="step-item active" data-step="1">
                    <div class="step-number">1</div>
                    <div class="step-title">Welcome</div>
                </div>
                <div class="step-item" data-step="2">
                    <div class="step-number">2</div>
                    <div class="step-title">Database</div>
                </div>
                <div class="step-item" data-step="3">
                    <div class="step-number">3</div>
                    <div class="step-title">Admin</div>
                </div>
                <div class="step-item" data-step="4">
                    <div class="step-number">4</div>
                    <div class="step-title">Complete</div>
                </div>
            </div>
            
            <div class="progress">
                <div class="progress-bar" style="width: 25%"></div>
            </div>
            
            <!-- Step 1: Welcome -->
            <div class="step active" id="step1">
                <h2>Welcome to Trading Fund Management System</h2>
                <p>This installation wizard will help you set up your trading fund management system on CyberPanel hosting.</p>
                
                <h3>System Requirements</h3>
                <ul class="feature-list">
                    <li>PHP 8.1 or higher</li>
                    <li>MySQL/MariaDB database</li>
                    <li>SSL certificate (HTTPS)</li>
                    <li>Email service (SMTP)</li>
                </ul>
                
                <h3>What will be installed:</h3>
                <ul class="feature-list">
                    <li>Complete database schema</li>
                    <li>PHP REST API backend</li>
                    <li>User authentication system</li>
                    <li>Trading and fund management features</li>
                    <li>Admin panel functionality</li>
                    <li>Email notifications</li>
                </ul>
                
                <div class="alert alert-info">
                    <strong>Note:</strong> Make sure you have created a MySQL database in your CyberPanel before proceeding.
                </div>
            </div>
            
            <!-- Step 2: Database Configuration -->
            <div class="step" id="step2">
                <h2>Database Configuration</h2>
                <p>Enter your MySQL database connection details:</p>
                
                <form id="dbForm">
                    <div class="form-group">
                        <label for="db_host">Database Host:</label>
                        <input type="text" id="db_host" name="db_host" value="localhost" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="db_name">Database Name:</label>
                        <input type="text" id="db_name" name="db_name" required placeholder="Enter your database name">
                    </div>
                    
                    <div class="form-group">
                        <label for="db_user">Database Username:</label>
                        <input type="text" id="db_user" name="db_user" required placeholder="Enter database username">
                    </div>
                    
                    <div class="form-group">
                        <label for="db_pass">Database Password:</label>
                        <input type="password" id="db_pass" name="db_pass" required placeholder="Enter database password">
                    </div>
                    
                    <div class="form-group">
                        <label for="app_url">Application URL:</label>
                        <input type="url" id="app_url" name="app_url" required placeholder="https://yourdomain.com">
                    </div>
                </form>
                
                <div id="dbTestResult"></div>
            </div>
            
            <!-- Step 3: Admin Configuration -->
            <div class="step" id="step3">
                <h2>Create Administrator Account</h2>
                <p>Set up your first super admin account:</p>
                
                <form id="adminForm">
                    <div class="form-group">
                        <label for="admin_email">Admin Email:</label>
                        <input type="email" id="admin_email" name="admin_email" required placeholder="admin@yourdomain.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="admin_password">Admin Password:</label>
                        <input type="password" id="admin_password" name="admin_password" required minlength="8" placeholder="Minimum 8 characters">
                    </div>
                    
                    <div class="form-group">
                        <label for="admin_name">Full Name:</label>
                        <input type="text" id="admin_name" name="admin_name" required placeholder="Administrator Name">
                    </div>
                    
                    <div class="form-group">
                        <label for="trader_name">Trader Name:</label>
                        <input type="text" id="trader_name" name="trader_name" required placeholder="Admin Trader">
                    </div>
                    
                    <h3>Email Configuration (Optional)</h3>
                    <div class="form-group">
                        <label for="smtp_host">SMTP Host:</label>
                        <input type="text" id="smtp_host" name="smtp_host" placeholder="mail.yourdomain.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="smtp_user">SMTP Username:</label>
                        <input type="text" id="smtp_user" name="smtp_user" placeholder="noreply@yourdomain.com">
                    </div>
                    
                    <div class="form-group">
                        <label for="smtp_pass">SMTP Password:</label>
                        <input type="password" id="smtp_pass" name="smtp_pass" placeholder="SMTP password">
                    </div>
                </form>
            </div>
            
            <!-- Step 4: Complete -->
            <div class="step" id="step4">
                <h2>Installation Complete!</h2>
                <div class="alert alert-success">
                    <strong>Congratulations!</strong> Your Trading Fund Management System has been successfully installed.
                </div>
                
                <h3>What's Next?</h3>
                <ul class="feature-list">
                    <li>Delete this install.php file for security</li>
                    <li>Access your application at your domain</li>
                    <li>Login with your admin credentials</li>
                    <li>Configure system settings</li>
                    <li>Add users and start trading</li>
                </ul>
                
                <div class="alert alert-info">
                    <strong>Important:</strong> Please delete the install.php file from your server for security reasons.
                </div>
                
                <a href="/" class="btn">Access Your Application</a>
            </div>
        </div>
        
        <div class="navigation">
            <button type="button" class="btn btn-secondary" id="prevBtn" onclick="changeStep(-1)" style="display: none;">Previous</button>
            <button type="button" class="btn" id="nextBtn" onclick="changeStep(1)">Next</button>
        </div>
    </div>

    <script>
        let currentStep = 1;
        const totalSteps = 4;

        function changeStep(direction) {
            if (direction === 1) {
                if (currentStep === 2 && !validateDatabase()) return;
                if (currentStep === 3 && !validateAdmin()) return;
            }
            
            const newStep = currentStep + direction;
            if (newStep >= 1 && newStep <= totalSteps) {
                showStep(newStep);
            }
        }

        function showStep(step) {
            // Hide all steps
            document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.step-item').forEach(s => s.classList.remove('active', 'completed'));
            
            // Show current step
            document.getElementById(`step${step}`).classList.add('active');
            
            // Update step indicator
            for (let i = 1; i <= step; i++) {
                const stepItem = document.querySelector(`[data-step="${i}"]`);
                if (i < step) {
                    stepItem.classList.add('completed');
                } else if (i === step) {
                    stepItem.classList.add('active');
                }
            }
            
            // Update progress bar
            const progress = (step / totalSteps) * 100;
            document.querySelector('.progress-bar').style.width = progress + '%';
            
            // Update navigation buttons
            document.getElementById('prevBtn').style.display = step === 1 ? 'none' : 'inline-block';
            document.getElementById('nextBtn').textContent = step === totalSteps ? 'Finish' : 'Next';
            
            currentStep = step;
        }

        function validateDatabase() {
            const form = document.getElementById('dbForm');
            const formData = new FormData(form);
            
            // Basic validation
            const required = ['db_host', 'db_name', 'db_user', 'db_pass', 'app_url'];
            for (let field of required) {
                if (!formData.get(field)) {
                    alert(`${field.replace('_', ' ')} is required`);
                    return false;
                }
            }
            
            // Test database connection (you would implement this)
            return testDatabaseConnection(formData);
        }

        function validateAdmin() {
            const form = document.getElementById('adminForm');
            const formData = new FormData(form);
            
            // Basic validation
            const required = ['admin_email', 'admin_password', 'admin_name', 'trader_name'];
            for (let field of required) {
                if (!formData.get(field)) {
                    alert(`${field.replace('_', ' ')} is required`);
                    return false;
                }
            }
            
            if (formData.get('admin_password').length < 8) {
                alert('Password must be at least 8 characters');
                return false;
            }
            
            // Install the system
            return installSystem(formData);
        }

        function testDatabaseConnection(formData) {
            // Implement database connection test
            // This would make an AJAX call to test the connection
            return true; // Placeholder
        }

        function installSystem(formData) {
            // Implement system installation
            // This would make AJAX calls to set up the database and create admin user
            return true; // Placeholder
        }
    </script>
</body>
</html>

<?php
// PHP installation logic would go here
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Handle installation steps
    // This is a placeholder - full implementation would handle:
    // 1. Database connection testing
    // 2. Schema creation
    // 3. Admin user creation
    // 4. Configuration file generation
}
?>