-- Update expired staff branch assignment for the supervisor
UPDATE staff_branch_assignments 
SET expires_at = NULL,
    role_template_id = '5facd8db-9ae9-4153-821c-e86466b7b80d'
WHERE id = '4047d496-e58c-4e0d-9aa6-5469a2bd358b';