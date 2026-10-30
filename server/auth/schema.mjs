export const authSchema = [
  'CREATE TABLE IF NOT EXISTS auth_demo_email_checks (user_id TEXT PRIMARY KEY, email TEXT NOT NULL, checked_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS auth_profiles (user_id TEXT PRIMARY KEY, display_name TEXT NOT NULL, bio TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS auth_report_owners (report_id TEXT PRIMARY KEY, user_id TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS auth_report_owners_user ON auth_report_owners(user_id)',
  'CREATE TABLE IF NOT EXISTS auth_credentials (email TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS auth_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS auth_flows (state TEXT PRIMARY KEY, binding TEXT NOT NULL, provider TEXT NOT NULL, nonce TEXT NOT NULL, verifier TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS auth_users (id TEXT PRIMARY KEY, provider TEXT NOT NULL, name TEXT NOT NULL, email TEXT)',
  'CREATE TABLE IF NOT EXISTS auth_sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires)',
];
