-- Phase 8.4 — 360° peer feedback dimension for performance reviews.
-- A review may request feedback from any number of peers; each peer submits a
-- 1–5 rating and comments, or declines. One request per (review, peer).

DO $$ BEGIN
  CREATE TYPE peer_feedback_status AS ENUM ('pending', 'submitted', 'declined');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS review_peer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  peer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status peer_feedback_status NOT NULL DEFAULT 'pending',
  rating integer,
  comments text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  CONSTRAINT review_peer_feedback_review_peer_unique UNIQUE (review_id, peer_id)
);

CREATE INDEX IF NOT EXISTS review_peer_feedback_company_id_idx ON review_peer_feedback (company_id);
CREATE INDEX IF NOT EXISTS review_peer_feedback_review_id_idx ON review_peer_feedback (review_id);
CREATE INDEX IF NOT EXISTS review_peer_feedback_peer_id_idx ON review_peer_feedback (peer_id);
