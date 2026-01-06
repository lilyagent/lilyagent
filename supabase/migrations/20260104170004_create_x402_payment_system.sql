-- x402 Payment System Schema
--
-- This migration creates the complete x402 payment protocol infrastructure for HTTP-based
-- micropayments supporting AI agents, APIs, and web services with Solana blockchain integration.
--
-- New Tables:
-- 1. x402_payment_sessions - Preauthorized payment sessions
-- 2. x402_payment_credits - User credit balances
-- 3. x402_transactions - Transaction logs
-- 4. x402_service_configs - Service configurations
-- 5. x402_payment_authorizations - One-click payment authorizations
-- 6. x402_analytics - Usage analytics

-- x402 Payment Sessions Table
CREATE TABLE IF NOT EXISTS x402_payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  session_token text UNIQUE NOT NULL,
  authorized_amount numeric(18, 6) NOT NULL,
  spent_amount numeric(18, 6) DEFAULT 0,
  remaining_amount numeric(18, 6) NOT NULL,
  resource_pattern text NOT NULL,
  status text DEFAULT 'active',
  expires_at timestamptz NOT NULL,
  auto_renew boolean DEFAULT false,
  renewal_amount numeric(18, 6) DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_session_status CHECK (status IN ('active', 'expired', 'revoked', 'depleted')),
  CONSTRAINT positive_amounts CHECK (authorized_amount >= 0 AND spent_amount >= 0 AND remaining_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_x402_sessions_wallet ON x402_payment_sessions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_x402_sessions_token ON x402_payment_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_x402_sessions_status ON x402_payment_sessions(status);
CREATE INDEX IF NOT EXISTS idx_x402_sessions_expires ON x402_payment_sessions(expires_at);

ALTER TABLE x402_payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous can view sessions"
  ON x402_payment_sessions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can insert sessions"
  ON x402_payment_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous can update sessions"
  ON x402_payment_sessions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- x402 Payment Credits Table
CREATE TABLE IF NOT EXISTS x402_payment_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  service_id uuid,
  service_type text NOT NULL,
  credit_balance numeric(18, 6) DEFAULT 0,
  total_purchased numeric(18, 6) DEFAULT 0,
  total_spent numeric(18, 6) DEFAULT 0,
  last_topup_tx text,
  last_topup_amount numeric(18, 6),
  last_topup_at timestamptz,
  auto_topup_enabled boolean DEFAULT false,
  auto_topup_threshold numeric(18, 6) DEFAULT 0,
  auto_topup_amount numeric(18, 6) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_credit_service_type CHECK (service_type IN ('agent', 'api', 'web_service')),
  CONSTRAINT positive_credit_amounts CHECK (credit_balance >= 0 AND total_purchased >= 0 AND total_spent >= 0),
  UNIQUE(wallet_address, service_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_x402_credits_wallet ON x402_payment_credits(wallet_address);
CREATE INDEX IF NOT EXISTS idx_x402_credits_service ON x402_payment_credits(service_id);
CREATE INDEX IF NOT EXISTS idx_x402_credits_balance ON x402_payment_credits(credit_balance);

ALTER TABLE x402_payment_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous can view credits"
  ON x402_payment_credits FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can manage credits"
  ON x402_payment_credits FOR ALL
  TO anon
  WITH CHECK (true);

-- x402 Transactions Table
CREATE TABLE IF NOT EXISTS x402_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES x402_payment_sessions(id) ON DELETE SET NULL,
  wallet_address text NOT NULL,
  resource_url text NOT NULL,
  resource_type text NOT NULL,
  http_method text NOT NULL,
  amount_charged numeric(18, 6) NOT NULL,
  x402_header text,
  payment_proof text,
  status text DEFAULT 'pending',
  response_code integer,
  response_time_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_tx_resource_type CHECK (resource_type IN ('agent_execution', 'api_call', 'data_access')),
  CONSTRAINT valid_tx_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  CONSTRAINT valid_http_method CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH'))
);

CREATE INDEX IF NOT EXISTS idx_x402_tx_session ON x402_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_x402_tx_wallet ON x402_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_x402_tx_resource ON x402_transactions(resource_url);
CREATE INDEX IF NOT EXISTS idx_x402_tx_status ON x402_transactions(status);
CREATE INDEX IF NOT EXISTS idx_x402_tx_created ON x402_transactions(created_at DESC);

ALTER TABLE x402_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous can view transactions"
  ON x402_transactions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can insert transactions"
  ON x402_transactions FOR INSERT
  TO anon
  WITH CHECK (true);

-- x402 Service Configs Table
CREATE TABLE IF NOT EXISTS x402_service_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  service_type text NOT NULL,
  service_name text NOT NULL,
  owner_wallet text NOT NULL,
  accepts_x402 boolean DEFAULT true,
  pricing_model text NOT NULL,
  base_price numeric(18, 6) NOT NULL,
  min_payment numeric(18, 6) DEFAULT 0.01,
  max_payment numeric(18, 6),
  currency text DEFAULT 'USDC',
  requires_preauth boolean DEFAULT false,
  max_session_amount numeric(18, 6),
  allowed_origins jsonb DEFAULT '[]',
  webhook_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_config_service_type CHECK (service_type IN ('agent', 'api', 'web_service')),
  CONSTRAINT valid_pricing_model CHECK (pricing_model IN ('per_request', 'per_minute', 'per_kb', 'per_token')),
  CONSTRAINT valid_currency CHECK (currency IN ('USDC', 'SOL')),
  UNIQUE(service_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_x402_configs_service ON x402_service_configs(service_id);
CREATE INDEX IF NOT EXISTS idx_x402_configs_owner ON x402_service_configs(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_x402_configs_active ON x402_service_configs(is_active);

ALTER TABLE x402_service_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous can view configs"
  ON x402_service_configs FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Anonymous can insert configs"
  ON x402_service_configs FOR INSERT
  TO anon
  WITH CHECK (true);

-- x402 Payment Authorizations Table
CREATE TABLE IF NOT EXISTS x402_payment_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  service_id uuid NOT NULL,
  service_type text NOT NULL,
  authorization_token text UNIQUE NOT NULL,
  spending_limit_per_request numeric(18, 6),
  spending_limit_per_day numeric(18, 6),
  spending_limit_per_month numeric(18, 6),
  total_authorized numeric(18, 6) NOT NULL,
  total_spent numeric(18, 6) DEFAULT 0,
  status text DEFAULT 'active',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_auth_service_type CHECK (service_type IN ('agent', 'api', 'web_service')),
  CONSTRAINT valid_auth_status CHECK (status IN ('active', 'paused', 'revoked', 'expired')),
  UNIQUE(wallet_address, service_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_x402_auth_wallet ON x402_payment_authorizations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_x402_auth_service ON x402_payment_authorizations(service_id);
CREATE INDEX IF NOT EXISTS idx_x402_auth_token ON x402_payment_authorizations(authorization_token);
CREATE INDEX IF NOT EXISTS idx_x402_auth_status ON x402_payment_authorizations(status);

ALTER TABLE x402_payment_authorizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous can view authorizations"
  ON x402_payment_authorizations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous can manage authorizations"
  ON x402_payment_authorizations FOR ALL
  TO anon
  WITH CHECK (true);

-- x402 Analytics Table
CREATE TABLE IF NOT EXISTS x402_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  service_id uuid,
  service_type text NOT NULL,
  total_transactions integer DEFAULT 0,
  total_volume_usdc numeric(18, 6) DEFAULT 0,
  unique_users integer DEFAULT 0,
  avg_transaction_amount numeric(18, 6) DEFAULT 0,
  success_rate numeric(5, 2) DEFAULT 0,
  avg_response_time_ms integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_analytics_service_type CHECK (service_type IN ('agent', 'api', 'web_service')),
  UNIQUE(date, service_id, service_type)
);

CREATE INDEX IF NOT EXISTS idx_x402_analytics_date ON x402_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_x402_analytics_service ON x402_analytics(service_id);

ALTER TABLE x402_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous can view analytics"
  ON x402_analytics FOR SELECT
  TO anon
  USING (true);
