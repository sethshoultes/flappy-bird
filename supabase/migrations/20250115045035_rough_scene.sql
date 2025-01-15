/*
  # Update high scores table and policies

  1. Changes
    - Drop existing RLS policies
    - Create new policies that properly handle score insertion
    - Add created_at column with default timestamp
    
  2. Security
    - Enable RLS
    - Allow public read access to high scores
    - Allow authenticated users to insert their scores
*/

-- Recreate the table with proper structure
CREATE TABLE IF NOT EXISTS high_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  score integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  username text NOT NULL
);

-- Enable RLS
ALTER TABLE high_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "High scores are viewable by everyone" ON high_scores;
DROP POLICY IF EXISTS "Users can insert their own scores" ON high_scores;

-- Allow anyone to read high scores
CREATE POLICY "High scores are viewable by everyone"
ON high_scores FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert their own scores
CREATE POLICY "Users can insert their own scores"
ON high_scores FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);

-- Create index for faster score queries
CREATE INDEX IF NOT EXISTS high_scores_score_idx ON high_scores (score DESC);