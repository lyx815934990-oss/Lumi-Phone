CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_tag TEXT NOT NULL DEFAULT '',
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  panel_message_id TEXT NOT NULL DEFAULT '',
  starter_message_id TEXT NOT NULL,
  title TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  link TEXT,
  file_name TEXT,
  file_content_type TEXT,
  file_r2_key TEXT,
  file_size INTEGER,
  files_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resources_author ON resources(author_id);

CREATE TABLE IF NOT EXISTS downloads (
  resource_id TEXT NOT NULL,
  downloader_id TEXT NOT NULL,
  downloader_tag TEXT NOT NULL DEFAULT '',
  downloaded_at INTEGER NOT NULL,
  PRIMARY KEY (resource_id, downloader_id)
);

CREATE INDEX IF NOT EXISTS idx_downloads_resource ON downloads(resource_id);
CREATE INDEX IF NOT EXISTS idx_downloads_author_time ON downloads(downloaded_at);
