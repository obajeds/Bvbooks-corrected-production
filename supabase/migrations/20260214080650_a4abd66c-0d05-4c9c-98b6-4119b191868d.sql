-- Fix: both branches currently have is_main = true
-- Set "Honorable CDA" to normal (not main), keep "Container-Awoyaya" as main
UPDATE branches SET is_main = false WHERE id = 'cc3f47c3-cd77-40f7-9e9a-9c799c7dddcc';
