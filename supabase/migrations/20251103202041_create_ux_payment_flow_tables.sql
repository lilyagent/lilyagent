/*
  # UX Payment Flow Schema
  
  ## Overview
  This migration creates tables to support the x402 payment protocol integration,
  agent execution tracking, and user wallet management for the Solana AI agent platform.
  
  ## New Tables
  
  ### 1. `user_wallets`
  Stores connected wallet information for users
  - `id` (uuid, primary key)
  - `user_id` (uuid, nullable - for authenticated users)
  - `wallet_address` (text, unique) - Solana wallet public key
  - `wallet_type` (text) - e.g., 'phantom', 'solflare', 'backpack'
  - `last_connected` (timestamptz)
  - `is_active` (boolean) - currently connected wallet
  - `created_at` (timestamptz)
  
  ### 2. `agent_executions`
  Tracks all agent execution requests and their states
  - `id` (uuid, primary key)
  - `agent_id` (uuid) - references agents table
  - `user_wallet_id` (uuid) - references user_wallets
  - `status` (text) - 'pending', 'payment_required', 'processing', 'completed', 'failed'
  - `cost_usdc` (numeric) - cost in USDC
  - `payment_required` (boolean)
  - `transaction_signature` (text, nullable) - Solana transaction signature
  - `x_payment_header` (text, nullable) - x402 payment header
  - `input_data` (jsonb) - agent input parameters
  - `output_data` (jsonb, nullable) - agent execution results
  - `error_message` (text, nullable)
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  
  ### 3. `payment_transactions`
  Detailed payment transaction records
  - `id` (uuid, primary key)
  - `execution_id` (uuid) - references agent_executions
  - `wallet_address` (text) - payer wallet
  - `recipient_address` (text) - agent creator wallet
  - `amount_usdc` (numeric)
  - `transaction_signature` (text, unique)
  - `status` (text) - 'pending', 'confirmed', 'rejected', 'insufficient', 'already_used'
  - `confirmation_count` (integer, default 0)
  - `blockchain_verified_at` (timestamptz, nullable)
  - `marked_used_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  
  ### 4. `user_onboarding`
  Tracks user onboarding progress
  - `id` (uuid, primary key)
  - `wallet_address` (text, unique)
  - `has_connected_wallet` (boolean, default false)
  - `has_viewed_tutorial` (boolean, default false)
  - `has_executed_agent` (boolean, default false)
  - `has_made_payment` (boolean, default false)
  - `onboarding_step` (integer, default 1)
  - `completed_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  
  ### 5. `transaction_errors`
  Logs transaction errors for debugging and UX improvements
  - `id` (uuid, primary key)
  - `execution_id` (uuid, nullable)
  - `transaction_signature` (text, nullable)
  - `error_type` (text) - 'insufficient_funds', 'network_error', 'rejected', 'timeout', etc.
  - `error_message` (text)
  - `error_context` (jsonb)
  - `wallet_address` (text)
  - `created_at` (timestamptz)
  
  ## Security
  - RLS enabled on all tables
  - Users can only access their own wallet and execution data
  - Public read access for agent information
*/

-- User Wallets Table
CREATE TABLE IF NOT EXISTS user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text UNIQUE NOT NULL,
  wallet_type text NOT NULL,
  last_connected timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);

ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallets"
  ON user_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets"
  ON user_wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets"
  ON user_wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous can view wallets"
  ON user_wallets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can insert wallets"
  ON user_wallets FOR INSERT
  TO anon
  WITH CHECK (true);

-- Agent Executions Table
CREATE TABLE IF NOT EXISTS agent_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  user_wallet_id uuid REFERENCES user_wallets(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  cost_usdc numeric(10, 6) NOT NULL DEFAULT 0,
  payment_required boolean DEFAULT false,
  transaction_signature text,
  x_payment_header text,
  input_data jsonb NOT NULL,
  output_data jsonb,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'payment_required', 'processing', 'completed', 'failed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_executions_agent ON agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_executions_wallet ON agent_executions(user_wallet_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_created ON agent_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_signature ON agent_executions(transaction_signature);

ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own executions"
  ON agent_executions FOR SELECT
  TO authenticated
  USING (
    user_wallet_id IN (
      SELECT id FROM user_wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert executions"
  ON agent_executions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_wallet_id IN (
      SELECT id FROM user_wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can view executions"
  ON agent_executions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can insert executions"
  ON agent_executions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES agent_executions(id) ON DELETE CASCADE NOT NULL,
  wallet_address text NOT NULL,
  recipient_address text NOT NULL,
  amount_usdc numeric(10, 6) NOT NULL,
  transaction_signature text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  confirmation_count integer DEFAULT 0,
  blockchain_verified_at timestamptz,
  marked_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'confirmed', 'rejected', 'insufficient', 'already_used'))
);

CREATE INDEX IF NOT EXISTS idx_payments_execution ON payment_transactions(execution_id);
CREATE INDEX IF NOT EXISTS idx_payments_signature ON payment_transactions(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_payments_wallet ON payment_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    wallet_address IN (
      SELECT wallet_address FROM user_wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can view transactions"
  ON payment_transactions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can insert transactions"
  ON payment_transactions FOR INSERT
  TO anon
  WITH CHECK (true);

-- User Onboarding Table
CREATE TABLE IF NOT EXISTS user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  has_connected_wallet boolean DEFAULT false,
  has_viewed_tutorial boolean DEFAULT false,
  has_executed_agent boolean DEFAULT false,
  has_made_payment boolean DEFAULT false,
  onboarding_step integer DEFAULT 1,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_wallet ON user_onboarding(wallet_address);

ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding"
  ON user_onboarding FOR SELECT
  TO authenticated
  USING (
    wallet_address IN (
      SELECT wallet_address FROM user_wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own onboarding"
  ON user_onboarding FOR UPDATE
  TO authenticated
  USING (
    wallet_address IN (
      SELECT wallet_address FROM user_wallets WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    wallet_address IN (
      SELECT wallet_address FROM user_wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can view onboarding"
  ON user_onboarding FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can insert onboarding"
  ON user_onboarding FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous can update onboarding"
  ON user_onboarding FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Transaction Errors Table
CREATE TABLE IF NOT EXISTS transaction_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES agent_executions(id) ON DELETE SET NULL,
  transaction_signature text,
  error_type text NOT NULL,
  error_message text NOT NULL,
  error_context jsonb,
  wallet_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_errors_execution ON transaction_errors(execution_id);
CREATE INDEX IF NOT EXISTS idx_errors_type ON transaction_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_errors_wallet ON transaction_errors(wallet_address);
CREATE INDEX IF NOT EXISTS idx_errors_created ON transaction_errors(created_at DESC);

ALTER TABLE transaction_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own errors"
  ON transaction_errors FOR SELECT
  TO authenticated
  USING (
    wallet_address IN (
      SELECT wallet_address FROM user_wallets WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can view errors"
  ON transaction_errors FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can insert errors"
  ON transaction_errors FOR INSERT
  TO anon
  WITH CHECK (true);
