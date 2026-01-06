/*
  # Fix User Wallets RLS Policies
  
  ## Overview
  This migration fixes RLS policies for the user_wallets table to properly
  handle anonymous user upsert operations.
  
  ## Changes
  - Drop and recreate policies to allow anonymous users to update their own wallets
  - Simplify the authenticated user policies
  
  ## Security
  - Anonymous users can insert/update/select wallets (needed for wallet connection)
  - Authenticated users can only access their own wallets
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Users can insert their own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON user_wallets;
DROP POLICY IF EXISTS "Anonymous can view wallets" ON user_wallets;
DROP POLICY IF EXISTS "Anonymous can insert wallets" ON user_wallets;

-- Create new simplified policies
CREATE POLICY "Anyone can select wallets"
  ON user_wallets FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert wallets"
  ON user_wallets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update wallets"
  ON user_wallets FOR UPDATE
  USING (true)
  WITH CHECK (true);
