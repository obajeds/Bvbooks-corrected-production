-- Delete the enx staff record that is linked to the business owner account
DELETE FROM staff_permissions WHERE staff_id = '4ccfa9ce-8bf4-4186-9f99-55f06e697c31';

DELETE FROM staff WHERE id = '4ccfa9ce-8bf4-4186-9f99-55f06e697c31';