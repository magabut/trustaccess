CREATE TABLE organizations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tz_offset_min INTEGER NOT NULL DEFAULT 420,
  currency TEXT NOT NULL DEFAULT 'IDR'
);

CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  eid_subject TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'host',
  password_hash TEXT
);

CREATE TABLE areas (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL
);

CREATE TABLE access_points (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  area_id INTEGER NOT NULL REFERENCES areas(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('gate','locker','room'))
);

CREATE TABLE access_rules (
  id BIGSERIAL PRIMARY KEY,
  access_point_id INTEGER NOT NULL REFERENCES access_points(id),
  required_type TEXT NOT NULL,
  prerequisites TEXT NOT NULL DEFAULT '[]',
  area_scope TEXT NOT NULL DEFAULT '[]',
  open_minute INTEGER NOT NULL DEFAULT 0,
  close_minute INTEGER NOT NULL DEFAULT 1440
);

CREATE TABLE tariffs (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  area_scope TEXT NOT NULL DEFAULT '[]',
  price_cents INTEGER NOT NULL,
  valid_hours INTEGER NOT NULL DEFAULT 24
);

CREATE TABLE credential_templates (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL UNIQUE,
  fields_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE issued_passes (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  credential_id TEXT NOT NULL UNIQUE,
  holder_email TEXT NOT NULL,
  template_name TEXT NOT NULL,
  rule_id INTEGER REFERENCES access_rules(id),
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'admin',
  host_ref TEXT,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE access_events (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  pass_id TEXT,
  access_point_id INTEGER NOT NULL REFERENCES access_points(id),
  verdict TEXT NOT NULL,
  reasons TEXT NOT NULL DEFAULT '[]',
  credential_id TEXT,
  action TEXT NOT NULL,
  actuator_detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE payments (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  order_id TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  tariff_id INTEGER NOT NULL REFERENCES tariffs(id),
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'QRIS(mock)',
  status TEXT NOT NULL DEFAULT 'paid',
  receipt_credential_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE kyc_requests (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  holder_email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mock-kyc',
  status TEXT NOT NULL DEFAULT 'approved',
  ref_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE anomaly_alerts (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  pass_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  reasons TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE external_apps (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  client_id TEXT NOT NULL UNIQUE,
  client_secret_hash TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
);

CREATE TABLE registerables (
  id BIGSERIAL PRIMARY KEY,
  org_id INTEGER NOT NULL REFERENCES organizations(id),
  kind TEXT NOT NULL CHECK (kind IN ('room','event','activity','membership','event/external')),
  name TEXT NOT NULL,
  venue TEXT,
  starts_at TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  quota INTEGER,
  credential_template TEXT NOT NULL,
  checkin_rule_id INTEGER REFERENCES access_rules(id),
  reg_token TEXT NOT NULL UNIQUE,
  external_app_id INTEGER REFERENCES external_apps(id),
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE TABLE registrations (
  id BIGSERIAL PRIMARY KEY,
  registerable_id INTEGER NOT NULL REFERENCES registerables(id),
  holder_email TEXT NOT NULL,
  kyc_ref TEXT,
  credential_id TEXT UNIQUE,
  payment_id INTEGER REFERENCES payments(id),
  order_ref TEXT,
  external_app_id INTEGER REFERENCES external_apps(id),
  payment_status TEXT NOT NULL DEFAULT 'paid',
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL
);
