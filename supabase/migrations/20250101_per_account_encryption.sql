-- Per-Account Encryption Keys
-- Stores user's encrypted data key (encrypted with their passphrase)

-- Table for user encryption keys
CREATE TABLE IF NOT EXISTS user_encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL,  -- Base64 encoded: salt + iv + encrypted_data_key
    key_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_encryption_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own encryption key
CREATE POLICY "Users can view own encryption key"
    ON user_encryption_keys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own encryption key"
    ON user_encryption_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own encryption key"
    ON user_encryption_keys FOR UPDATE
    USING (auth.uid() = user_id);

-- Add encrypted_ columns to sensitive tables
-- These columns will store encrypted values while keeping original columns for compatibility

-- For transactions: encrypt amount and memo
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS encrypted_amount TEXT,
ADD COLUMN IF NOT EXISTS encrypted_memo TEXT;

-- For accounts: encrypt name and balance  
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS encrypted_name TEXT,
ADD COLUMN IF NOT EXISTS encrypted_balance TEXT;

-- For payees: encrypt name
ALTER TABLE payees
ADD COLUMN IF NOT EXISTS encrypted_name TEXT;

-- For categories: encrypt name
ALTER TABLE categories  
ADD COLUMN IF NOT EXISTS encrypted_name TEXT;

-- For monthly_budgets: encrypt assigned and activity
ALTER TABLE monthly_budgets
ADD COLUMN IF NOT EXISTS encrypted_assigned TEXT,
ADD COLUMN IF NOT EXISTS encrypted_activity TEXT;

-- Create index for quick user lookup
CREATE INDEX IF NOT EXISTS idx_user_encryption_keys_user_id ON user_encryption_keys(user_id);
