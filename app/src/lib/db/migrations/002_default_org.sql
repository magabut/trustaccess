-- Ensure at least one organization exists so verifier login can create users.
-- Idempotent: no-op when any organization is already present (e.g. after demo seed).
INSERT INTO organizations (name, tz_offset_min, currency)
SELECT 'Default', 420, 'IDR'
WHERE NOT EXISTS (SELECT 1 FROM organizations);
