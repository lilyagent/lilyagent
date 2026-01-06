/*
  # Create Contract Addresses Table

  ## Overview
  This migration creates a table to store blockchain contract addresses that can be displayed
  on the website and managed through an admin interface.

  ## New Tables
  1. `contract_addresses`
     - `id` (uuid, primary key) - Unique identifier for each contract entry
     - `name` (text, not null) - Descriptive name for the contract (e.g., "Main Platform Contract")
     - `address` (text, not null) - The blockchain contract address
     - `blockchain` (text, not null) - The blockchain network (e.g., "Solana", "Ethereum")
     - `is_active` (boolean, default true) - Whether this contract should be displayed
     - `display_order` (integer, default 0) - Order for displaying multiple contracts
     - `created_at` (timestamptz) - Timestamp of creation
     - `updated_at` (timestamptz) - Timestamp of last update
     - `updated_by` (uuid) - User who last updated the contract

  ## Security
  - Enable RLS on `contract_addresses` table
  - Public read access for active contracts (anyone can view displayed contracts)
  - Authenticated users only can insert/update/delete (admin functionality)

  ## Notes
  - The `is_active` flag allows admins to manage which contracts are publicly visible
  - Multiple contracts can be stored and displayed based on `display_order`
  - The `blockchain` field helps identify which network the contract belongs to
*/

-- Create contract_addresses table
CREATE TABLE IF NOT EXISTS contract_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  blockchain text NOT NULL DEFAULT 'Solana',
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE contract_addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active contracts
CREATE POLICY "Anyone can view active contracts"
  ON contract_addresses
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can view all contracts (for admin interface)
CREATE POLICY "Authenticated users can view all contracts"
  ON contract_addresses
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert contracts
CREATE POLICY "Authenticated users can insert contracts"
  ON contract_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update contracts
CREATE POLICY "Authenticated users can update contracts"
  ON contract_addresses
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete contracts
CREATE POLICY "Authenticated users can delete contracts"
  ON contract_addresses
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_contract_addresses_active ON contract_addresses(is_active, display_order);

-- Insert a default contract address for Solana (example)
INSERT INTO contract_addresses (name, address, blockchain, is_active, display_order)
VALUES ('Labory Platform Contract', 'EXAMPLE_SOLANA_CONTRACT_ADDRESS_HERE', 'Solana', true, 0)
ON CONFLICT DO NOTHING;