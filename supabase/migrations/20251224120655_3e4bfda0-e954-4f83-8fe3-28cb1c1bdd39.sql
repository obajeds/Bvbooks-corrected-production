-- Delete trial plan features (trial should be treated as free)
DELETE FROM plan_features WHERE plan = 'trial';

-- Delete trial plan limits (trial should use free limits)
DELETE FROM plan_limits WHERE plan = 'trial';