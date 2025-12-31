-- ============================================
-- YABT FEATURE MIGRATIONS
-- Tags and Auto-Categorization Learning
-- ============================================

-- ============================================
-- PHASE 3: CUSTOM TAGS
-- ============================================

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id uuid REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Create transaction_tags junction table
CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

-- Enable RLS for tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access tags" ON tags;
CREATE POLICY "Users can access tags" ON tags FOR ALL USING (
  budget_id IN (SELECT id FROM budgets WHERE user_id = auth.uid())
);

-- Enable RLS for transaction_tags
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access transaction_tags" ON transaction_tags;
CREATE POLICY "Users can access transaction_tags" ON transaction_tags FOR ALL USING (
  transaction_id IN (
    SELECT t.id FROM transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE a.budget_id IN (SELECT id FROM budgets WHERE user_id = auth.uid())
  )
);

-- Indexes for tags
CREATE INDEX IF NOT EXISTS idx_tags_budget_id ON tags(budget_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON transaction_tags(tag_id);


-- ============================================
-- PHASE 4: LEARNING AUTO-CATEGORIZATION
-- ============================================

-- Store payee-category mappings learned from user behavior
CREATE TABLE IF NOT EXISTS payee_category_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  budget_id uuid REFERENCES budgets(id) ON DELETE CASCADE NOT NULL,
  payee_name text NOT NULL,  -- Lowercase, normalized
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  usage_count int DEFAULT 1,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(budget_id, payee_name)
);

-- Enable RLS for payee_category_rules
ALTER TABLE payee_category_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access payee_category_rules" ON payee_category_rules;
CREATE POLICY "Users can access payee_category_rules" ON payee_category_rules FOR ALL USING (
  budget_id IN (SELECT id FROM budgets WHERE user_id = auth.uid())
);

-- Index for payee_category_rules
CREATE INDEX IF NOT EXISTS idx_payee_category_rules_budget_payee ON payee_category_rules(budget_id, payee_name);

SELECT 'Migrations complete! Tags and Auto-Categorization tables created.' as status;
