-- Update Connect's current_plan to professional (fixing trailing space issue)
UPDATE businesses SET current_plan = 'professional' WHERE trading_name LIKE 'Connect%';