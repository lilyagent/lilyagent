/*
  # Add payment signature tracking to x402 system

  1. Changes
    - Add initial_payment_signature to x402_payment_sessions
    - Add sol_amount and conversion_rate to x402_transactions
    - Update currency fields to use USD instead of USDC

  2. Purpose
    - Track actual blockchain transactions for x402 payments
    - Store SOL/USD conversion data for auditing
    - Enable proper reconciliation of payments
*/

-- Add payment signature column to sessions
ALTER TABLE x402_payment_sessions
ADD COLUMN IF NOT EXISTS initial_payment_signature TEXT;

-- Add conversion tracking to transactions
ALTER TABLE x402_transactions
ADD COLUMN IF NOT EXISTS sol_amount DECIMAL(20, 9),
ADD COLUMN IF NOT EXISTS usd_amount DECIMAL(20, 2),
ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(20, 6);

-- Add index for querying by signature
CREATE INDEX IF NOT EXISTS idx_x402_sessions_payment_signature
ON x402_payment_sessions(initial_payment_signature)
WHERE initial_payment_signature IS NOT NULL;

-- Add index for transaction signatures
CREATE INDEX IF NOT EXISTS idx_x402_transactions_payment_proof
ON x402_transactions(payment_proof)
WHERE payment_proof IS NOT NULL;

-- Add comment
COMMENT ON COLUMN x402_payment_sessions.initial_payment_signature IS 'Solana transaction signature for the upfront payment that created this session';
COMMENT ON COLUMN x402_transactions.sol_amount IS 'Amount charged in SOL (actual blockchain amount)';
COMMENT ON COLUMN x402_transactions.usd_amount IS 'Amount charged in USD (display amount)';
COMMENT ON COLUMN x402_transactions.conversion_rate IS 'SOL/USD conversion rate at time of transaction';
