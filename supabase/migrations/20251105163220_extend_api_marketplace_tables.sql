/*
  # Extend API Marketplace Schema

  ## Overview
  Extends existing apis table and creates additional tables for full API marketplace functionality.

  ## Changes
  1. Add missing columns to existing `apis` table
  2. Create new supporting tables for pricing, endpoints, keys, analytics, etc.

  ## Security
  - Enable RLS on all new tables
  - Maintain data integrity with foreign keys
*/

-- Extend existing APIs table with marketplace fields
DO $$
BEGIN
  -- Add category field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'category'
  ) THEN
    ALTER TABLE apis ADD COLUMN category text DEFAULT 'Other';
  END IF;

  -- Add base_url if doesn't exist (endpoint might be serving this purpose)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'base_url'
  ) THEN
    ALTER TABLE apis ADD COLUMN base_url text;
    UPDATE apis SET base_url = endpoint WHERE base_url IS NULL;
  END IF;

  -- Add documentation_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'documentation_url'
  ) THEN
    ALTER TABLE apis ADD COLUMN documentation_url text;
  END IF;

  -- Add version
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'version'
  ) THEN
    ALTER TABLE apis ADD COLUMN version text DEFAULT 'v1';
  END IF;

  -- Add is_active
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE apis ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- Add is_verified
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE apis ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  -- Add uptime tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'uptime_percentage'
  ) THEN
    ALTER TABLE apis ADD COLUMN uptime_percentage numeric(5,2) DEFAULT 100.00;
  END IF;

  -- Add response time tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'avg_response_time'
  ) THEN
    ALTER TABLE apis ADD COLUMN avg_response_time integer DEFAULT 0;
  END IF;

  -- Add usage tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'total_calls'
  ) THEN
    ALTER TABLE apis ADD COLUMN total_calls integer DEFAULT 0;
  END IF;

  -- Add revenue tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'total_revenue'
  ) THEN
    ALTER TABLE apis ADD COLUMN total_revenue numeric(10,6) DEFAULT 0;
  END IF;

  -- Add review count
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'total_reviews'
  ) THEN
    ALTER TABLE apis ADD COLUMN total_reviews integer DEFAULT 0;
  END IF;

  -- Add updated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE apis ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2. API Pricing Models Table
CREATE TABLE IF NOT EXISTS api_pricing_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE,
  model_type text NOT NULL CHECK (model_type IN ('free', 'freemium', 'pay_per_call', 'subscription')),
  price_per_call numeric(10,6) DEFAULT 0,
  free_tier_limit integer DEFAULT 0,
  monthly_subscription_price numeric(10,2) DEFAULT 0,
  rate_limit_per_minute integer DEFAULT 60,
  rate_limit_per_day integer DEFAULT 10000,
  rate_limit_per_month integer DEFAULT 100000,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. API Endpoints Table
CREATE TABLE IF NOT EXISTS api_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE,
  path text NOT NULL,
  method text NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  description text,
  request_schema jsonb DEFAULT '{}'::jsonb,
  response_schema jsonb DEFAULT '{}'::jsonb,
  example_request jsonb DEFAULT '{}'::jsonb,
  example_response jsonb DEFAULT '{}'::jsonb,
  requires_auth boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 4. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE,
  user_wallet_address text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 5. API Calls Table (for analytics)
CREATE TABLE IF NOT EXISTS api_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint_path text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer NOT NULL,
  request_size_bytes integer DEFAULT 0,
  response_size_bytes integer DEFAULT 0,
  cost_usdc numeric(10,6) DEFAULT 0,
  error_message text,
  timestamp timestamptz DEFAULT now()
);

-- 6. API Subscriptions Table
CREATE TABLE IF NOT EXISTS api_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE,
  user_wallet_address text NOT NULL,
  pricing_model_id uuid REFERENCES api_pricing_models(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  auto_renew boolean DEFAULT true,
  calls_used integer DEFAULT 0,
  calls_limit integer DEFAULT 0,
  last_payment_tx text,
  created_at timestamptz DEFAULT now()
);

-- 7. API Reviews Table
CREATE TABLE IF NOT EXISTS api_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE,
  reviewer_wallet_address text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  reliability_score integer CHECK (reliability_score >= 1 AND reliability_score <= 5),
  documentation_score integer CHECK (documentation_score >= 1 AND documentation_score <= 5),
  performance_score integer CHECK (performance_score >= 1 AND performance_score <= 5),
  is_verified_user boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(api_id, reviewer_wallet_address)
);

-- 8. API SLA Monitoring Table
CREATE TABLE IF NOT EXISTS api_sla_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE,
  check_timestamp timestamptz DEFAULT now(),
  is_available boolean NOT NULL,
  response_time_ms integer,
  status_code integer,
  error_details text,
  uptime_day numeric(5,2),
  uptime_week numeric(5,2),
  uptime_month numeric(5,2)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_apis_category ON apis(category);
CREATE INDEX IF NOT EXISTS idx_apis_wallet ON apis(wallet_address);
CREATE INDEX IF NOT EXISTS idx_apis_active ON apis(is_active);
CREATE INDEX IF NOT EXISTS idx_apis_rating ON apis(rating DESC);

CREATE INDEX IF NOT EXISTS idx_api_calls_api_id ON api_calls(api_id);
CREATE INDEX IF NOT EXISTS idx_api_calls_timestamp ON api_calls(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_calls_api_key ON api_calls(api_key_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_api_keys_api ON api_keys(api_id);

CREATE INDEX IF NOT EXISTS idx_api_subscriptions_user ON api_subscriptions(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_api_subscriptions_status ON api_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_api_reviews_api ON api_reviews(api_id);
CREATE INDEX IF NOT EXISTS idx_api_sla_api ON api_sla_monitoring(api_id);

-- Enable Row Level Security on new tables
ALTER TABLE api_pricing_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_sla_monitoring ENABLE ROW LEVEL SECURITY;

-- RLS Policies for API Pricing Models
CREATE POLICY "Anyone can view active pricing models"
  ON api_pricing_models FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can manage pricing models"
  ON api_pricing_models FOR ALL
  WITH CHECK (true);

-- RLS Policies for API Endpoints
CREATE POLICY "Anyone can view active endpoints"
  ON api_endpoints FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can manage endpoints"
  ON api_endpoints FOR ALL
  WITH CHECK (true);

-- RLS Policies for API Keys
CREATE POLICY "Users can view all API keys"
  ON api_keys FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create API keys"
  ON api_keys FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update API keys"
  ON api_keys FOR UPDATE
  USING (true);

-- RLS Policies for API Calls
CREATE POLICY "Anyone can view API calls"
  ON api_calls FOR SELECT
  USING (true);

CREATE POLICY "System can insert API calls"
  ON api_calls FOR INSERT
  WITH CHECK (true);

-- RLS Policies for API Subscriptions
CREATE POLICY "Anyone can view subscriptions"
  ON api_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create subscriptions"
  ON api_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update subscriptions"
  ON api_subscriptions FOR UPDATE
  USING (true);

-- RLS Policies for API Reviews
CREATE POLICY "Anyone can view reviews"
  ON api_reviews FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create reviews"
  ON api_reviews FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update reviews"
  ON api_reviews FOR UPDATE
  USING (true);

-- RLS Policies for SLA Monitoring
CREATE POLICY "Anyone can view SLA data"
  ON api_sla_monitoring FOR SELECT
  USING (true);

CREATE POLICY "System can insert SLA monitoring data"
  ON api_sla_monitoring FOR INSERT
  WITH CHECK (true);