-- Phase 14.6 — Notification Escalation / SLA
-- Adds a one-time escalation stamp to notifications and an admin-declared policy
-- table. An action_required notification left unread AND undismissed past a
-- policy's slaMinutes is escalated once to the policy's explicit target user.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

CREATE TABLE IF NOT EXISTS notification_escalation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(200) NOT NULL,
  entity_type varchar(100),
  sla_minutes integer NOT NULL DEFAULT 60,
  escalate_to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_escalation_policies_company_id_idx
  ON notification_escalation_policies (company_id);
CREATE INDEX IF NOT EXISTS notif_escalation_policies_active_idx
  ON notification_escalation_policies (company_id, is_active);
