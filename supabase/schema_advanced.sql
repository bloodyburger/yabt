-- YABT Advanced Features Schema Update
-- Run this in your Supabase SQL Editor

-- ============================================
-- Add transaction email to profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transaction_email TEXT UNIQUE;

-- Generate unique email on profile creation
CREATE OR REPLACE FUNCTION generate_transaction_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.transaction_email IS NULL THEN
    NEW.transaction_email := 'tx-' || SUBSTRING(NEW.id::text, 1, 8) || '@yabt.app';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_transaction_email ON profiles;
CREATE TRIGGER set_transaction_email
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE PROCEDURE generate_transaction_email();

-- Update existing profiles with transaction emails
UPDATE profiles SET transaction_email = 'tx-' || SUBSTRING(id::text, 1, 8) || '@yabt.app' 
WHERE transaction_email IS NULL;

-- ============================================
-- Activity Log (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- RLS for activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON activity_log FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Notifications
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Default "Assorted" Category Group
-- Create for all budgets that don't have it
-- ============================================
INSERT INTO category_groups (budget_id, name, sort_order)
SELECT b.id, 'Assorted', 9999
FROM budgets b
LEFT JOIN category_groups cg ON cg.budget_id = b.id AND cg.name = 'Assorted'
WHERE cg.id IS NULL;

-- Add "Uncategorized" category under Assorted
INSERT INTO categories (category_group_id, name, sort_order)
SELECT cg.id, 'Uncategorized', 0
FROM category_groups cg
LEFT JOIN categories c ON c.category_group_id = cg.id AND c.name = 'Uncategorized'
WHERE cg.name = 'Assorted' AND c.id IS NULL;

-- Trigger to create Assorted category group for new budgets
CREATE OR REPLACE FUNCTION create_assorted_category()
RETURNS trigger AS $$
BEGIN
  INSERT INTO category_groups (budget_id, name, sort_order)
  VALUES (NEW.id, 'Assorted', 9999);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_assorted_on_budget ON budgets;
CREATE TRIGGER create_assorted_on_budget
  AFTER INSERT ON budgets
  FOR EACH ROW EXECUTE PROCEDURE create_assorted_category();
