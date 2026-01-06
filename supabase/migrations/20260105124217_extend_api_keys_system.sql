/*
  # Extend API Keys System

  1. Changes to api_keys table
    - Add rate_limit_per_hour column
    - Add total_requests column
    - Add metadata column

  2. New table: api_key_usage
    - Track detailed usage statistics

  3. Indexes
    - Optimize for common queries
*/

-- Add missing columns to existing api_keys table
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS rate_limit_per_hour INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS total_requests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create api_key_usage table
CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  http_method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  request_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for api_key_usage
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created ON api_key_usage(created_at DESC);

-- Enable RLS on api_key_usage
ALTER TABLE api_key_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_key_usage
CREATE POLICY "Allow reading key usage"
  ON api_key_usage FOR SELECT
  USING (true);

CREATE POLICY "Allow inserting usage records"
  ON api_key_usage FOR INSERT
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE api_key_usage IS 'Logs usage statistics for API keys';
COMMENT ON COLUMN api_keys.rate_limit_per_hour IS 'Maximum requests per hour for this key';
COMMENT ON COLUMN api_keys.total_requests IS 'Total number of requests made with this key';
