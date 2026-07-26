-- Required PostgreSQL extensions.
--
-- Must run BEFORE the schema is materialised: several tables depend on these
-- types/functions and will fail to create without them.
--   pgcrypto  → gen_random_uuid() for primary keys
--   vector    → pgvector, backing the embedding column used by AI search
--
-- Supabase ships both; a self-hosted Postgres must have pgvector installed.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
