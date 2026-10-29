PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS curiosities (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  inspiration TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('恒星', '小行星')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS curiosities_user_id_idx ON curiosities(user_id);

CREATE TABLE IF NOT EXISTS curiosity_trails (
  id TEXT PRIMARY KEY NOT NULL,
  curiosity_id TEXT NOT NULL REFERENCES curiosities(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS curiosity_trails_curiosity_id_idx ON curiosity_trails(curiosity_id);

CREATE TABLE IF NOT EXISTS user_connections (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'independent', 'later')),
  updated_at INTEGER NOT NULL
);
