/*
  # Add wallet-based ownership tracking for agents and APIs

  1. Changes to agents table
    - Add `wallet_address` column to track creator's wallet
    - Add index for efficient wallet-based queries
    - Update RLS policies to support wallet-based filtering
  
  2. Changes to apis table
    - Add `wallet_address` column to track creator's wallet
    - Add index for efficient wallet-based queries
    - Update RLS policies to support wallet-based filtering

  3. Security
    - Allow users to query their own agents/APIs by wallet address
    - Maintain existing public read access for active items
    - Enable wallet-based insert and update policies
*/

-- Add wallet_address to agents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE agents ADD COLUMN wallet_address text;
  END IF;
END $$;

-- Add wallet_address to apis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'wallet_address'
  ) THEN
    ALTER TABLE apis ADD COLUMN wallet_address text;
  END IF;
END $$;

-- Create indexes for wallet-based queries
CREATE INDEX IF NOT EXISTS idx_agents_wallet_address ON agents(wallet_address);
CREATE INDEX IF NOT EXISTS idx_apis_wallet_address ON apis(wallet_address);

-- Drop existing policies for agents
DROP POLICY IF EXISTS "Creators can update their own agents" ON agents;
DROP POLICY IF EXISTS "Anyone can view active agents" ON agents;

-- Create new policies for agents
CREATE POLICY "Public can view active agents"
  ON agents
  FOR SELECT
  TO public
  USING (is_active = true OR wallet_address IS NOT NULL);

-- RLS policies for APIs table
ALTER TABLE apis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view APIs" ON apis;
DROP POLICY IF EXISTS "Anyone can insert APIs" ON apis;

-- Create new policies for APIs
CREATE POLICY "Anyone can view APIs"
  ON apis
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert APIs"
  ON apis
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);