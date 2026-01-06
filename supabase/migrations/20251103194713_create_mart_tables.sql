/*
  # Mart.fun Database Schema

  1. New Tables
    - `agents`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `category` (text) - Research, Code, Finance, Writing, Data, Other
      - `price` (numeric) - Price in USDC
      - `rating` (numeric) - Average rating
      - `executions` (integer) - Total number of executions
      - `revenue` (numeric) - Total revenue generated
      - `creator_id` (uuid) - Reference to user
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      
    - `apis`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `provider` (text)
      - `price` (numeric)
      - `rating` (numeric)
      - `endpoint` (text)
      - `creator_id` (uuid)
      - `created_at` (timestamptz)
      
    - `user_agents`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `agent_id` (uuid)
      - `purchased_at` (timestamptz)
      
    - `executions`
      - `id` (uuid, primary key)
      - `agent_id` (uuid)
      - `user_id` (uuid)
      - `revenue` (numeric)
      - `executed_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read marketplace data
    - Add policies for users to manage their own agents
*/

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'Other',
  price numeric DEFAULT 0,
  rating numeric DEFAULT 0,
  executions integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  creator_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  provider text DEFAULT '',
  price numeric DEFAULT 0,
  rating numeric DEFAULT 0,
  endpoint text DEFAULT '',
  creator_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES agents(id),
  purchased_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agents(id),
  user_id uuid,
  revenue numeric DEFAULT 0,
  executed_at timestamptz DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active agents"
  ON agents FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view APIs"
  ON apis FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own agent purchases"
  ON user_agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own executions"
  ON executions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can insert their own agents"
  ON agents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own agents"
  ON agents FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can insert their own APIs"
  ON apis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own APIs"
  ON apis FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);