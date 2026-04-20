-- Temporarily deactivate the SMS & Email addon for testing
UPDATE business_addons 
SET status = 'cancelled'
WHERE id = 'd6c00757-eb1e-48d2-9cbb-83293eda208e';