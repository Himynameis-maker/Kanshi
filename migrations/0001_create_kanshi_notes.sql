CREATE TABLE IF NOT EXISTS kanshi_notes (
  note_date TEXT NOT NULL,
  task_name TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) <= 500),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (note_date, task_name)
);
