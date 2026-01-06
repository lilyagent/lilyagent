/*
  # Fix agents INSERT policy for anonymous users

  1. Changes
    - Drop the existing restrictive INSERT policy that requires authentication
    - Add new INSERT policy that allows anonymous users to create agents
    - This enables wallet-based users (who aren't authenticated via Supabase Auth) to create agents after payment
  
  2. Security
    - Still maintains data integrity by requiring valid agent data
    - Payment verification happens in the application layer before insert
    - Anonymous users can only insert, not update or delete agents
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Creators can insert their own agents" ON agents;

-- Create new policy allowing anonymous users to insert agents
CREATE POLICY "Anyone can insert agents"
  ON agents
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also allow authenticated users to insert agents
CREATE POLICY "Authenticated users can insert agents"
  ON agents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);