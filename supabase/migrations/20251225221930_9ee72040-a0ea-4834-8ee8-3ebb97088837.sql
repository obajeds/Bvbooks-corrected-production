-- Add the current user as a super admin
INSERT INTO admin_roles (user_id, role)
VALUES ('1a949314-edb4-438f-8e45-2020a369a3e0', 'super_admin')
ON CONFLICT DO NOTHING;