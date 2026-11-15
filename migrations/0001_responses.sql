CREATE TABLE IF NOT EXISTS life_responses (
  id TEXT PRIMARY KEY,
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  cohort TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version = 1),
  life_evaluation INTEGER CHECK (life_evaluation BETWEEN 0 AND 10),
  support TEXT CHECK (support IN ('はい','いいえ','回答しない') OR support IS NULL),
  freedom TEXT CHECK (freedom IN ('満足','不満','回答しない') OR freedom IS NULL),
  donation TEXT CHECK (donation IN ('はい','いいえ','回答しない') OR donation IS NULL),
  government TEXT CHECK (government IN ('はい','いいえ','回答しない') OR government IS NULL),
  business TEXT CHECK (business IN ('はい','いいえ','回答しない') OR business IS NULL)
);
CREATE INDEX IF NOT EXISTS life_responses_cohort ON life_responses(cohort, submitted_at);
