-- Set the first user as super admin (you can change this to your specific user_id)
UPDATE profiles 
SET role = 'super_admin' 
WHERE user_id = 'b06c26e1-aa4e-4cb5-940c-54ea92f2be0f';

-- Or alternatively, you can use this to set the first created user as super admin:
-- UPDATE profiles 
-- SET role = 'super_admin' 
-- WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);