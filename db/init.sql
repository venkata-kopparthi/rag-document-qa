-- runs automatically on container startup via docker-entrypoint-initdb.d
--
-- vector(1536) matches text-embedding-3-small / ada-002 at default dims.
-- using text-embedding-3-large (3072) or a custom dimensions value? update
-- this column and EMBEDDING_DIMENSIONS in .env to match.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding VECTOR(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- run ANALYZE after loading data so the planner has real stats to work with
-- (the ingest script does this automatically)
CREATE INDEX IF NOT EXISTS documents_embedding_cosine_idx
  ON documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS documents_source_idx ON documents (source);
