/*
  # Agent Payments Tracking Table
  
  ## Overview
  This migration creates a table to track payment transactions for agent creation
  and other agent-related payments on the Solana blockchain.
  
  ## New Tables
  
  ### `agent_payments`
  Tracks all payment transactions related to agents
  - `id` (uuid, primary key)
  - `agent_id` (uuid) - references agents table
  - `wallet_address` (text) - payer wallet address
  - `amount_sol` (numeric) - payment amount in SOL
  - `transaction_signature` (text, unique) - Solana transaction signature
  - `payment_type` (text) - 'agent_creation', 'agent_execution', 'agent_purchase'
  - `status` (text) - 'pending', 'completed', 'failed'
  - `verified_at` (timestamptz) - when transaction was verified on blockchain
  - `created_at` (timestamptz)
  
  ## Security
  - RLS enabled on agent_payments table
  - Users can view all payment records (for transparency)
  - Anonymous users can insert and view payments
*/

-- Agent Payments Table
CREATE TABLE IF NOT EXISTS agent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  amount_sol numeric(10, 6) NOT NULL,
  transaction_signature text UNIQUE NOT NULL,
  payment_type text NOT NULL DEFAULT 'agent_execution',
  status text NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_payment_type CHECK (payment_type IN ('agent_creation', 'agent_execution', 'agent_purchase')),
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_agent_payments_agent ON agent_payments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_payments_wallet ON agent_payments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_agent_payments_signature ON agent_payments(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_agent_payments_type ON agent_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_agent_payments_created ON agent_payments(created_at DESC);

ALTER TABLE agent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agent payments"
  ON agent_payments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anonymous can insert agent payments"
  ON agent_payments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert agent payments"
  ON agent_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);
